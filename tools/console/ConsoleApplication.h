#pragma once

// Even though WebClient uses tese in the DLL...
// This console program requires them too
#include <httplib/httplib.h>
#include <json/json.h>

#include "WebClient.h"
#include "StringUtils.h"

void handleCommands(WebAccounts::WebClient& client, std::string& input);
void handleCreateRequest(WebAccounts::WebClient& client, std::vector<std::string>& tokens);
void handleUpdateRequest(WebAccounts::WebClient& client, std::vector<std::string>& tokens);
void handleDeleteRequest(WebAccounts::WebClient& client, std::vector<std::string>& tokens);
void handleViewRequest(WebAccounts::WebClient& client, std::vector<std::string>& tokens);
void logout(WebAccounts::WebClient& client);
void login(WebAccounts::WebClient& client);
void help();
void showResources();

const char* getElementUnicode(const char* str);
const bool authCheck(const WebAccounts::WebClient& client);
void displayCardsResource(const Json::Value& data, bool detail = false);
void displayCardModelsResource(const Json::Value& data);
