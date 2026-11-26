CXX      := g++
CXXFLAGS := -std=c++17 -O2 -Wall -Wextra -Iinclude
TARGET   := bin/parking_backend
SRCS     := src/Models.cpp src/ReportManager.cpp src/ParkingManager.cpp src/main.cpp
OBJS     := $(patsubst src/%.cpp,build/%.o,$(SRCS))

.PHONY: all clean run-cli run-server

all: $(TARGET)

$(TARGET): $(OBJS)
	@mkdir -p bin
	$(CXX) $(CXXFLAGS) -o $@ $^

build/%.o: src/%.cpp include/Models.hpp include/ReportManager.hpp include/ParkingManager.hpp
	@mkdir -p build
	$(CXX) $(CXXFLAGS) -c $< -o $@

clean:
	rm -rf build bin

run-server: $(TARGET)
	./$(TARGET) --serve 8080 --data-dir data
