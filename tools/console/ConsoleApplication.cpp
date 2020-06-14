// ConsoleApplication.cpp : This file contains the 'main' function. Program execution begins and ends there.
//
#include <cctype>
#include <winsock2.h>
#include <tabulate/table.hpp>
#include <iostream>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <iterator>
#include <conio.h>

#include "ConsoleApplication.h"

using namespace StringUtils;
using namespace WebAccounts;

#ifdef WIN32
#define XPLATFORM_GETCH _getch
#else
#define XPLATFORM_GETCH getch
#endif

int main()
{
  Json::Value root;   // 'root' will contain the config keys
  std::ifstream file;
  
  file.open("config.json", std::ifstream::in);

  if (!file.is_open()) {
      std::cout << "There was a problem loading config.json" << std::endl;
      return 1;
  }

  file >> root;
  
  const char* v = root["version"].asCString();
  const char* domain = root["domain"].asCString();

  if (v == nullptr || domain == nullptr) {
      std::cout << "Domain or version was null. Please check your config.json values" << std::endl;
      file.clear();
      return 1;
  }

  int port = root["port"].asInt();

  WebClient client(v, domain, port);
  bool wasOK = client.IsOK();

  std::cout << "Connecting to " << domain << ":" << std::to_string(port) << "..." << (wasOK? "OK" : "FAILED") << std::endl;
  std::string input;

  while (std::getline(std::cin, input) && strcasecmp(input.c_str(), "quit")) {
      if (client.IsOK()) {
          handleCommands(client, input);
          wasOK = true;
      }
      else if(wasOK) {
          std::cout << "[Client lost connection]" << std::endl;
          wasOK = false;
      }
  }

  std::vector<std::string> errorList;
  char* error = 0;

  while (client.GetNextError(&error)) {
      errorList.push_back(error);
      delete error;
      error = 0;
  }

  std::reverse(errorList.begin(), errorList.end());

  if (errorList.size()) {
      std::ofstream file("dump.txt", std::ofstream::out | std::ofstream::app);
      for (auto&& e : errorList) {
          file.write(e.c_str(), e.length());
          file.write("\n", 1);
      }
      file.close();

      std::cout << std::to_string(errorList.size()) << " errors written to dump.txt" << std::endl;
  }

  std::cout << "Goodbye" << std::endl;

  return 0;
}

void handleCommands(WebClient& client, std::string& input) {
    if (input.empty()) return;

    if (matches(input, "login")) {
        login(client);
        
        if (client.IsLoggedIn()) {
            client.FetchAccount();
        }

        return;
    }
    else if (matches(input, "logout")) {
        logout(client);
        return;
    }
    else if (matches(input, "help")) {
        help();
        return;
    }
    else if (matches(input, "help resources")) {
        showResources();
        return;
    }

    auto tokens = splitPreserveQuotes(input);

    try {
        if (matches(tokens, "add")) {
            if (authCheck(client)) {
                tokens.erase(tokens.begin());
                handleCreateRequest(client, tokens);
            }
        }
        else if (matches(tokens, "delete")) {
            if (authCheck(client)) {
                tokens.erase(tokens.begin());
                handleDeleteRequest(client, tokens);
            }
        }
        else if (matches(tokens, "update")) {
            if (authCheck(client)) {
                tokens.erase(tokens.begin());
                handleUpdateRequest(client, tokens);
            }
        }
        else if (matches(tokens, "view")) {
            if (authCheck(client)) {
                tokens.erase(tokens.begin());
                handleViewRequest(client, tokens);
            }
        }
        else {
            std::cout << "unknown commmand " << input << ". Type `help`." << std::endl;
        }
    }
    catch (std::exception e) {
        tabulate::Table table;
        auto& f = table.add_row({ "status", "body" }).format();
        table.add_row({ "internal error", e.what() });
        f.background_color(tabulate::Color::red);
        f.font_color(tabulate::Color::white);

        std::cout << table << std::endl;;
    }
}

void handleCreateRequest(WebClient& client, std::vector<std::string>& tokens) {
    if (tokens.size() <= 1) {
        std::cout << "add command must take arguments. type `help` for info." << std::endl;
        return;
    }

    auto resource = tokens[0];

    if (resource == "card") {
        auto ID = tokens[1];
        WebAccounts::Card{ };
        auto& folders = client.GetLocalAccount().folders;

        if (folders.size()) {
            auto copy = folders.begin()->second;
            client.AddCard(tokens[2], *copy);
        }
        else {
            throw std::runtime_error("No folders");
        }
    }
}

