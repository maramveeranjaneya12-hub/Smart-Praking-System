import express, { Request, Response } from 'express';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { createServer as createViteServer } from 'vite';

const execFileAsync = promisify(execFile);

const ROOT_DIR = process.cwd();
const BACKEND_DIR = path.resolve(ROOT_DIR, 'backend');
const CPP_BINARY_PATH = path.resolve(BACKEND_DIR, 'bin', 'parking_backend');
const CPP_DATA_DIR = path.resolve(BACKEND_DIR, 'data');

// Promise queue to serialize C++ file-handling operations and prevent concurrent write races
let cppQueue: Promise<unknown> = Promise.resolve();

function sanitizeArg(value: unknown, maxLen = 40): string {
  if (typeof value !== 'string') return '';
  // Strip control characters and null bytes, enforce safe upper bound
  return value.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, maxLen);
}

async function ensureCppBinaryBuilt(): Promise<void> {
  if (fs.existsSync(CPP_BINARY_PATH)) {
    return;
  }
  await execFileAsync('make', ['-C', BACKEND_DIR], {
    shell: false,
    timeout: 20000,
  });
  if (!fs.existsSync(CPP_BINARY_PATH)) {
    throw new Error('Failed to compile C++ backend binary at backend/bin/parking_backend');
  }
}

async function invokeCppBackend<T = Record<string, unknown>>(args: string[]): Promise<T> {
  const runTask = async (): Promise<T> => {
    await ensureCppBinaryBuilt();
    const { stdout } = await execFileAsync(
      CPP_BINARY_PATH,
      ['--data-dir', CPP_DATA_DIR, ...args],
      {
        shell: false,
        timeout: 8000,
        maxBuffer: 5 * 1024 * 1024,
      }
    );
    const trimmed = stdout.trim();
    if (!trimmed) {
      throw new Error('Empty response received from C++ backend.');
    }
    return JSON.parse(trimmed) as T;
  };

  const resultPromise = cppQueue.then(runTask, runTask);
  cppQueue = resultPromise.then(
    () => undefined,
    () => undefined
  );
  return resultPromise;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  // Ensure C++ binary is compiled before accepting traffic
  try {
    await ensureCppBinaryBuilt();
  } catch (err) {
    console.error('C++ backend compilation check failed:', err);
  }

  // GET /api/dashboard
  app.get('/api/dashboard', async (_req: Request, res: Response) => {
    try {
      const data = await invokeCppBackend(['dashboard']);
      res.json(data);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to load dashboard data from C++ backend.',
      });
    }
  });

  // GET /api/slots
  app.get('/api/slots', async (_req: Request, res: Response) => {
    try {
      const data = await invokeCppBackend(['slots']);
      res.json(data);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to load parking slots from C++ backend.',
      });
    }
  });

  // POST /api/entry
  app.post('/api/entry', async (req: Request, res: Response) => {
    try {
      const vehicleNumber = sanitizeArg(req.body?.vehicleNumber, 32);
      const vehicleType = sanitizeArg(req.body?.vehicleType, 16);
      const data = await invokeCppBackend<{ success: boolean; error?: string }>([
        'entry',
        vehicleNumber,
        vehicleType,
      ]);
      res.status(data.success ? 200 : 400).json(data);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to process vehicle entry.',
      });
    }
  });

  // POST /api/exit/preview
  app.post('/api/exit/preview', async (req: Request, res: Response) => {
    try {
      const ticketId = sanitizeArg(req.body?.ticketId, 24);
      const data = await invokeCppBackend<{ success: boolean; error?: string }>([
        'exit-preview',
        ticketId,
      ]);
      res.status(data.success ? 200 : 400).json(data);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to validate ticket.',
      });
    }
  });

  // POST /api/exit/confirm
  app.post('/api/exit/confirm', async (req: Request, res: Response) => {
    try {
      const ticketId = sanitizeArg(req.body?.ticketId, 24);
      const data = await invokeCppBackend<{ success: boolean; error?: string }>([
        'exit-confirm',
        ticketId,
      ]);
      res.status(data.success ? 200 : 400).json(data);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to complete vehicle exit.',
      });
    }
  });

  // GET /api/tickets
  app.get('/api/tickets', async (req: Request, res: Response) => {
    try {
      const q = sanitizeArg(typeof req.query.q === 'string' ? req.query.q : '', 32);
      const rawStatus = sanitizeArg(typeof req.query.status === 'string' ? req.query.status : 'All', 16);
      const rawType = sanitizeArg(typeof req.query.type === 'string' ? req.query.type : 'All', 16);
      const allowedStatus = ['All', 'Active', 'Completed'].includes(rawStatus) ? rawStatus : 'All';
      const allowedType = ['All', 'Car', 'Bike'].includes(rawType) ? rawType : 'All';

      const data = await invokeCppBackend(['tickets', q, allowedStatus, allowedType]);
      res.json(data);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch tickets.',
      });
    }
  });

  // GET /api/history
  app.get('/api/history', async (req: Request, res: Response) => {
    try {
      const q = sanitizeArg(typeof req.query.q === 'string' ? req.query.q : '', 32);
      const rawType = sanitizeArg(typeof req.query.type === 'string' ? req.query.type : 'All', 16);
      const rawDate = sanitizeArg(typeof req.query.date === 'string' ? req.query.date : 'All', 16);
      const allowedType = ['All', 'Car', 'Bike'].includes(rawType) ? rawType : 'All';
      const allowedDate = rawDate === 'All' || /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : 'All';

      const data = await invokeCppBackend(['history', q, allowedType, allowedDate]);
      res.json(data);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch history reports.',
      });
    }
  });

  // GET /api/cpp-info
  app.get('/api/cpp-info', async (_req: Request, res: Response) => {
    try {
      const data = await invokeCppBackend(['info']);
      res.json(data);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to read C++ storage info.',
      });
    }
  });

  // POST /api/reset-sample
  app.post('/api/reset-sample', async (_req: Request, res: Response) => {
    try {
      const data = await invokeCppBackend(['reset']);
      res.json(data);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to reset sample data.',
      });
    }
  });

  // Vite middleware for dev, static dist for production
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(ROOT_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Parking Management System running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
