#include "Models.hpp"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <iomanip>
#include <sstream>

namespace SmartParking {

std::string escapeJson(const std::string& input) {
    std::ostringstream oss;
    for (unsigned char c : input) {
        switch (c) {
            case '"':  oss << "\\\""; break;
            case '\\': oss << "\\\\"; break;
            case '\b': oss << "\\b";  break;
            case '\f': oss << "\\f";  break;
            case '\n': oss << "\\n";  break;
            case '\r': oss << "\\r";  break;
            case '\t': oss << "\\t";  break;
            default:
                if (c < 0x20) {
                    oss << "\\u" << std::hex << std::setw(4) << std::setfill('0') << static_cast<int>(c);
                } else {
                    oss << static_cast<char>(c);
                }
        }
    }
    return oss.str();
}

std::string trim(const std::string& str) {
    size_t start = 0;
    while (start < str.size() && std::isspace(static_cast<unsigned char>(str[start]))) {
        ++start;
    }
    size_t end = str.size();
    while (end > start && std::isspace(static_cast<unsigned char>(str[end - 1]))) {
        --end;
    }
    return str.substr(start, end - start);
}

std::string toUpperCase(const std::string& str) {
    std::string out = str;
    std::transform(out.begin(), out.end(), out.begin(), [](unsigned char c) {
        return static_cast<char>(std::toupper(c));
    });
    return out;
}

std::string sanitizeCsvField(const std::string& str) {
    std::string out;
    out.reserve(str.size());
    for (char c : str) {
        if (c == ',' || c == '\n' || c == '\r') {
            out.push_back(' ');
        } else {
            out.push_back(c);
        }
    }
    return out;
}

std::vector<std::string> splitCsvLine(const std::string& line) {
    std::vector<std::string> fields;
    std::stringstream ss(line);
    std::string item;
    while (std::getline(ss, item, ',')) {
        fields.push_back(item);
    }
    if (!line.empty() && line.back() == ',') {
        fields.emplace_back("");
    }
    return fields;
}

std::string formatTimestampIso(std::time_t ts) {
    if (ts <= 0) return "";
    std::tm tmBuf{};
    gmtime_r(&ts, &tmBuf);
    std::ostringstream oss;
    oss << std::put_time(&tmBuf, "%Y-%m-%dT%H:%M:%SZ");
    return oss.str();
}

std::string formatTimestampDisplay(std::time_t ts) {
    if (ts <= 0) return "-";
    std::tm tmBuf{};
    localtime_r(&ts, &tmBuf);
    std::ostringstream oss;
    oss << std::put_time(&tmBuf, "%d %b %Y, %I:%M %p");
    return oss.str();
}

std::string formatDateOnly(std::time_t ts) {
    if (ts <= 0) return "";
    std::tm tmBuf{};
    localtime_r(&ts, &tmBuf);
    std::ostringstream oss;
    oss << std::put_time(&tmBuf, "%Y-%m-%d");
    return oss.str();
}

std::string formatDuration(long long totalMinutes) {
    if (totalMinutes < 1) {
        return "Less than 1 min";
    }
    long long hours = totalMinutes / 60;
    long long mins = totalMinutes % 60;
    std::ostringstream oss;
    if (hours > 0) {
        oss << hours << (hours == 1 ? " hr" : " hrs");
        if (mins > 0) {
            oss << " " << mins << (mins == 1 ? " min" : " mins");
        }
    } else {
        oss << mins << (mins == 1 ? " min" : " mins");
    }
    return oss.str();
}

// ============================================================================
// Vehicle Implementation
// ============================================================================

Vehicle::Vehicle() : vehicleNumber(""), vehicleType(""), entryTime(0) {}

Vehicle::Vehicle(const std::string& number, const std::string& type, std::time_t entryTs)
    : vehicleNumber(normalizeVehicleNumber(number)),
      vehicleType(normalizeVehicleType(type)),
      entryTime(entryTs) {}

std::string Vehicle::getVehicleNumber() const { return vehicleNumber; }
std::string Vehicle::getVehicleType() const { return vehicleType; }
std::time_t Vehicle::getEntryTime() const { return entryTime; }

void Vehicle::setVehicleNumber(const std::string& number) {
    vehicleNumber = normalizeVehicleNumber(number);
}

void Vehicle::setVehicleType(const std::string& type) {
    vehicleType = normalizeVehicleType(type);
}

void Vehicle::setEntryTime(std::time_t ts) { entryTime = ts; }

bool Vehicle::isValidVehicleType(const std::string& type) {
    std::string norm = normalizeVehicleType(type);
    return norm == "Car" || norm == "Bike";
}

std::string Vehicle::normalizeVehicleType(const std::string& type) {
    std::string upper = toUpperCase(trim(type));
    if (upper == "CAR" || upper == "FOUR-WHEELER" || upper == "4W") return "Car";
    if (upper == "BIKE" || upper == "TWO-WHEELER" || upper == "2W" || upper == "MOTORCYCLE") return "Bike";
    return trim(type);
}

std::string Vehicle::normalizeVehicleNumber(const std::string& number) {
    std::string trimmed = toUpperCase(trim(number));
    std::string cleaned;
    cleaned.reserve(trimmed.size());
    bool lastWasSpace = false;
    for (char c : trimmed) {
        if (std::isalnum(static_cast<unsigned char>(c)) || c == '-') {
            cleaned.push_back(c);
            lastWasSpace = false;
        } else if (std::isspace(static_cast<unsigned char>(c)) && !lastWasSpace && !cleaned.empty()) {
            cleaned.push_back(' ');
            lastWasSpace = true;
        }
    }
    while (!cleaned.empty() && cleaned.back() == ' ') {
        cleaned.pop_back();
    }
    return cleaned;
}

// ============================================================================
// ParkingSlot Implementation
// ============================================================================

ParkingSlot::ParkingSlot()
    : slotId(""), vehicleType(""), zone(""), occupied(false), vehicleNumber(""), ticketId(""), occupiedSince(0) {}

ParkingSlot::ParkingSlot(const std::string& id, const std::string& type, const std::string& zoneName)
    : slotId(id), vehicleType(type), zone(zoneName), occupied(false), vehicleNumber(""), ticketId(""), occupiedSince(0) {}

std::string ParkingSlot::getSlotId() const { return slotId; }
std::string ParkingSlot::getVehicleType() const { return vehicleType; }
std::string ParkingSlot::getZone() const { return zone; }
bool ParkingSlot::isOccupied() const { return occupied; }
std::string ParkingSlot::getVehicleNumber() const { return vehicleNumber; }
std::string ParkingSlot::getTicketId() const { return ticketId; }
std::time_t ParkingSlot::getOccupiedSince() const { return occupiedSince; }

void ParkingSlot::occupy(const std::string& vehNumber, const std::string& tktId, std::time_t sinceTs) {
    occupied = true;
    vehicleNumber = vehNumber;
    ticketId = tktId;
    occupiedSince = sinceTs;
}

void ParkingSlot::release() {
    occupied = false;
    vehicleNumber.clear();
    ticketId.clear();
    occupiedSince = 0;
}

std::string ParkingSlot::displaySlotStatus() const {
    std::ostringstream oss;
    oss << "[" << slotId << "] (" << vehicleType << ") - ";
    if (occupied) {
        oss << "OCCUPIED by " << vehicleNumber << " (Ticket: " << ticketId << ")";
    } else {
        oss << "AVAILABLE";
    }
    return oss.str();
}

std::string ParkingSlot::toCsvRow() const {
    std::ostringstream oss;
    oss << sanitizeCsvField(slotId) << ","
        << sanitizeCsvField(vehicleType) << ","
        << sanitizeCsvField(zone) << ","
        << (occupied ? "1" : "0") << ","
        << sanitizeCsvField(vehicleNumber) << ","
        << sanitizeCsvField(ticketId) << ","
        << static_cast<long long>(occupiedSince);
    return oss.str();
}

ParkingSlot ParkingSlot::fromCsvRow(const std::string& line) {
    auto fields = splitCsvLine(line);
    ParkingSlot slot;
    if (fields.size() >= 7) {
        slot.slotId = fields[0];
        slot.vehicleType = fields[1];
        slot.zone = fields[2];
        slot.occupied = (fields[3] == "1");
        slot.vehicleNumber = fields[4];
        slot.ticketId = fields[5];
        slot.occupiedSince = static_cast<std::time_t>(std::stoll(fields[6].empty() ? "0" : fields[6]));
    }
    return slot;
}

std::string ParkingSlot::toJson() const {
    std::ostringstream oss;
    oss << "{"
        << "\"slotId\":\"" << escapeJson(slotId) << "\","
        << "\"vehicleType\":\"" << escapeJson(vehicleType) << "\","
        << "\"zone\":\"" << escapeJson(zone) << "\","
        << "\"isOccupied\":" << (occupied ? "true" : "false") << ","
        << "\"status\":\"" << (occupied ? "Occupied" : "Available") << "\","
        << "\"vehicleNumber\":\"" << escapeJson(vehicleNumber) << "\","
        << "\"ticketId\":\"" << escapeJson(ticketId) << "\","
        << "\"occupiedSince\":" << static_cast<long long>(occupiedSince) << ","
        << "\"occupiedSinceIso\":\"" << escapeJson(formatTimestampIso(occupiedSince)) << "\","
        << "\"occupiedSinceDisplay\":\"" << escapeJson(formatTimestampDisplay(occupiedSince)) << "\","
        << "\"statusLabel\":\"" << escapeJson(displaySlotStatus()) << "\""
        << "}";
    return oss.str();
}

// ============================================================================
// ParkingTicket Implementation
// ============================================================================

ParkingTicket::ParkingTicket()
    : ticketId(""),
      vehicleNumber(""),
      vehicleType(""),
      slotId(""),
      entryTime(0),
      exitTime(0),
      status("Active"),
      durationMinutes(0),
      billedHours(0),
      feeAmount(0) {}

ParkingTicket::ParkingTicket(const std::string& tktId,
                             const std::string& vehNumber,
                             const std::string& vehType,
                             const std::string& slot,
                             std::time_t entryTs)
    : ticketId(tktId),
      vehicleNumber(vehNumber),
      vehicleType(vehType),
      slotId(slot),
      entryTime(entryTs),
      exitTime(0),
      status("Active"),
      durationMinutes(0),
      billedHours(0),
      feeAmount(0) {}

std::string ParkingTicket::getTicketId() const { return ticketId; }
std::string ParkingTicket::getVehicleNumber() const { return vehicleNumber; }
std::string ParkingTicket::getVehicleType() const { return vehicleType; }
std::string ParkingTicket::getSlotId() const { return slotId; }
std::time_t ParkingTicket::getEntryTime() const { return entryTime; }
std::time_t ParkingTicket::getExitTime() const { return exitTime; }
std::string ParkingTicket::getStatus() const { return status; }
long long ParkingTicket::getDurationMinutes() const { return durationMinutes; }
int ParkingTicket::getBilledHours() const { return billedHours; }
int ParkingTicket::getFeeAmount() const { return feeAmount; }

bool ParkingTicket::isActive() const { return status == "Active"; }

void ParkingTicket::complete(std::time_t exitTs, long long durMins, int hoursBilled, int fee) {
    exitTime = exitTs;
    durationMinutes = durMins;
    billedHours = hoursBilled;
    feeAmount = fee;
    status = "Completed";
}

std::string ParkingTicket::toCsvRow() const {
    std::ostringstream oss;
    oss << sanitizeCsvField(ticketId) << ","
        << sanitizeCsvField(vehicleNumber) << ","
        << sanitizeCsvField(vehicleType) << ","
        << sanitizeCsvField(slotId) << ","
        << static_cast<long long>(entryTime) << ","
        << static_cast<long long>(exitTime) << ","
        << sanitizeCsvField(status) << ","
        << durationMinutes << ","
        << billedHours << ","
        << feeAmount;
    return oss.str();
}

ParkingTicket ParkingTicket::fromCsvRow(const std::string& line) {
    auto fields = splitCsvLine(line);
    ParkingTicket tkt;
    if (fields.size() >= 10) {
        tkt.ticketId = fields[0];
        tkt.vehicleNumber = fields[1];
        tkt.vehicleType = fields[2];
        tkt.slotId = fields[3];
        tkt.entryTime = static_cast<std::time_t>(std::stoll(fields[4].empty() ? "0" : fields[4]));
        tkt.exitTime = static_cast<std::time_t>(std::stoll(fields[5].empty() ? "0" : fields[5]));
        tkt.status = fields[6];
        tkt.durationMinutes = std::stoll(fields[7].empty() ? "0" : fields[7]);
        tkt.billedHours = std::stoi(fields[8].empty() ? "0" : fields[8]);
        tkt.feeAmount = std::stoi(fields[9].empty() ? "0" : fields[9]);
    }
    return tkt;
}

std::string ParkingTicket::toJson() const {
    std::ostringstream oss;
    oss << "{"
        << "\"ticketId\":\"" << escapeJson(ticketId) << "\","
        << "\"vehicleNumber\":\"" << escapeJson(vehicleNumber) << "\","
        << "\"vehicleType\":\"" << escapeJson(vehicleType) << "\","
        << "\"slotId\":\"" << escapeJson(slotId) << "\","
        << "\"entryTime\":" << static_cast<long long>(entryTime) << ","
        << "\"entryTimeIso\":\"" << escapeJson(formatTimestampIso(entryTime)) << "\","
        << "\"entryTimeDisplay\":\"" << escapeJson(formatTimestampDisplay(entryTime)) << "\","
        << "\"exitTime\":" << static_cast<long long>(exitTime) << ","
        << "\"exitTimeIso\":\"" << escapeJson(formatTimestampIso(exitTime)) << "\","
        << "\"exitTimeDisplay\":\"" << escapeJson(formatTimestampDisplay(exitTime)) << "\","
        << "\"status\":\"" << escapeJson(status) << "\","
        << "\"durationMinutes\":" << durationMinutes << ","
        << "\"durationFormatted\":\"" << escapeJson(durationMinutes > 0 ? formatDuration(durationMinutes) : "-") << "\","
        << "\"billedHours\":" << billedHours << ","
        << "\"feeAmount\":" << feeAmount
        << "}";
    return oss.str();
}

// ============================================================================
// FeeBreakdown & Billing Implementation
// ============================================================================

std::string FeeBreakdown::toJson() const {
    std::ostringstream oss;
    oss << "{"
        << "\"vehicleType\":\"" << escapeJson(vehicleType) << "\","
        << "\"durationMinutes\":" << durationMinutes << ","
        << "\"durationFormatted\":\"" << escapeJson(durationFormatted) << "\","
        << "\"billedHours\":" << billedHours << ","
        << "\"hourlyRate\":" << hourlyRate << ","
        << "\"totalFee\":" << totalFee << ","
        << "\"calculationFormula\":\"" << escapeJson(calculationFormula) << "\","
        << "\"billingRule\":\"" << escapeJson(billingRule) << "\""
        << "}";
    return oss.str();
}

int Billing::getHourlyRate(const std::string& vehicleType) {
    if (Vehicle::normalizeVehicleType(vehicleType) == "Bike") {
        return BIKE_RATE_PER_HOUR;
    }
    return CAR_RATE_PER_HOUR;
}

FeeBreakdown Billing::calculateFee(const std::string& vehicleType,
                                   std::time_t entryTime,
                                   std::time_t exitTime) {
    FeeBreakdown fb;
    fb.vehicleType = Vehicle::normalizeVehicleType(vehicleType);
    fb.hourlyRate = getHourlyRate(fb.vehicleType);

    long long diffSeconds = static_cast<long long>(exitTime - entryTime);
    if (diffSeconds < 0) diffSeconds = 0;

    fb.durationMinutes = (diffSeconds + 59) / 60;
    if (fb.durationMinutes == 0 && diffSeconds > 0) {
        fb.durationMinutes = 1;
    }
    fb.durationFormatted = formatDuration(fb.durationMinutes);

    // Round up partial hours; minimum charge is 1 hour
    int computedHours = static_cast<int>((fb.durationMinutes + 59) / 60);
    if (computedHours < 1) {
        computedHours = 1;
    }
    fb.billedHours = computedHours;
    fb.totalFee = fb.billedHours * fb.hourlyRate;

    std::ostringstream formula;
    formula << fb.billedHours << (fb.billedHours == 1 ? " hr" : " hrs")
            << " x Rs." << fb.hourlyRate << "/hr = Rs." << fb.totalFee;
    fb.calculationFormula = formula.str();

    if (fb.durationMinutes <= 60) {
        fb.billingRule = "Minimum 1-hour charge applied";
    } else if (fb.durationMinutes % 60 != 0) {
        fb.billingRule = "Partial hour rounded up to next full hour";
    } else {
        fb.billingRule = "Exact hourly tariff applied";
    }
    return fb;
}

// ============================================================================
// Payment Implementation
// ============================================================================

Payment::Payment()
    : paymentId(""),
      ticketId(""),
      vehicleNumber(""),
      vehicleType(""),
      slotId(""),
      entryTime(0),
      exitTime(0),
      durationMinutes(0),
      billedHours(0),
      hourlyRate(0),
      amountPaid(0),
      paidAt(0) {}

Payment::Payment(const std::string& payId,
                 const ParkingTicket& ticket,
                 const FeeBreakdown& breakdown,
                 std::time_t paidTimestamp)
    : paymentId(payId),
      ticketId(ticket.getTicketId()),
      vehicleNumber(ticket.getVehicleNumber()),
      vehicleType(ticket.getVehicleType()),
      slotId(ticket.getSlotId()),
      entryTime(ticket.getEntryTime()),
      exitTime(paidTimestamp),
      durationMinutes(breakdown.durationMinutes),
      billedHours(breakdown.billedHours),
      hourlyRate(breakdown.hourlyRate),
      amountPaid(breakdown.totalFee),
      paidAt(paidTimestamp) {}

std::string Payment::getPaymentId() const { return paymentId; }
std::string Payment::getTicketId() const { return ticketId; }
std::string Payment::getVehicleNumber() const { return vehicleNumber; }
std::string Payment::getVehicleType() const { return vehicleType; }
std::string Payment::getSlotId() const { return slotId; }
std::time_t Payment::getEntryTime() const { return entryTime; }
std::time_t Payment::getExitTime() const { return exitTime; }
long long Payment::getDurationMinutes() const { return durationMinutes; }
int Payment::getBilledHours() const { return billedHours; }
int Payment::getHourlyRate() const { return hourlyRate; }
int Payment::getAmountPaid() const { return amountPaid; }
std::time_t Payment::getPaidAt() const { return paidAt; }

std::string Payment::generateReceiptText() const {
    std::ostringstream oss;
    oss << "============================================\n"
        << "       SMART PARKING MANAGEMENT SYSTEM      \n"
        << "              PARKING RECEIPT               \n"
        << "============================================\n"
        << "Receipt ID     : " << paymentId << "\n"
        << "Ticket ID      : " << ticketId << "\n"
        << "Vehicle Number : " << vehicleNumber << "\n"
        << "Vehicle Type   : " << vehicleType << "\n"
        << "Parking Slot   : " << slotId << "\n"
        << "--------------------------------------------\n"
        << "Entry Time     : " << formatTimestampDisplay(entryTime) << "\n"
        << "Exit Time      : " << formatTimestampDisplay(exitTime) << "\n"
        << "Duration       : " << formatDuration(durationMinutes) << "\n"
        << "Billed Hours   : " << billedHours << (billedHours == 1 ? " hr" : " hrs") << "\n"
        << "Hourly Tariff  : Rs. " << hourlyRate << " / hr\n"
        << "--------------------------------------------\n"
        << "TOTAL PAID     : Rs. " << amountPaid << "\n"
        << "============================================\n"
        << "   Thank you for using Smart Parking!       \n";
    return oss.str();
}

std::string Payment::generateReceiptJson() const {
    std::ostringstream oss;
    oss << "{"
        << "\"paymentId\":\"" << escapeJson(paymentId) << "\","
        << "\"ticketId\":\"" << escapeJson(ticketId) << "\","
        << "\"vehicleNumber\":\"" << escapeJson(vehicleNumber) << "\","
        << "\"vehicleType\":\"" << escapeJson(vehicleType) << "\","
        << "\"slotId\":\"" << escapeJson(slotId) << "\","
        << "\"entryTime\":" << static_cast<long long>(entryTime) << ","
        << "\"entryTimeIso\":\"" << escapeJson(formatTimestampIso(entryTime)) << "\","
        << "\"entryTimeDisplay\":\"" << escapeJson(formatTimestampDisplay(entryTime)) << "\","
        << "\"exitTime\":" << static_cast<long long>(exitTime) << ","
        << "\"exitTimeIso\":\"" << escapeJson(formatTimestampIso(exitTime)) << "\","
        << "\"exitTimeDisplay\":\"" << escapeJson(formatTimestampDisplay(exitTime)) << "\","
        << "\"date\":\"" << escapeJson(formatDateOnly(exitTime)) << "\","
        << "\"durationMinutes\":" << durationMinutes << ","
        << "\"durationFormatted\":\"" << escapeJson(formatDuration(durationMinutes)) << "\","
        << "\"billedHours\":" << billedHours << ","
        << "\"hourlyRate\":" << hourlyRate << ","
        << "\"amountPaid\":" << amountPaid << ","
        << "\"paidAt\":" << static_cast<long long>(paidAt) << ","
        << "\"receiptText\":\"" << escapeJson(generateReceiptText()) << "\""
        << "}";
    return oss.str();
}

std::string Payment::toCsvRow() const {
    std::ostringstream oss;
    oss << sanitizeCsvField(paymentId) << ","
        << sanitizeCsvField(ticketId) << ","
        << sanitizeCsvField(vehicleNumber) << ","
        << sanitizeCsvField(vehicleType) << ","
        << sanitizeCsvField(slotId) << ","
        << static_cast<long long>(entryTime) << ","
        << static_cast<long long>(exitTime) << ","
        << durationMinutes << ","
        << billedHours << ","
        << hourlyRate << ","
        << amountPaid << ","
        << static_cast<long long>(paidAt);
    return oss.str();
}

Payment Payment::fromCsvRow(const std::string& line) {
    auto fields = splitCsvLine(line);
    Payment p;
    if (fields.size() >= 12) {
        p.paymentId = fields[0];
        p.ticketId = fields[1];
        p.vehicleNumber = fields[2];
        p.vehicleType = fields[3];
        p.slotId = fields[4];
        p.entryTime = static_cast<std::time_t>(std::stoll(fields[5].empty() ? "0" : fields[5]));
        p.exitTime = static_cast<std::time_t>(std::stoll(fields[6].empty() ? "0" : fields[6]));
        p.durationMinutes = std::stoll(fields[7].empty() ? "0" : fields[7]);
        p.billedHours = std::stoi(fields[8].empty() ? "0" : fields[8]);
        p.hourlyRate = std::stoi(fields[9].empty() ? "0" : fields[9]);
        p.amountPaid = std::stoi(fields[10].empty() ? "0" : fields[10]);
        p.paidAt = static_cast<std::time_t>(std::stoll(fields[11].empty() ? "0" : fields[11]));
    }
    return p;
}

std::string Payment::toJson() const {
    return generateReceiptJson();
}

} // namespace SmartParking