void handleUpdateRequest(WebClient& client, std::vector<std::string>& tokens) {
    if (tokens.size() <= 1) {
        std::cout << "add command must take arguments. type `help` for info." << std::endl;
        return;
    }

    auto resource = tokens[0];

    if (resource == "card") {
        auto ID = tokens[1];
        WebAccounts::Card{ };
        auto& folders = client.GetLocalAccount().folders;

        if (folders.size()) {
            // TODO
        }
        else {
            throw std::runtime_error("No folders");
        }
    }
}

void handleDeleteRequest(WebClient& client, std::vector<std::string>& tokens) {
    if (tokens.size() <= 1) {
        std::cout << "add command must take arguments. type `help` for info." << std::endl;
        return;
    }

    auto resource = tokens[0];

    if (resource == "card") {
        auto ID = tokens[1];
        WebAccounts::Card{ };
        auto& folders = client.GetLocalAccount().folders;

        if (folders.size()) {
            // TODO
        }
        else {
            throw std::runtime_error("No folders");
        }
    }
}

void handleViewRequest(WebClient& client, std::vector<std::string>& tokens) {
    if (tokens.size() <= 1) {
        std::cout << "add command must take arguments. type `help` for info." << std::endl;
        return;
    }

    auto resource = tokens[0];

    if (resource == "summary") {
        client.FetchAccount();
        const auto& account = client.GetLocalAccount();
        const auto& folders = account.folders;
        const auto& models = account.cardModels;

        tabulate::Table table;
        auto& t = table.add_row({ "Folder Name", "# of Cards" }).format();
        t.background_color(tabulate::Color::blue);
        t.font_color(tabulate::Color::white);

        for (auto&& f : folders) {
            table.add_row({ f.second->name.c_str(), std::to_string(f.second->cards.size()).c_str() });
        }

        std::cout << table << std::endl;
    }
}

void logout(WebClient& client) {
    if (!client.IsLoggedIn()) {
        std::cout << "Login first. Type `login`." << std::endl;
        return;
    }

    client.LogoutAndReset();

    if (client.IsLoggedIn()) {
        std::cout << "Logout failed. No communication with the server." << std::endl;
    }
    else {
        std::cout << "Logged out" << std::endl;
    }
}

void login(WebClient& client) {
    std::string user, pass;

    std::cout << "user: ";
    std::getline(std::cin, user);

    std::cout << "pass: ";
    constexpr size_t maxLength = 256;
    char input[maxLength];

    char c = 0;
    size_t idx = 0;
    do {
        c = XPLATFORM_GETCH();
        if (idx > 0 && (int)c == 8) {
            std::cout << c << " " << c;
            idx--;
            continue;
        }
        else if ((int)c == 13) {
            break;
        }
        else if (idx == 0 && (int)c == 8) {
            continue;
        }

        std::cout << "*";
        input[idx++] = c;
    } while (idx < 256);

    std::cout << std::endl;
    input[std::min(idx,maxLength-1)] = '\0';

    // create a string stream so we can read to std string
    std::stringstream ss(input);

    // store ss contents into std string
    std::getline(ss, pass);

    // use the pass string pointer in client
    if (!client.Login(user.c_str(), pass.c_str())) {
        tabulate::Table table;
        auto& f = table.add_row({ "status" }).format();
        table.add_row({ "Login failed" });
        f.background_color(tabulate::Color::red);
        f.font_color(tabulate::Color::white);

        std::cout << table << std::endl;;
    }
    else {
        tabulate::Table table;
        auto& f = table.add_row({ "status" }).format();
        table.add_row({ "Login Successful" });
        f.background_color(tabulate::Color::green);
        f.font_color(tabulate::Color::grey);

        std::cout << table << std::endl;;
    }

}

void help() {
    tabulate::Table table;
    auto first_row = table.add_row({ "command", "description", "example" });
    table.format().hide_border();
    first_row.format().font_color(tabulate::Color::yellow);

    table.add_row({ "view", "list all entries. If ID is given, list the contents of that ID.", "view users 19" });
    table.add_row({ "delete", "ID required. Permanently deletes a resource", "delete folder 143" });
    table.add_row({ "add", "adds an entry to a resource", "add card ..." });
    table.add_row({ "update", "ID required. Permanently alters a resource", "update folder 143 ..." });
    table.add_row({ "login", "Prompts for account username, pass, and then saves the auth", "login" });
    table.add_row({ "logout", "Clears the auth and destroys the session on the server", "logout" });
    table.add_row({ "quit", "Exits and any login information is lost", "quit" });
    table.add_row({ "help", "This message. Alt type `help resources` for a list of resources", "help resources" });
    std::cout << table << std::endl;
}

