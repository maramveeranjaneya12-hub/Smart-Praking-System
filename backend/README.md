# Smart Parking Management System — C++17 Backend

This directory contains the complete Object-Oriented C++17 backend for the **Smart Parking Management System** academic capstone project.

## Object-Oriented Architecture

All business logic, validations, fee calculations, and file persistence are implemented in C++17:

- **`Vehicle`** (`include/Models.hpp`, `src/Models.cpp`): Encapsulates registration number, vehicle type (`Car` / `Bike`), entry timestamp, and input normalization/validation.
- **`ParkingSlot`** (`include/Models.hpp`, `src/Models.cpp`): Represents individual physical bays (`C-01` to `C-20` for Cars, `B-01` to `B-16` for Bikes) with `occupy()`, `release()`, and `displaySlotStatus()`.
- **`ParkingTicket`** (`include/Models.hpp`, `src/Models.cpp`): Stores unique `TKT-XXXX` identifiers, allocated slot, entry/exit timestamps, active/completed state, duration, and billed charges.
- **`Billing`** (`include/Models.hpp`, `src/Models.cpp`): Implements `calculateFee()` with fixed tariffs (`Car: Rs. 40/hr`, `Bike: Rs. 20/hr`), partial-hour round-up, and a 1-hour minimum fee.
- **`Payment`** (`include/Models.hpp`, `src/Models.cpp`): Records completed transactions (`PAY-XXXX`) and generates formatted receipts via `generateReceiptText()` / `generateReceiptJson()`.
- **`ParkingManager`** (`include/ParkingManager.hpp`, `src/ParkingManager.cpp`): Implements `parkVehicle()`, `unparkVehicle()`, `allocateSlot()`, `releaseSlot()`, `generateTicket()`, `validateTicket()`, `displaySlotStatus()`, `generateReceipt()`, and atomic C++ `<fstream>` persistence.
- **`ReportManager`** (`include/ReportManager.hpp`, `src/ReportManager.cpp`): Aggregates occupancy statistics, daily revenue breakdowns, and filtered transaction history.

## File-Based Storage (`backend/data/`)

Records are persisted on disk using standard C++ file streams (`std::ifstream` / `std::ofstream`) with atomic temp-file writes:
- `slots.csv` — Current occupancy state of all 36 parking bays.
- `tickets.csv` — Active and completed parking tickets.
- `payments.csv` — Completed fee payments and receipt history.
- `meta.txt` — Persistent sequence counters for ticket and payment IDs.

## Compilation Instructions

### 1. Using `make` (Linux / macOS)
```bash
cd backend
make
```

### 2. Direct `g++` Compilation
```bash
cd backend
mkdir -p bin
g++ -std=c++17 -O2 -Wall -Wextra -Iinclude \
  src/Models.cpp src/ReportManager.cpp src/ParkingManager.cpp src/main.cpp \
  -o bin/parking_backend
```

## Running the Backend

### Mode A: Integrated with the Web Dashboard (Default)
From the project root:
```bash
npm install
npm run dev
```
The Express server on `http://localhost:3000` bridges `/api/*` requests directly to `backend/bin/parking_backend`.

### Mode B: Standalone C++ HTTP REST API
```bash
cd backend
./bin/parking_backend --serve 8080 --data-dir data
```

### Mode C: Direct CLI Inspection
```bash
./bin/parking_backend --data-dir data dashboard
./bin/parking_backend --data-dir data slots
./bin/parking_backend --data-dir data entry "MH-12-XY-1234" Car
./bin/parking_backend --data-dir data exit-preview TKT-1013
./bin/parking_backend --data-dir data exit-confirm TKT-1013
```
