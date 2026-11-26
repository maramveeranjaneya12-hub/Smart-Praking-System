#ifndef SMART_PARKING_MODELS_HPP
#define SMART_PARKING_MODELS_HPP

#include <ctime>
#include <string>
#include <vector>

namespace SmartParking {

// Utility helpers for string formatting, CSV parsing, JSON escaping, and timestamps
std::string escapeJson(const std::string& input);
std::string trim(const std::string& str);
std::string toUpperCase(const std::string& str);
std::string sanitizeCsvField(const std::string& str);
std::vector<std::string> splitCsvLine(const std::string& line);
std::string formatTimestampIso(std::time_t ts);
std::string formatTimestampDisplay(std::time_t ts);
std::string formatDateOnly(std::time_t ts);
std::string formatDuration(long long totalMinutes);

/**
 * Vehicle: Encapsulates vehicle registration details and type validation.
 */
class Vehicle {
private:
    std::string vehicleNumber;
    std::string vehicleType; // "Car" or "Bike"
    std::time_t entryTime;

public:
    Vehicle();
    Vehicle(const std::string& number, const std::string& type, std::time_t entryTs);

    std::string getVehicleNumber() const;
    std::string getVehicleType() const;
    std::time_t getEntryTime() const;

    void setVehicleNumber(const std::string& number);
    void setVehicleType(const std::string& type);
    void setEntryTime(std::time_t ts);

    static bool isValidVehicleType(const std::string& type);
    static std::string normalizeVehicleType(const std::string& type);
    static std::string normalizeVehicleNumber(const std::string& number);
};

/**
 * ParkingSlot: Represents a single physical parking bay for either Cars or Bikes.
 */
class ParkingSlot {
private:
    std::string slotId;       // e.g., C-01 .. C-20, B-01 .. B-16
    std::string vehicleType;  // "Car" or "Bike"
    std::string zone;         // e.g., "Zone A - Ground" or "Zone B - Two-Wheeler"
    bool occupied;
    std::string vehicleNumber;
    std::string ticketId;
    std::time_t occupiedSince;

public:
    ParkingSlot();
    ParkingSlot(const std::string& id, const std::string& type, const std::string& zoneName);

    std::string getSlotId() const;
    std::string getVehicleType() const;
    std::string getZone() const;
    bool isOccupied() const;
    std::string getVehicleNumber() const;
    std::string getTicketId() const;
    std::time_t getOccupiedSince() const;

    void occupy(const std::string& vehNumber, const std::string& tktId, std::time_t sinceTs);
    void release();

    std::string displaySlotStatus() const;
    std::string toCsvRow() const;
    static ParkingSlot fromCsvRow(const std::string& line);
    std::string toJson() const;
};

/**
 * ParkingTicket: Represents an active or completed parking ticket.
 */
class ParkingTicket {
private:
    std::string ticketId;
    std::string vehicleNumber;
    std::string vehicleType;
    std::string slotId;
    std::time_t entryTime;
    std::time_t exitTime;
    std::string status; // "Active" or "Completed"
    long long durationMinutes;
    int billedHours;
    int feeAmount;

public:
    ParkingTicket();
    ParkingTicket(const std::string& tktId,
                  const std::string& vehNumber,
                  const std::string& vehType,
                  const std::string& slot,
                  std::time_t entryTs);

    std::string getTicketId() const;
    std::string getVehicleNumber() const;
    std::string getVehicleType() const;
    std::string getSlotId() const;
    std::time_t getEntryTime() const;
    std::time_t getExitTime() const;
    std::string getStatus() const;
    long long getDurationMinutes() const;
    int getBilledHours() const;
    int getFeeAmount() const;

    bool isActive() const;
    void complete(std::time_t exitTs, long long durMins, int hoursBilled, int fee);

    std::string toCsvRow() const;
    static ParkingTicket fromCsvRow(const std::string& line);
    std::string toJson() const;
};

/**
 * FeeBreakdown: Structured billing calculation output.
 */
struct FeeBreakdown {
    std::string vehicleType;
    long long durationMinutes;
    std::string durationFormatted;
    int billedHours;
    int hourlyRate;
    int totalFee;
    std::string calculationFormula;
    std::string billingRule;

    std::string toJson() const;
};

/**
 * Billing: Calculates parking charges based on fixed hourly tariffs.
 *   Car  : Rs 40 / hour
 *   Bike : Rs 20 / hour
 * Rules: Round up partial hours, minimum charge is 1 hour.
 */
class Billing {
public:
    static constexpr int CAR_RATE_PER_HOUR = 40;
    static constexpr int BIKE_RATE_PER_HOUR = 20;

    static int getHourlyRate(const std::string& vehicleType);
    static FeeBreakdown calculateFee(const std::string& vehicleType,
                                     std::time_t entryTime,
                                     std::time_t exitTime);
};

/**
 * Payment: Encapsulates completed fee transactions and receipt generation.
 */
class Payment {
private:
    std::string paymentId;
    std::string ticketId;
    std::string vehicleNumber;
    std::string vehicleType;
    std::string slotId;
    std::time_t entryTime;
    std::time_t exitTime;
    long long durationMinutes;
    int billedHours;
    int hourlyRate;
    int amountPaid;
    std::time_t paidAt;

public:
    Payment();
    Payment(const std::string& payId,
            const ParkingTicket& ticket,
            const FeeBreakdown& breakdown,
            std::time_t paidTimestamp);

    std::string getPaymentId() const;
    std::string getTicketId() const;
    std::string getVehicleNumber() const;
    std::string getVehicleType() const;
    std::string getSlotId() const;
    std::time_t getEntryTime() const;
    std::time_t getExitTime() const;
    long long getDurationMinutes() const;
    int getBilledHours() const;
    int getHourlyRate() const;
    int getAmountPaid() const;
    std::time_t getPaidAt() const;

    std::string generateReceiptText() const;
    std::string generateReceiptJson() const;
    std::string toCsvRow() const;
    static Payment fromCsvRow(const std::string& line);
    std::string toJson() const;
};

} // namespace SmartParking

#endif // SMART_PARKING_MODELS_HPP
