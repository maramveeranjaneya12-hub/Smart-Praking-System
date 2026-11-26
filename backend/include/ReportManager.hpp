#ifndef SMART_PARKING_REPORT_MANAGER_HPP
#define SMART_PARKING_REPORT_MANAGER_HPP

#include "Models.hpp"
#include <string>
#include <vector>

namespace SmartParking {

struct DailyRevenueStat {
    std::string date;
    std::string displayLabel;
    int totalRevenue;
    int carRevenue;
    int bikeRevenue;
    int transactions;
    int carCount;
    int bikeCount;
};

struct DashboardSummary {
    int totalCarSlots = 0;
    int availableCarSlots = 0;
    int occupiedCarSlots = 0;
    int totalBikeSlots = 0;
    int availableBikeSlots = 0;
    int occupiedBikeSlots = 0;
    int currentlyParkedVehicles = 0;
    int totalCompletedTransactions = 0;
    int totalRevenue = 0;
    int todayRevenue = 0;
    int carRevenue = 0;
    int bikeRevenue = 0;
    double averageDurationMinutes = 0.0;
};

/**
 * ReportManager: Generates dashboard analytics, occupancy reports, daily revenue breakdowns,
 * and filtered historical transaction reports from persisted C++ records.
 */
class ReportManager {
public:
    static DashboardSummary computeDashboardSummary(
        const std::vector<ParkingSlot>& slots,
        const std::vector<ParkingTicket>& tickets,
        const std::vector<Payment>& payments);

    static std::vector<DailyRevenueStat> computeDailyRevenue(
        const std::vector<Payment>& payments,
        int recentDays = 7);

    static std::string buildDashboardJson(
        const std::vector<ParkingSlot>& slots,
        const std::vector<ParkingTicket>& tickets,
        const std::vector<Payment>& payments);

    static std::string buildHistoryReportJson(
        const std::vector<Payment>& payments,
        const std::string& query,
        const std::string& vehicleTypeFilter,
        const std::string& dateFilter);
};

} // namespace SmartParking

#endif // SMART_PARKING_REPORT_MANAGER_HPP
