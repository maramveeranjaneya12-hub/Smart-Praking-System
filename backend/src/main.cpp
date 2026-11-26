#include "ParkingManager.hpp"

#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

#include <cstring>
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <vector>

using namespace SmartParking;

namespace {

std::string urlDecode(const std::string& str) {
    std::string out;
    out.reserve(str.size());
    for (size_t i = 0; i < str.size(); ++i) {
        if (str[i] == '%' && i + 2 < str.size()) {
            int hexVal = 0;
            std::istringstream iss(str.substr(i + 1, 2));
            if (iss >> std::hex >> hexVal) {
                out.push_back(static_cast<char>(hexVal));
                i += 2;
                continue;
            }
        } else if (str[i] == '+') {
            out.push_back(' ');
            continue;
        }
        out.push_back(str[i]);
    }
    return out;
}

std::map<std::string, std::string> parseQueryString(const std::string& query) {
    std::map<std::string, std::string> params;
    std::stringstream ss(query);
    std::string pair;
    while (std::getline(ss, pair, '&')) {
        size_t eq = pair.find('=');
        if (eq != std::string::npos) {
            params[urlDecode(pair.substr(0, eq))] = urlDecode(pair.substr(eq + 1));
        }
    }
    return params;
}

std::string extractJsonStringField(const std::string& body, const std::string& key) {
    std::string token = "\"" + key + "\"";
    size_t pos = body.find(token);
    if (pos == std::string::npos) return "";
    size_t colon = body.find(':', pos + token.size());
    if (colon == std::string::npos) return "";
    size_t startQuote = body.find('"', colon + 1);
    if (startQuote == std::string::npos) return "";
    std::string value;
    for (size_t i = startQuote + 1; i < body.size(); ++i) {
        if (body[i] == '\\' && i + 1 < body.size()) {
            value.push_back(body[++i]);
        } else if (body[i] == '"') {
            break;
        } else {
            value.push_back(body[i]);
        }
    }
    return value;
}

void sendHttpResponse(int clientFd, int statusCode, const std::string& statusText, const std::string& jsonBody) {
    std::ostringstream resp;
    resp << "HTTP/1.1 " << statusCode << " " << statusText << "\r\n"
         << "Content-Type: application/json; charset=utf-8\r\n"
         << "Access-Control-Allow-Origin: http://localhost:3000\r\n"
         << "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
         << "Access-Control-Allow-Headers: Content-Type\r\n"
         << "Content-Length: " << jsonBody.size() << "\r\n"
         << "Connection: close\r\n\r\n"
         << jsonBody;
    std::string data = resp.str();
    ssize_t sent = 0;
    while (sent < static_cast<ssize_t>(data.size())) {
        ssize_t n = send(clientFd, data.c_str() + sent, data.size() - sent, 0);
        if (n <= 0) break;
        sent += n;
    }
}

/**
 * Standalone POSIX Socket C++ HTTP Server mode (--serve <port>)
 * Allows running the C++ REST API directly without any intermediary runtime.
 */
int runStandaloneHttpServer(int port, const std::string& dataDir) {
    int serverFd = socket(AF_INET, SOCK_STREAM, 0);
    if (serverFd < 0) {
        std::cerr << "Failed to create socket.\n";
        return 1;
    }

    int opt = 1;
    setsockopt(serverFd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    addr.sin_port = htons(static_cast<uint16_t>(port));

    if (bind(serverFd, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) < 0) {
        std::cerr << "Failed to bind to port " << port << ".\n";
        close(serverFd);
        return 1;
    }

    if (listen(serverFd, 16) < 0) {
        std::cerr << "Failed to listen on port " << port << ".\n";
        close(serverFd);
        return 1;
    }

    ParkingManager manager(dataDir);
    std::cout << "Smart Parking C++ REST API listening on http://127.0.0.1:" << port << "\n";

    while (true) {
        int clientFd = accept(serverFd, nullptr, nullptr);
        if (clientFd < 0) continue;

        char buffer[8192];
        std::memset(buffer, 0, sizeof(buffer));
        ssize_t bytesRead = recv(clientFd, buffer, sizeof(buffer) - 1, 0);
        if (bytesRead <= 0) {
            close(clientFd);
            continue;
        }

        std::string request(buffer, static_cast<size_t>(bytesRead));
        std::istringstream reqStream(request);
        std::string method, rawTarget;
        reqStream >> method >> rawTarget;

        if (method == "OPTIONS") {
            sendHttpResponse(clientFd, 200, "OK", "{}");
            close(clientFd);
            continue;
        }

        std::string path = rawTarget;
        std::string queryStr;
        size_t qPos = rawTarget.find('?');
        if (qPos != std::string::npos) {
            path = rawTarget.substr(0, qPos);
            queryStr = rawTarget.substr(qPos + 1);
        }
        auto queryParams = parseQueryString(queryStr);

        std::string body;
        size_t bodyPos = request.find("\r\n\r\n");
        if (bodyPos != std::string::npos) {
            body = request.substr(bodyPos + 4);
        }

        std::string responseJson;
        int statusCode = 200;

        if (method == "GET" && path == "/api/dashboard") {
            responseJson = manager.getDashboardData();
        } else if (method == "GET" && path == "/api/slots") {
            responseJson = manager.displaySlotStatus();
        } else if (method == "GET" && path == "/api/tickets") {
            responseJson = manager.getTicketsJson(queryParams["q"], queryParams["status"], queryParams["type"]);
        } else if (method == "GET" && path == "/api/history") {
            responseJson = manager.getHistoryJson(queryParams["q"], queryParams["type"], queryParams["date"]);
        } else if (method == "GET" && path == "/api/cpp-info") {
            responseJson = manager.getStorageInfoJson();
        } else if (method == "POST" && path == "/api/entry") {
            std::string vehNum = extractJsonStringField(body, "vehicleNumber");
            std::string vehType = extractJsonStringField(body, "vehicleType");
            responseJson = manager.parkVehicle(vehNum, vehType);
            if (responseJson.find("\"success\":false") != std::string::npos) statusCode = 400;
        } else if (method == "POST" && path == "/api/exit/preview") {
            std::string tktId = extractJsonStringField(body, "ticketId");
            responseJson = manager.previewVehicleExit(tktId);
            if (responseJson.find("\"success\":false") != std::string::npos) statusCode = 400;
        } else if (method == "POST" && path == "/api/exit/confirm") {
            std::string tktId = extractJsonStringField(body, "ticketId");
            responseJson = manager.unparkVehicle(tktId);
            if (responseJson.find("\"success\":false") != std::string::npos) statusCode = 400;
        } else if (method == "POST" && path == "/api/reset-sample") {
            responseJson = manager.seedSampleData();
        } else {
            statusCode = 404;
            responseJson = "{\"success\":false,\"error\":\"Endpoint not found.\"}";
        }

        sendHttpResponse(clientFd, statusCode, statusCode == 200 ? "OK" : (statusCode == 404 ? "Not Found" : "Bad Request"), responseJson);
        close(clientFd);
    }

    close(serverFd);
    return 0;
}

} // namespace

int main(int argc, char* argv[]) {
    std::string dataDir = "data";
    std::vector<std::string> args;

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--data-dir" && i + 1 < argc) {
            dataDir = argv[++i];
        } else {
            args.push_back(arg);
        }
    }

    if (args.empty()) {
        std::cout << "{\"success\":false,\"error\":\"No command provided. Use: dashboard, slots, entry, exit-preview, exit-confirm, tickets, history, info, reset, or --serve <port>\"}\n";
        return 1;
    }

    if (args[0] == "--serve") {
        int port = 8080;
        if (args.size() >= 2) {
            port = std::stoi(args[1]);
        }
        return runStandaloneHttpServer(port, dataDir);
    }

    ParkingManager manager(dataDir);
    const std::string& cmd = args[0];

    if (cmd == "dashboard") {
        std::cout << manager.getDashboardData() << "\n";
    } else if (cmd == "slots") {
        std::cout << manager.displaySlotStatus() << "\n";
    } else if (cmd == "entry") {
        std::string vehNum = args.size() >= 2 ? args[1] : "";
        std::string vehType = args.size() >= 3 ? args[2] : "";
        std::cout << manager.parkVehicle(vehNum, vehType) << "\n";
    } else if (cmd == "exit-preview") {
        std::string ticketId = args.size() >= 2 ? args[1] : "";
        std::cout << manager.previewVehicleExit(ticketId) << "\n";
    } else if (cmd == "exit-confirm") {
        std::string ticketId = args.size() >= 2 ? args[1] : "";
        std::cout << manager.unparkVehicle(ticketId) << "\n";
    } else if (cmd == "tickets") {
        std::string query = args.size() >= 2 ? args[1] : "";
        std::string status = args.size() >= 3 ? args[2] : "All";
        std::string type = args.size() >= 4 ? args[3] : "All";
        std::cout << manager.getTicketsJson(query, status, type) << "\n";
    } else if (cmd == "history") {
        std::string query = args.size() >= 2 ? args[1] : "";
        std::string type = args.size() >= 3 ? args[2] : "All";
        std::string date = args.size() >= 4 ? args[3] : "All";
        std::cout << manager.getHistoryJson(query, type, date) << "\n";
    } else if (cmd == "reset") {
        std::cout << manager.seedSampleData() << "\n";
    } else if (cmd == "info") {
        std::cout << manager.getStorageInfoJson() << "\n";
    } else {
        std::cout << "{\"success\":false,\"error\":\"Unknown command: " << escapeJson(cmd) << "\"}\n";
        return 1;
    }

    return 0;
}
