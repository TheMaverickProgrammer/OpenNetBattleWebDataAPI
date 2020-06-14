cmake_minimum_required(VERSION 3.12)

project(WebAPI)

set (CMAKE_CXX_STANDARD 17)

set(LIBRARY_OUTPUT_PATH "${PROJECT_BINARY_DIR}/lib")

# WebAPI-client
add_subdirectory(client)
