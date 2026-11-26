import { Code2, Database, RotateCcw, Terminal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchCppBackendInfo, resetSampleDataApi } from '../api/parkingApi';
import type { CppBackendInfo } from '../types/parking';

interface CppInfoModalProps {
  open: boolean;
  onClose: () => void;
  onResetComplete: () => void;
}

export function CppInfoModal({ open, onClose, onResetComplete }: CppInfoModalProps) {
  const [info, setInfo] = useState<CppBackendInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setConfirmReset(false);
    setStatusMessage(null);
    setLoading(true);
    fetchCppBackendInfo()
      .then((res) => {
        if (res.success) setInfo(res);
      })
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  async function handleResetSample() {
    setResetting(true);
    setStatusMessage(null);
    try {
      const res = await resetSampleDataApi();
      if (res.success) {
        setStatusMessage(res.message ?? 'Sample parking data restored.');
        setConfirmReset(false);
        const updated = await fetchCppBackendInfo();
        if (updated.success) setInfo(updated);
        onResetComplete();
      } else {
        setStatusMessage(res.error ?? 'Failed to reset sample data.');
      }
    } finally {
      setResetting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B192C]/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <Code2 className="h-5 w-5 text-[#1D4ED8]" />
            <div>
              <h2 className="text-lg font-semibold text-[#0F172A]">
                C++17 OOP Backend &amp; File Storage
              </h2>
              <p className="text-xs text-slate-500">
                All parking logic, validations, fee calculations, and CSV records are executed by the compiled C++ binary.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading && !info ? (
          <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
        ) : (
          info && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-[#0F172A]">Implemented C++ Classes</p>
                  <p className="mt-2 font-mono text-xs leading-relaxed text-slate-700">
                    {info.classes.join(' · ')}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-[#0F172A]">Core C++ Methods</p>
                  <p className="mt-2 font-mono text-xs leading-relaxed text-slate-700">
                    {info.methods.join(' · ')}
                  </p>
                </div>
              </div>

              {/* Persisted C++ File Storage */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
                  <Database className="h-4 w-4 text-[#1D4ED8]" />
                  <span>Active C++ File Storage (backend/data/)</span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                        <th className="px-4 py-2 font-medium">File Name</th>
                        <th className="px-4 py-2 font-medium text-right">Records</th>
                        <th className="px-4 py-2 font-medium text-right">Size (Bytes)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {info.storageFiles.map((f) => (
                        <tr key={f.name}>
                          <td className="px-4 py-2 font-mono font-medium text-[#0F172A]">
                            backend/data/{f.name}
                          </td>
                          <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-700">
                            {f.records}
                          </td>
                          <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-600">
                            {f.bytes.toLocaleString('en-IN')} B
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Compile & Run Commands */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
                  <Terminal className="h-4 w-4 text-[#1D4ED8]" />
                  <span>Local Compilation &amp; Execution</span>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-[#0B192C] p-4 font-mono text-[11px] leading-relaxed text-slate-100">{`# 1. Compile C++17 backend
cd backend && make

# 2. Run integrated web dashboard (port 3000)
npm install && npm run dev

# 3. Optional: Run standalone C++ HTTP server
./backend/bin/parking_backend --serve 8080 --data-dir backend/data`}</pre>
              </div>
            </>
          )
        )}

        {/* Reset Sample Data */}
        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-[#0F172A]">Reset Demo Dataset</p>
            <p className="text-xs text-slate-500">
              Restore default 20 Car slots, 16 Bike slots, active vehicles, and sample transactions.
            </p>
            {statusMessage && (
              <p className="mt-1 text-xs font-medium text-emerald-700">{statusMessage}</p>
            )}
          </div>
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Sample Data
            </button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={handleResetSample}
                className="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 whitespace-nowrap"
              >
                {resetting ? 'Restoring...' : 'Confirm Reset'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
