project(WebAPI-client)

execute_process(COMMAND git submodule update --init -- extern/tabulate
                WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR})

DEFINE_SYMBOL(WEBAPI_CLIENT)

option(BUILD_SHARED_LIBS "TRUE to build WebAPI-client as shared libraries, FALSE to build it as static libraries" ON)

set(INCROOT ${CMAKE_CURRENT_SOURCE_DIR}/include/WebAPI)
set(SRCROOT ${CMAKE_CURRENT_SOURCE_DIR}/src)
set(EXTROOT ${CMAKE_CURRENT_SOURCE_DIR}/extern)

file(GLOB_RECURSE clientHeaders CONFIGURE_DEPENDS
        "${INCROOT}/*.h"
        "${SRCROOT}/*.h"
        "${SRCROOT}/*.cpp"
        )

file(GLOB_RECURSE clientFiles CONFIGURE_DEPENDS
        "${INCROOT}/*.h"
        "${SRCROOT}/*.h"
        "${SRCROOT}/*.cpp"
        )

file(GLOB_RECURSE clientExternalFiles CONFIGURE_DEPENDS
        "${EXTROOT}/httplib/*.h"
        "${EXTROOT}/httplib/*.cc"
        "${EXTROOT}/httplib/*.cpp"
        "${EXTROOT}/jsoncpp/*.h"
        "${EXTROOT}/jsoncpp/*.cpp"
        )

add_library(WebAPI-client ${clientHeaders} ${clientFiles} ${clientExternalFiles})

source_group(TREE ${CMAKE_CURRENT_SOURCE_DIR} FILES ${clientHeaders} ${clientFiles} ${clientExternalFiles})

if(NOT BUILD_SHARED_LIBS)
    target_compile_definitions(WebAPI-client PUBLIC "WEBAPI_STATIC")
endif()

target_include_directories(WebAPI-client PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)
target_include_directories(WebAPI-client PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/extern/jsoncpp)
target_include_directories(WebAPI-client PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/extern/httplib)

set_target_properties( WebAPI-client PROPERTIES 
	CXX_STANDARD 17
#    ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/build/$<CONFIG>"
     LIBRARY_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/build/$<CONFIG>"
#    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/build/$<CONFIG>"
)