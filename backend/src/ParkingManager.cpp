#include "ParkingManager.hpp"

#include <algorithm>
#include <cstdio>
#include <ctime>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <sstream>

namespace fs = std::filesystem;

namespace SmartParking {

ParkingManager::ParkingManager(const std::string& dataDirectory)
    : dataDir(dataDirectory), nextTicketSeq(1001), nextPaymentSeq(5001) {
    ensureDataDirectory();
    loadAllData();
    if (slots.empty()) {
        seedSampleData();
    }
}

std::string ParkingManager::getSlotsFilePath() const { return dataDir + "/slots.csv"; }
std::string ParkingManager::getTicketsFilePath() const { return dataDir + "/tickets.csv"; }
std::string ParkingManager::getPaymentsFilePath() const { return dataDir + "/payments.csv"; }
std::string ParkingManager::getMetaFilePath() const { return dataDir + "/meta.txt"; }

void ParkingManager::ensureDataDirectory() const {
    std::error_code ec;
    fs::create_directories(dataDir, ec);
}

bool ParkingManager::writeFileAtomically(const std::string& path, const std::string& content) const {
    std::string tmpPath = path + ".tmp";
    {
        std::ofstream ofs(tmpPath, std::ios::out | std::ios::trunc);
        if (!ofs.is_open()) {
            return false;
        }
        ofs << content;
        ofs.flush();
        if (!ofs.good()) {
            return false;
        }
    }
    std::error_code ec;
    fs::rename(tmpPath, path, ec);
    if (ec) {
        // Fallback overwrite if rename fails across filesystems
        std::ofstream ofs(path, std::ios::out | std::ios::trunc);
        if (!ofs.is_open()) return false;
        ofs << content;
        fs::remove(tmpPath, ec);
    }
    return true;
}

void ParkingManager::loadAllData() {
    slots.clear();
    tickets.clear();
    payments.clear();

    // Load meta counters
    {
        std::ifstream ifs(getMetaFilePath());
        if (ifs.is_open()) {
            std::string key;
            int val = 0;
            while (ifs >> key >> val) {
                if (key == "nextTicketSeq") nextTicketSeq = val;
                else if (key == "nextPaymentSeq") nextPaymentSeq = val;
            }
        }
    }

    // Load slots.csv
    {
        std::ifstream ifs(getSlotsFilePath());
        std::string line;
        bool isHeader = true;
        while (std::getline(ifs, line)) {
            if (line.empty()) continue;
            if (isHeader) {
                isHeader = false;
                if (line.rfind("slotId,", 0) == 0) continue;
            }
            ParkingSlot s = ParkingSlot::fromCsvRow(line);
            if (!s.getSlotId().empty()) {
                slots.push_back(s);
            }
        }
    }

    // Load tickets.csv
    {
        std::ifstream ifs(getTicketsFilePath());
        std::string line;
        bool isHeader = true;
        while (std::getline(ifs, line)) {
            if (line.empty()) continue;
            if (isHeader) {
                isHeader = false;
                if (line.rfind("ticketId,", 0) == 0) continue;
            }
            ParkingTicket t = ParkingTicket::fromCsvRow(line);
            if (!t.getTicketId().empty()) {
                tickets.push_back(t);
            }
        }
    }

    // Load payments.csv
    {
        std::ifstream ifs(getPaymentsFilePath());
        std::string line;
        bool isHeader = true;
        while (std::getline(ifs, line)) {
            if (line.empty()) continue;
            if (isHeader) {
                isHeader = false;
                if (line.rfind("paymentId,", 0) == 0) continue;
            }
            Payment p = Payment::fromCsvRow(line);
            if (!p.getPaymentId().empty()) {
                payments.push_back(p);
            }
        }
    }
}

bool ParkingManager::saveAllData() const {
    ensureDataDirectory();

    std::ostringstream metaOss;
    metaOss << "nextTicketSeq " << nextTicketSeq << "\n"
            << "nextPaymentSeq " << nextPaymentSeq << "\n";

    std::ostringstream slotsOss;
    slotsOss << "slotId,vehicleType,zone,occupied,vehicleNumber,ticketId,occupiedSince\n";
    for (const auto& s : slots) {
        slotsOss << s.toCsvRow() << "\n";
    }

    std::ostringstream ticketsOss;
    ticketsOss << "ticketId,vehicleNumber,vehicleType,slotId,entryTime,exitTime,status,durationMinutes,billedHours,feeAmount\n";
    for (const auto& t : tickets) {
        ticketsOss << t.toCsvRow() << "\n";
    }

    std::ostringstream paymentsOss;
    paymentsOss << "paymentId,ticketId,vehicleNumber,vehicleType,slotId,entryTime,exitTime,durationMinutes,billedHours,hourlyRate,amountPaid,paidAt\n";
    for (const auto& p : payments) {
        paymentsOss << p.toCsvRow() << "\n";
    }

    return writeFileAtomically(getMetaFilePath(), metaOss.str()) &&
           writeFileAtomically(getSlotsFilePath(), slotsOss.str()) &&
           writeFileAtomically(getTicketsFilePath(), ticketsOss.str()) &&
           writeFileAtomically(getPaymentsFilePath(), paymentsOss.str());
}

std::string ParkingManager::buildErrorJson(const std::string& errorCode,
                                           const std::string& message) const {
    std::ostringstream oss;
    oss << "{"
        << "\"success\":false,"
        << "\"errorCode\":\"" << escapeJson(errorCode) << "\","
        << "\"error\":\"" << escapeJson(message) << "\""
        << "}";
    return oss.str();
}

// ============================================================================
// Core OOP Operations
// ============================================================================

int ParkingManager::allocateSlot(const std::string& vehicleType) {
    std::string normType = Vehicle::normalizeVehicleType(vehicleType);
    for (size_t i = 0; i < slots.size(); ++i) {
        if (slots[i].getVehicleType() == normType && !slots[i].isOccupied()) {
            return static_cast<int>(i);
        }
    }
    return -1;
}

bool ParkingManager::releaseSlot(const std::string& slotId) {
    for (auto& slot : slots) {
        if (slot.getSlotId() == slotId) {
            slot.release();
            return true;
        }
    }
    return false;
}

ParkingTicket ParkingManager::generateTicket(const Vehicle& vehicle, const std::string& slotId) {
    std::ostringstream idOss;
    idOss << "TKT-" << std::setw(4) << std::setfill('0') << nextTicketSeq++;
    return ParkingTicket(idOss.str(),
                         vehicle.getVehicleNumber(),
                         vehicle.getVehicleType(),
                         slotId,
                         vehicle.getEntryTime());
}

ValidationResult ParkingManager::validateTicket(const std::string& ticketId) const {
    ValidationResult res;
    std::string cleanId = toUpperCase(trim(ticketId));

    if (cleanId.empty()) {
        res.valid = false;
        res.errorCode = "INVALID_TICKET";
        res.message = "Invalid Ticket ID: Please enter a ticket ID (for example, TKT-1012).";
        return res;
    }

    for (size_t i = 0; i < tickets.size(); ++i) {
        if (toUpperCase(tickets[i].getTicketId()) == cleanId) {
            if (!tickets[i].isActive()) {
                res.valid = false;
                res.errorCode = "DUPLICATE_TICKET_USAGE";
                res.message = "Duplicate Ticket Usage: Ticket " + tickets[i].getTicketId() +
                              " (" + tickets[i].getVehicleNumber() + ") has already been completed and exited.";
                res.ticketIndex = static_cast<int>(i);
                return res;
            }
            res.valid = true;
            res.ticketIndex = static_cast<int>(i);
            res.message = "Ticket is valid and active.";
            return res;
        }
    }

    res.valid = false;
    res.errorCode = "INVALID_TICKET";
    res.message = "Invalid Ticket ID: No parking ticket found matching '" + cleanId + "'.";
    return res;
}

FeeBreakdown ParkingManager::calculateFee(const ParkingTicket& ticket, std::time_t exitTime) const {
    return Billing::calculateFee(ticket.getVehicleType(), ticket.getEntryTime(), exitTime);
}

std::string ParkingManager::generateReceipt(const Payment& payment) const {
    return payment.generateReceiptJson();
}

// ============================================================================
// Workflow Methods
// ============================================================================

std::string ParkingManager::parkVehicle(const std::string& rawVehicleNumber,
                                        const std::string& rawVehicleType) {
    std::string vehicleNumber = Vehicle::normalizeVehicleNumber(rawVehicleNumber);
    if (vehicleNumber.empty()) {
        return buildErrorJson("EMPTY_VEHICLE_NUMBER",
                              "Empty Vehicle Number: Please enter a valid vehicle registration number.");
    }
    if (vehicleNumber.size() < 4 || vehicleNumber.size() > 20) {
        return buildErrorJson("EMPTY_VEHICLE_NUMBER",
                              "Invalid Vehicle Number: Registration number must be between 4 and 20 characters.");
    }

    if (!Vehicle::isValidVehicleType(rawVehicleType)) {
        return buildErrorJson("INVALID_VEHICLE_TYPE",
                              "Invalid Vehicle Type: Please select either 'Car' or 'Bike'.");
    }
    std::string vehicleType = Vehicle::normalizeVehicleType(rawVehicleType);

    // Prevent duplicate active parking for the same vehicle
    for (const auto& tkt : tickets) {
        if (tkt.isActive() && toUpperCase(tkt.getVehicleNumber()) == toUpperCase(vehicleNumber)) {
            return buildErrorJson("DUPLICATE_ACTIVE_VEHICLE",
                                  "Duplicate Active Parking: Vehicle " + vehicleNumber +
                                  " is already parked in slot " + tkt.getSlotId() +
                                  " (Ticket " + tkt.getTicketId() + ").");
        }
    }

    // Allocate first available slot for vehicle type
    int slotIdx = allocateSlot(vehicleType);
    if (slotIdx < 0) {
        return buildErrorJson("PARKING_FULL",
                              "Parking Full: All " + vehicleType + " parking slots are currently occupied.");
    }

    std::time_t now = std::time(nullptr);
    Vehicle vehicle(vehicleNumber, vehicleType, now);
    ParkingTicket ticket = generateTicket(vehicle, slots[slotIdx].getSlotId());

    slots[slotIdx].occupy(vehicle.getVehicleNumber(), ticket.getTicketId(), now);
    tickets.push_back(ticket);

    if (!saveAllData()) {
        return buildErrorJson("SLOT_ALLOCATION_ERROR",
                              "Slot Allocation Error: Failed to persist parking record to storage files.");
    }

    std::ostringstream oss;
    oss << "{"
        << "\"success\":true,"
        << "\"message\":\"Slot " << escapeJson(slots[slotIdx].getSlotId())
        << " allocated successfully for " << escapeJson(vehicle.getVehicleNumber()) << ".\","
        << "\"ticket\":" << ticket.toJson() << ","
        << "\"slot\":" << slots[slotIdx].toJson() << ","
        << "\"hourlyRate\":" << Billing::getHourlyRate(vehicleType)
        << "}";
    return oss.str();
}

std::string ParkingManager::previewVehicleExit(const std::string& ticketId) {
    ValidationResult val = validateTicket(ticketId);
    if (!val.valid) {
        return buildErrorJson(val.errorCode, val.message);
    }

    const ParkingTicket& ticket = tickets[val.ticketIndex];
    std::time_t now = std::time(nullptr);
    FeeBreakdown breakdown = calculateFee(ticket, now);

    std::ostringstream oss;
    oss << "{"
        << "\"success\":true,"
        << "\"ticket\":" << ticket.toJson() << ","
        << "\"exitTime\":" << static_cast<long long>(now) << ","
        << "\"exitTimeIso\":\"" << escapeJson(formatTimestampIso(now)) << "\","
        << "\"exitTimeDisplay\":\"" << escapeJson(formatTimestampDisplay(now)) << "\","
        << "\"feeBreakdown\":" << breakdown.toJson()
        << "}";
    return oss.str();
}

std::string ParkingManager::unparkVehicle(const std::string& ticketId) {
    ValidationResult val = validateTicket(ticketId);
    if (!val.valid) {
        return buildErrorJson(val.errorCode, val.message);
    }

    ParkingTicket& ticket = tickets[val.ticketIndex];
    std::time_t now = std::time(nullptr);
    FeeBreakdown breakdown = calculateFee(ticket, now);

    if (!releaseSlot(ticket.getSlotId())) {
        return buildErrorJson("SLOT_ALLOCATION_ERROR",
                              "Slot Allocation Error: Could not locate slot " + ticket.getSlotId() + " to release.");
    }

    ticket.complete(now, breakdown.durationMinutes, breakdown.billedHours, breakdown.totalFee);

    std::ostringstream payIdOss;
    payIdOss << "PAY-" << std::setw(4) << std::setfill('0') << nextPaymentSeq++;
    Payment payment(payIdOss.str(), ticket, breakdown, now);
    payments.push_back(payment);

    if (!saveAllData()) {
        return buildErrorJson("SLOT_ALLOCATION_ERROR",
                              "Storage Error: Unable to write exit and payment records to disk.");
    }

    std::ostringstream oss;
    oss << "{"
        << "\"success\":true,"
        << "\"message\":\"Vehicle " << escapeJson(ticket.getVehicleNumber())
        << " exited from slot " << escapeJson(ticket.getSlotId())
        << ". Parking fee Rs." << breakdown.totalFee << " collected.\","
        << "\"ticket\":" << ticket.toJson() << ","
        << "\"feeBreakdown\":" << breakdown.toJson() << ","
        << "\"receipt\":" << generateReceipt(payment)
        << "}";
    return oss.str();
}

std::string ParkingManager::displaySlotStatus() const {
    int carTotal = 0, carAvailable = 0, carOccupied = 0;
    int bikeTotal = 0, bikeAvailable = 0, bikeOccupied = 0;

    std::vector<const ParkingSlot*> carSlots;
    std::vector<const ParkingSlot*> bikeSlots;

    for (const auto& s : slots) {
        if (s.getVehicleType() == "Car") {
            carTotal++;
            if (s.isOccupied()) carOccupied++;
            else carAvailable++;
            carSlots.push_back(&s);
        } else {
            bikeTotal++;
            if (s.isOccupied()) bikeOccupied++;
            else bikeAvailable++;
            bikeSlots.push_back(&s);
        }
    }

    std::ostringstream oss;
    oss << "{"
        << "\"success\":true,"
        << "\"summary\":{"
        << "\"totalCarSlots\":" << carTotal << ","
        << "\"availableCarSlots\":" << carAvailable << ","
        << "\"occupiedCarSlots\":" << carOccupied << ","
        << "\"totalBikeSlots\":" << bikeTotal << ","
        << "\"availableBikeSlots\":" << bikeAvailable << ","
        << "\"occupiedBikeSlots\":" << bikeOccupied
        << "},"
        << "\"carSlots\":[";

    for (size_t i = 0; i < carSlots.size(); ++i) {
        if (i > 0) oss << ",";
        oss << carSlots[i]->toJson();
    }

    oss << "],\"bikeSlots\":[";
    for (size_t i = 0; i < bikeSlots.size(); ++i) {
        if (i > 0) oss << ",";
        oss << bikeSlots[i]->toJson();
    }
    oss << "]}";
    return oss.str();
}

std::string ParkingManager::getDashboardData() const {
    return ReportManager::buildDashboardJson(slots, tickets, payments);
}

std::string ParkingManager::getTicketsJson(const std::string& query,
                                           const std::string& statusFilter,
                                           const std::string& typeFilter) const {
    std::string q = toUpperCase(trim(query));
    std::string st = toUpperCase(trim(statusFilter));
    std::string tp = toUpperCase(trim(typeFilter));

    std::vector<ParkingTicket> matched;
    int activeCount = 0;
    int completedCount = 0;

    for (const auto& t : tickets) {
        if (t.isActive()) activeCount++;
        else completedCount++;

        if (!st.empty() && st != "ALL" && toUpperCase(t.getStatus()) != st) {
            continue;
        }
        if (!tp.empty() && tp != "ALL" && toUpperCase(t.getVehicleType()) != tp) {
            continue;
        }
        if (!q.empty()) {
            bool found = toUpperCase(t.getTicketId()).find(q) != std::string::npos ||
                         toUpperCase(t.getVehicleNumber()).find(q) != std::string::npos ||
                         toUpperCase(t.getSlotId()).find(q) != std::string::npos;
            if (!found) continue;
        }
        matched.push_back(t);
    }

    // Active tickets first, then newest entry first
    std::sort(matched.begin(), matched.end(), [](const ParkingTicket& a, const ParkingTicket& b) {
        if (a.isActive() != b.isActive()) return a.isActive();
        return a.getEntryTime() > b.getEntryTime();
    });

    std::ostringstream oss;
    oss << "{"
        << "\"success\":true,"
        << "\"counts\":{"
        << "\"total\":" << tickets.size() << ","
        << "\"active\":" << activeCount << ","
        << "\"completed\":" << completedCount << ","
        << "\"matched\":" << matched.size()
        << "},"
        << "\"tickets\":[";

    for (size_t i = 0; i < matched.size(); ++i) {
        if (i > 0) oss << ",";
        oss << matched[i].toJson();
    }
    oss << "]}";
    return oss.str();
}

std::string ParkingManager::getHistoryJson(const std::string& query,
                                           const std::string& typeFilter,
                                           const std::string& dateFilter) const {
    return ReportManager::buildHistoryReportJson(payments, query, typeFilter, dateFilter);
}

std::string ParkingManager::seedSampleData() {
    slots.clear();
    tickets.clear();
    payments.clear();
    nextTicketSeq = 1001;
    nextPaymentSeq = 5001;

    // Initialize 20 Car slots (C-01 .. C-20)
    for (int i = 1; i <= TOTAL_CAR_SLOTS; ++i) {
        std::ostringstream id;
        id << "C-" << std::setw(2) << std::setfill('0') << i;
        std::string zone = (i <= 10) ? "Zone A - Ground" : "Zone B - Level 1";
        slots.emplace_back(id.str(), "Car", zone);
    }

    // Initialize 16 Bike slots (B-01 .. B-16)
    for (int i = 1; i <= TOTAL_BIKE_SLOTS; ++i) {
        std::ostringstream id;
        id << "B-" << std::setw(2) << std::setfill('0') << i;
        std::string zone = (i <= 8) ? "Zone C - Two-Wheeler North" : "Zone D - Two-Wheeler South";
        slots.emplace_back(id.str(), "Bike", zone);
    }

    std::time_t now = std::time(nullptr);

    struct CompletedSeed {
        const char* plate;
        const char* type;
        const char* slotId;
        long long daysAgo;
        long long exitHoursAgo;
        long long durationMins;
    };

    const std::vector<CompletedSeed> completedSeeds = {
        {"MH-12-AB-4821", "Car",  "C-04", 4, 2, 150}, // 2h 30m -> 3h * 40 = 120
        {"KA-05-MN-9102", "Bike", "B-02", 4, 4,  95}, // 1h 35m -> 2h * 20 = 40
        {"DL-03-CR-7740", "Car",  "C-07", 3, 1, 210}, // 3h 30m -> 4h * 40 = 160
        {"TN-09-BK-3318", "Bike", "B-05", 3, 5,  45}, // 45m -> 1h * 20 = 20
        {"GJ-01-KL-5520", "Car",  "C-11", 2, 3, 125}, // 2h 5m -> 3h * 40 = 120
        {"MH-14-PQ-8891", "Car",  "C-02", 2, 6,  60}, // 1h -> 1h * 40 = 40
        {"TS-07-EX-2145", "Bike", "B-09", 1, 2, 185}, // 3h 5m -> 4h * 20 = 80
        {"AP-39-DM-6024", "Car",  "C-09", 1, 4, 240}, // 4h -> 4h * 40 = 160
        {"KA-01-HJ-1189", "Bike", "B-03", 1, 1,  75}, // 1h 15m -> 2h * 20 = 40
        {"MH-02-DN-4410", "Car",  "C-06", 0, 2, 150}, // Today: 2h 30m -> 3h * 40 = 120
        {"UP-16-ZT-9032", "Bike", "B-06", 0, 1,  50}, // Today: 50m -> 1h * 20 = 20
        {"HR-26-DK-7290", "Car",  "C-12", 0, 3, 110}, // Today: 1h 50m -> 2h * 40 = 80
    };

    for (const auto& seed : completedSeeds) {
        std::time_t exitTs = now - (seed.daysAgo * 86400) - (seed.exitHoursAgo * 3600);
        std::time_t entryTs = exitTs - (seed.durationMins * 60);
        Vehicle v(seed.plate, seed.type, entryTs);
        ParkingTicket tkt = generateTicket(v, seed.slotId);
        FeeBreakdown fb = Billing::calculateFee(seed.type, entryTs, exitTs);
        tkt.complete(exitTs, fb.durationMinutes, fb.billedHours, fb.totalFee);
        tickets.push_back(tkt);

        std::ostringstream payId;
        payId << "PAY-" << std::setw(4) << std::setfill('0') << nextPaymentSeq++;
        payments.emplace_back(payId.str(), tkt, fb, exitTs);
    }

    // Seed active currently parked vehicles with varied durations so Exit Preview shows live fees
    struct ActiveSeed {
        const char* plate;
        const char* type;
        long long minutesAgo;
    };

    const std::vector<ActiveSeed> activeSeeds = {
        {"MH-12-TR-7845", "Car",  152}, // ~2h 32m -> 3 hrs = Rs. 120
        {"KA-03-MZ-4190", "Car",   85}, // ~1h 25m -> 2 hrs = Rs. 80
        {"DL-08-CA-2056", "Car",   38}, // ~38m    -> 1 hr  = Rs. 40
        {"TN-01-AQ-6312", "Car",  205}, // ~3h 25m -> 4 hrs = Rs. 160
        {"AP-28-KL-9421", "Car",   62}, // ~1h 2m  -> 2 hrs = Rs. 80
        {"GJ-05-RN-1180", "Car",  115}, // ~1h 55m -> 2 hrs = Rs. 80
        {"MH-04-BX-5519", "Bike", 140}, // ~2h 20m -> 3 hrs = Rs. 60
        {"KA-51-EF-8042", "Bike",  42}, // ~42m    -> 1 hr  = Rs. 20
        {"TS-09-GH-3765", "Bike",  98}, // ~1h 38m -> 2 hrs = Rs. 40
        {"RJ-14-SK-6204", "Bike", 190}, // ~3h 10m -> 4 hrs = Rs. 80
    };

    for (const auto& seed : activeSeeds) {
        int slotIdx = allocateSlot(seed.type);
        if (slotIdx >= 0) {
            std::time_t entryTs = now - (seed.minutesAgo * 60);
            Vehicle v(seed.plate, seed.type, entryTs);
            ParkingTicket tkt = generateTicket(v, slots[slotIdx].getSlotId());
            slots[slotIdx].occupy(v.getVehicleNumber(), tkt.getTicketId(), entryTs);
            tickets.push_back(tkt);
        }
    }

    saveAllData();

    std::ostringstream oss;
    oss << "{"
        << "\"success\":true,"
        << "\"message\":\"Sample parking slots, active vehicles, and historical transactions have been restored.\","
        << "\"totalSlots\":" << slots.size() << ","
        << "\"totalTickets\":" << tickets.size() << ","
        << "\"totalPayments\":" << payments.size()
        << "}";
    return oss.str();
}

std::string ParkingManager::getStorageInfoJson() const {
    auto fileSizeOrZero = [](const std::string& p) -> long long {
        std::error_code ec;
        if (fs::exists(p, ec)) {
            return static_cast<long long>(fs::file_size(p, ec));
        }
        return 0;
    };

    std::ostringstream oss;
    oss << "{"
        << "\"success\":true,"
        << "\"engine\":\"C++17 OOP Backend (g++ compiled binary)\","
        << "\"classes\":[\"Vehicle\",\"ParkingSlot\",\"ParkingTicket\",\"ParkingManager\",\"Billing\",\"Payment\",\"ReportManager\"],"
        << "\"methods\":[\"parkVehicle()\",\"unparkVehicle()\",\"allocateSlot()\",\"releaseSlot()\",\"generateTicket()\",\"validateTicket()\",\"calculateFee()\",\"displaySlotStatus()\",\"generateReceipt()\"],"
        << "\"storageFiles\":["
        << "{\"name\":\"slots.csv\",\"records\":" << slots.size() << ",\"bytes\":" << fileSizeOrZero(getSlotsFilePath()) << "},"
        << "{\"name\":\"tickets.csv\",\"records\":" << tickets.size() << ",\"bytes\":" << fileSizeOrZero(getTicketsFilePath()) << "},"
        << "{\"name\":\"payments.csv\",\"records\":" << payments.size() << ",\"bytes\":" << fileSizeOrZero(getPaymentsFilePath()) << "},"
        << "{\"name\":\"meta.txt\",\"records\":2,\"bytes\":" << fileSizeOrZero(getMetaFilePath()) << "}"
        << "]"
        << "}";
    return oss.str();
}

} // namespace SmartParking
