#ifndef SMART_PARKING_MANAGER_HPP
#define SMART_PARKING_MANAGER_HPP

#include "Models.hpp"
#include "ReportManager.hpp"
#include <string>
#include <vector>

namespace SmartParking {

struct ValidationResult {
    bool valid = false;
    std::string errorCode;
    std::string message;
    int ticketIndex = -1;
};

/**
 * ParkingManager: Core orchestrator managing slot allocation, vehicle entry/exit,
 * ticket generation & validation, receipt creation, and C++ file-based persistence.
 */
class ParkingManager {
private:
    std::string dataDir;
    std::vector<ParkingSlot> slots;
    std::vector<ParkingTicket> tickets;
    std::vector<Payment> payments;
    int nextTicketSeq;
    int nextPaymentSeq;

    static constexpr int TOTAL_CAR_SLOTS = 20;
    static constexpr int TOTAL_BIKE_SLOTS = 16;

    std::string getSlotsFilePath() const;
    std::string getTicketsFilePath() const;
    std::string getPaymentsFilePath() const;
    std::string getMetaFilePath() const;

    bool writeFileAtomically(const std::string& path, const std::string& content) const;
    void ensureDataDirectory() const;
    void loadAllData();
    bool saveAllData() const;

    std::string buildErrorJson(const std::string& errorCode, const std::string& message) const;

public:
    explicit ParkingManager(const std::string& dataDirectory);

    // Core OOP operations required by project specification
    int allocateSlot(const std::string& vehicleType);
    bool releaseSlot(const std::string& slotId);
    ParkingTicket generateTicket(const Vehicle& vehicle, const std::string& slotId);
    ValidationResult validateTicket(const std::string& ticketId) const;
    FeeBreakdown calculateFee(const ParkingTicket& ticket, std::time_t exitTime) const;
    std::string generateReceipt(const Payment& payment) const;

    // High-level workflow APIs returning structured JSON strings
    std::string parkVehicle(const std::string& vehicleNumber, const std::string& vehicleType);
    std::string previewVehicleExit(const std::string& ticketId);
    std::string unparkVehicle(const std::string& ticketId);
    std::string displaySlotStatus() const;
    std::string getDashboardData() const;
    std::string getTicketsJson(const std::string& query,
                               const std::string& statusFilter,
                               const std::string& typeFilter) const;
    std::string getHistoryJson(const std::string& query,
                               const std::string& typeFilter,
                               const std::string& dateFilter) const;
    std::string seedSampleData();
    std::string getStorageInfoJson() const;
};

} // namespace SmartParking

#endif // SMART_PARKING_MANAGER_HPP