void showResources() {
    tabulate::Table table;
    auto first_row = table.add_row({ "resources", "info" });
    table.format().hide_border();
    first_row.format().font_color(tabulate::Color::yellow);

    table.add_row({ "users", "account information" });
    table.add_row({ "folders", "If signed in as a user, accesses folders for that account" });
    table.add_row({ "public-folders", "accesses publically available folders that\nusers can import to their account" });
    table.add_row({ "cards", "UUID card with a code" });
    table.add_row({ "card-models", "Card information. Each card points to an existing model." });

    std::cout << table << std::endl;
}

const char* getElementUnicode(const char* str) {
    if (strcasecmp("fire", str) == 0) {
        return utf8("🔥");
    }
    else if (strcasecmp("sword", str) == 0) {
        return utf8("⚔");
    }
    else if (strcasecmp("elec", str) == 0) {
        return utf8("⚡");
    }
    else if (strcasecmp("summon", str) == 0) {
        return utf8("▩");
    }
    else if (strcasecmp("cursor", str) == 0) {
        return utf8("⯐");
    }
    else if (strcasecmp("wind", str) == 0) {
        return utf8("☁️");
    }
    else if (strcasecmp("ice", str) == 0) {
        return utf8("❄");
    }
    else if (strcasecmp("plus", str) == 0) {
        return utf8("+");
    }
    else if (strcasecmp("wood", str) == 0) {
        return utf8("🌲");
    }
    else if (strcasecmp("break", str) == 0) {
        return utf8("⭙");
    }
    else if (strcasecmp("aqua", str) == 0) {
        return utf8("💧");
    }
    return utf8("-");
}

const bool authCheck(const WebAccounts::WebClient & client)
{
    if (!client.IsLoggedIn()) {
        std::cout << "Login with `login` command before accessing resources" << std::endl;
        return false;
    }

    return true;
}

void displayCardsResource(const Json::Value& data, bool detail) {
    tabulate::Table table;

    if (detail) {
        auto& f = table.add_row({ "code", "model ID", "name", "damage", "element", "image", "timestamp" }).format();
        f.background_color(tabulate::Color::blue);
        f.font_color(tabulate::Color::white);
        f.hide_border();
        table.column(3).format().multi_byte_characters(true);
        table.column(4).format().width(25);
        const auto item = data;

        table.add_row({
                        item["code"].asCString(),
                        item["detail"]["_id"].asCString(),
                        item["detail"]["name"].asCString(),
                        std::to_string(item["detail"]["damage"].asInt()).c_str(),
                        getElementUnicode(item["detail"]["element"].asCString()),
                        item["detail"]["image"].asCString(),
                        item["detail"]["timestamp"].asCString()
            });
    }
    else {
        auto& f = table.add_row({ "ID", "code" }).format();
        f.background_color(tabulate::Color::blue);
        f.font_color(tabulate::Color::white);
        f.hide_border();

        for (Json::ArrayIndex i = 0; i < data.size(); i++) {
            const auto item = data[i];

            table.add_row({ item["_id"].asCString(), item["code"].asCString() });
        }
    }

    std::cout << table << std::endl;
}

void displayCardModelsResource(const Json::Value& data) {
    tabulate::Table table;

    auto& f = table.add_row({ "codes", "model ID", "name", "damage", "element", "image", "timestamp" }).format();
    f.background_color(tabulate::Color::blue);
    f.font_color(tabulate::Color::white);
    f.hide_border();
    table.column(3).format().multi_byte_characters(true);
    table.column(4).format().width(25);
    const auto item = data;

    std::string codes;

    auto jsonCodes = item["codes"];
    for (auto c : jsonCodes) {
        codes += c.asString() + ", ";
    }

    table.add_row({
                    codes,
                    item["_id"].asCString(),
                    item["name"].asCString(),
                    std::to_string(item["damage"].asInt()).c_str(),
                    item["element"].asCString(),
                    item["image"].asCString(),
                    item["timestamp"].asCString()
        });

    std::cout << table << std::endl;
}
