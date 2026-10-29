cmake_minimum_required(VERSION 3.20)
project(MCEduClientGUI LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT WIN32)
    message(FATAL_ERROR "MCEduClientGUI currently requires Windows.")
endif()

add_executable(mcedu_client WIN32 src/main.cpp)
target_compile_definitions(mcedu_client PRIVATE UNICODE _UNICODE WIN32_LEAN_AND_MEAN NOMINMAX)
target_link_libraries(mcedu_client PRIVATE user32 gdi32)
