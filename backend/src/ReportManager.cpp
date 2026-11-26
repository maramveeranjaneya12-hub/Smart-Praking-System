#include "ReportManager.hpp"

#include <algorithm>
#include <ctime>
#include <iomanip>
#include <map>
#include <set>
#include <sstream>

namespace SmartParking {

namespace {

std::string formatShortDateLabel(const std::string& isoDate) {
    if (isoDate.size() < 10) return isoDate;
    std::tm tmBuf{};
    std::istringstream iss(isoDate);
    iss >> std::get_time(&tmBuf, "%Y-%m-%d");
    if (iss.fail()) return isoDate;
    std::ostringstream oss;
    oss << std::put_time(&tmBuf, "%d %b");
    return oss.str();
}

bool containsCaseInsensitive(const std::string& haystack, const std::string& needle) {
    if (needle.empty()) return true;
    return toUpperCase(haystack).find(toUpperCase(needle)) != std::string::npos;
}

} // namespace

DashboardSummary ReportManager::computeDashboardSummary(
    const std::vector<ParkingSlot>& slots,
    const std::vector<ParkingTicket>& /*tickets*/,
    const std::vector<Payment>& payments) {

    DashboardSummary summary;
    std::string todayStr = formatDateOnly(std::time(nullptr));

    for (const auto& slot : slots) {
        if (slot.getVehicleType() == "Car") {
            summary.totalCarSlots++;
            if (slot.isOccupied()) {
                summary.occupiedCarSlots++;
            } else {
                summary.availableCarSlots++;
            }
        } else if (slot.getVehicleType() == "Bike") {
            summary.totalBikeSlots++;
            if (slot.isOccupied()) {
                summary.occupiedBikeSlots++;
            } else {
                summary.availableBikeSlots++;
            }
        }
    }

    summary.currentlyParkedVehicles = summary.occupiedCarSlots + summary.occupiedBikeSlots;
    summary.totalCompletedTransactions = static_cast<int>(payments.size());

    long long totalMinutesSum = 0;
    for (const auto& pay : payments) {
        summary.totalRevenue += pay.getAmountPaid();
        totalMinutesSum += pay.getDurationMinutes();
        if (pay.getVehicleType() == "Car") {
            summary.carRevenue += pay.getAmountPaid();
        } else if (pay.getVehicleType() == "Bike") {
            summary.bikeRevenue += pay.getAmountPaid();
        }
        if (formatDateOnly(pay.getExitTime()) == todayStr) {
            summary.todayRevenue += pay.getAmountPaid();
        }
    }

    if (!payments.empty()) {
        summary.averageDurationMinutes =
            static_cast<double>(totalMinutesSum) / static_cast<double>(payments.size());
    }

    return summary;
}

std::vector<DailyRevenueStat> ReportManager::computeDailyRevenue(
    const std::vector<Payment>& payments,
    int recentDays) {

    std::map<std::string, DailyRevenueStat> byDate;
    std::time_t now = std::time(nullptr);

    // Seed the last N days so charts always show a clean continuous timeline
    for (int i = recentDays - 1; i >= 0; --i) {
        std::time_t dayTs = now - static_cast<std::time_t>(i) * 86400;
        std::string dateStr = formatDateOnly(dayTs);
        DailyRevenueStat stat;
        stat.date = dateStr;
        stat.displayLabel = formatShortDateLabel(dateStr);
        stat.totalRevenue = 0;
        stat.carRevenue = 0;
        stat.bikeRevenue = 0;
        stat.transactions = 0;
        stat.carCount = 0;
        stat.bikeCount = 0;
        byDate[dateStr] = stat;
    }

    for (const auto& pay : payments) {
        std::string dateStr = formatDateOnly(pay.getExitTime());
        auto it = byDate.find(dateStr);
        if (it == byDate.end()) {
            DailyRevenueStat stat;
            stat.date = dateStr;
            stat.displayLabel = formatShortDateLabel(dateStr);
            stat.totalRevenue = 0;
            stat.carRevenue = 0;
            stat.bikeRevenue = 0;
            stat.transactions = 0;
            stat.carCount = 0;
            stat.bikeCount = 0;
            byDate[dateStr] = stat;
            it = byDate.find(dateStr);
        }
        it->second.totalRevenue += pay.getAmountPaid();
        it->second.transactions++;
        if (pay.getVehicleType() == "Car") {
            it->second.carRevenue += pay.getAmountPaid();
            it->second.carCount++;
        } else {
            it->second.bikeRevenue += pay.getAmountPaid();
            it->second.bikeCount++;
        }
    }

    std::vector<DailyRevenueStat> result;
    result.reserve(byDate.size());
    for (const auto& kv : byDate) {
        result.push_back(kv.second);
    }
    return result;
}

std::string ReportManager::buildDashboardJson(
    const std::vector<ParkingSlot>& slots,
    const std::vector<ParkingTicket>& tickets,
    const std::vector<Payment>& payments) {

    DashboardSummary summary = computeDashboardSummary(slots, tickets, payments);
    auto dailyStats = computeDailyRevenue(payments, 7);

    // Gather up to 8 most recent tickets (newest first)
    std::vector<ParkingTicket> sortedTickets = tickets;
    std::sort(sortedTickets.begin(), sortedTickets.end(),
              [](const ParkingTicket& a, const ParkingTicket& b) {
                  std::time_t ta = a.getExitTime() > 0 ? a.getExitTime() : a.getEntryTime();
                  std::time_t tb = b.getExitTime() > 0 ? b.getExitTime() : b.getEntryTime();
                  return ta > tb;
              });
    if (sortedTickets.size() > 8) {
        sortedTickets.resize(8);
    }

    std::ostringstream oss;
    oss << "{"
        << "\"success\":true,"
        << "\"summary\":{"
        << "\"totalCarSlots\":" << summary.totalCarSlots << ","
        << "\"availableCarSlots\":" << summary.availableCarSlots << ","
        << "\"occupiedCarSlots\":" << summary.occupiedCarSlots << ","
        << "\"totalBikeSlots\":" << summary.totalBikeSlots << ","
        << "\"availableBikeSlots\":" << summary.availableBikeSlots << ","
        << "\"occupiedBikeSlots\":" << summary.occupiedBikeSlots << ","
        << "\"totalSlots\":" << (summary.totalCarSlots + summary.totalBikeSlots) << ","
        << "\"availableSlots\":" << (summary.availableCarSlots + summary.availableBikeSlots) << ","
        << "\"currentlyParkedVehicles\":" << summary.currentlyParkedVehicles << ","
        << "\"totalCompletedTransactions\":" << summary.totalCompletedTransactions << ","
        << "\"totalRevenue\":" << summary.totalRevenue << ","
        << "\"todayRevenue\":" << summary.todayRevenue << ","
        << "\"carRevenue\":" << summary.carRevenue << ","
        << "\"bikeRevenue\":" << summary.bikeRevenue << ","
        << "\"averageDurationMinutes\":" << std::fixed << std::setprecision(1) << summary.averageDurationMinutes
        << "},"
        << "\"tariff\":{"
        << "\"carRatePerHour\":" << Billing::CAR_RATE_PER_HOUR << ","
        << "\"bikeRatePerHour\":" << Billing::BIKE_RATE_PER_HOUR << ","
        << "\"minimumHours\":1,"
        << "\"roundingRule\":\"Round up partial hours\""
        << "},"
        << "\"dailyRevenue\":[";

    for (size_t i = 0; i < dailyStats.size(); ++i) {
        if (i > 0) oss << ",";
        const auto& d = dailyStats[i];
        oss << "{"
            << "\"date\":\"" << escapeJson(d.date) << "\","
            << "\"label\":\"" << escapeJson(d.displayLabel) << "\","
            << "\"totalRevenue\":" << d.totalRevenue << ","
            << "\"carRevenue\":" << d.carRevenue << ","
            << "\"bikeRevenue\":" << d.bikeRevenue << ","
            << "\"transactions\":" << d.transactions << ","
            << "\"carCount\":" << d.carCount << ","
            << "\"bikeCount\":" << d.bikeCount
            << "}";
    }

    oss << "],\"recentActivity\":[";
    for (size_t i = 0; i < sortedTickets.size(); ++i) {
        if (i > 0) oss << ",";
        oss << sortedTickets[i].toJson();
    }
    oss << "]}";
    return oss.str();
}

std::string ReportManager::buildHistoryReportJson(
    const std::vector<Payment>& payments,
    const std::string& query,
    const std::string& vehicleTypeFilter,
    const std::string& dateFilter) {

    std::string cleanQuery = trim(query);
    std::string cleanType = trim(vehicleTypeFilter);
    std::string cleanDate = trim(dateFilter);

    // Collect available dates across all payments
    std::set<std::string, std::greater<std::string>> availableDates;
    for (const auto& p : payments) {
        availableDates.insert(formatDateOnly(p.getExitTime()));
    }

    std::vector<Payment> filtered;
    int filteredRevenue = 0;
    int carTransactions = 0;
    int bikeTransactions = 0;
    long long filteredDurationSum = 0;

    for (const auto& p : payments) {
        if (!cleanType.empty() && cleanType != "All" &&
            toUpperCase(p.getVehicleType()) != toUpperCase(cleanType)) {
            continue;
        }
        if (!cleanDate.empty() && cleanDate != "All" &&
            formatDateOnly(p.getExitTime()) != cleanDate) {
            continue;
        }
        if (!cleanQuery.empty()) {
            bool match = containsCaseInsensitive(p.getTicketId(), cleanQuery) ||
                         containsCaseInsensitive(p.getVehicleNumber(), cleanQuery) ||
                         containsCaseInsensitive(p.getPaymentId(), cleanQuery) ||
                         containsCaseInsensitive(p.getSlotId(), cleanQuery);
            if (!match) continue;
        }
        filtered.push_back(p);
        filteredRevenue += p.getAmountPaid();
        filteredDurationSum += p.getDurationMinutes();
        if (p.getVehicleType() == "Car") carTransactions++;
        else bikeTransactions++;
    }

    // Sort newest exit first
    std::sort(filtered.begin(), filtered.end(),
              [](const Payment& a, const Payment& b) {
                  return a.getExitTime() > b.getExitTime();
              });

    auto dailyStats = computeDailyRevenue(payments, 7);
    std::string todayStr = formatDateOnly(std::time(nullptr));
    int todayRevenue = 0;
    int allTimeRevenue = 0;
    for (const auto& p : payments) {
        allTimeRevenue += p.getAmountPaid();
        if (formatDateOnly(p.getExitTime()) == todayStr) {
            todayRevenue += p.getAmountPaid();
        }
    }

    double avgFee = filtered.empty() ? 0.0 : static_cast<double>(filteredRevenue) / filtered.size();
    double avgMins = filtered.empty() ? 0.0 : static_cast<double>(filteredDurationSum) / filtered.size();

    std::ostringstream oss;
    oss << "{"
        << "\"success\":true,"
        << "\"totals\":{"
        << "\"allTimeRevenue\":" << allTimeRevenue << ","
        << "\"todayRevenue\":" << todayRevenue << ","
        << "\"totalCompletedTransactions\":" << payments.size() << ","
        << "\"filteredCount\":" << filtered.size() << ","
        << "\"filteredRevenue\":" << filteredRevenue << ","
        << "\"carTransactions\":" << carTransactions << ","
        << "\"bikeTransactions\":" << bikeTransactions << ","
        << "\"averageFee\":" << std::fixed << std::setprecision(1) << avgFee << ","
        << "\"averageDurationMinutes\":" << std::fixed << std::setprecision(1) << avgMins
        << "},"
        << "\"availableDates\":[";

    bool firstDate = true;
    for (const auto& d : availableDates) {
        if (!firstDate) oss << ",";
        firstDate = false;
        oss << "\"" << escapeJson(d) << "\"";
    }

    oss << "],\"dailyRevenue\":[";
    for (size_t i = 0; i < dailyStats.size(); ++i) {
        if (i > 0) oss << ",";
        const auto& d = dailyStats[i];
        oss << "{"
            << "\"date\":\"" << escapeJson(d.date) << "\","
            << "\"label\":\"" << escapeJson(d.displayLabel) << "\","
            << "\"totalRevenue\":" << d.totalRevenue << ","
            << "\"carRevenue\":" << d.carRevenue << ","
            << "\"bikeRevenue\":" << d.bikeRevenue << ","
            << "\"transactions\":" << d.transactions << ","
            << "\"carCount\":" << d.carCount << ","
            << "\"bikeCount\":" << d.bikeCount
            << "}";
    }

    oss << "],\"records\":[";
    for (size_t i = 0; i < filtered.size(); ++i) {
        if (i > 0) oss << ",";
        oss << filtered[i].toJson();
    }
    oss << "]}";
    return oss.str();
}

} // namespace SmartParking
