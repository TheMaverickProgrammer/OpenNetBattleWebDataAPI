// ConsoleApplication.cpp : This file contains the 'main' function. Program execution begins and ends there.
//
#include <cctype>
#include <winsock2.h>
#include <tabulate/table.hpp>
#include <httplib/httplib.h>
#include <iostream>
#include <string>
#include <sstream>
#include <algorithm>
#include <iterator>
#include <json/json.h>
#include <string>

#define MAKE_API_URI(x) (std::string("/v1/") + x)

std::vector<std::string> split(const std::string& str, const char delim = ' ')
{
  auto cont = std::vector<std::string>();
  std::istringstream ss{ str };
  std::string token;
  while (getline(ss, token, delim)) {
    cont.push_back(token);
  }

  return cont;
}

template<typename StringList>
const bool matches(StringList& list, const char* match) {
  return (!strcasecmp(list[0].c_str(), match));
}

const bool matches(std::string& str, const char* match) {
  return (!strcasecmp(str.c_str(), match));
}

void login(httplib::Client& client) {
  std::string user, pass;

  std::cout << "user: ";
  std::getline(std::cin, user);

  std::cout << "pass: ";
  std::getline(std::cin, pass);
  client.set_basic_auth(user.c_str(), pass.c_str());
}

void help() {
  tabulate::Table table;
  table.add_row({ "command", "description", "example" });
  table.format().hide_border().font_color(tabulate::Color::yellow);

  table.add_row({ "view", "list all entries. If ID is given, list the contents of that ID.", "view users 19" });
  table.add_row({ "delete", "ID required. Permanently deletes a resource", "delete folder 143" });
  table.add_row({ "add", "adds an entry to a resource", "add chip ..." });
  table.add_row({ "update", "ID required. Permanently alters a resource", "update folder 143 ..." });
  table.add_row({ "login", "Prompts for account username, pass, and then saves the auth", "login" });
  table.add_row({ "quit", "Exits and any login information is lost", "quit" });

  std::cout << table << std::endl;

}
void handleGetRequest(httplib::Client& client, std::vector<std::string>& input) {

}

void handlePostRequest(httplib::Client& client, std::vector<std::string>& input) {

}

void handlePutRequest(httplib::Client& client, std::vector<std::string>& input) {

}

void handleDeleteRequest(httplib::Client& client, std::vector<std::string>& input) {

}

void handleViewRequest(httplib::Client& client, std::string& input) {
  input = MAKE_API_URI(input);

  std::cout << "Making request to \"" << input << "\"" << std::endl;

  auto res = client.Get(input.c_str());

  tabulate::Table table;
  auto& f = table.add_row({ "ID", "data" }).format();
  f.background_color(tabulate::Color::blue);
  f.font_color(tabulate::Color::white);
  f.hide_border();

  if (res) {

    Json::CharReaderBuilder builder;
    Json::CharReader* reader = builder.newCharReader();

    Json::Value json;
    std::string errors;

    bool parsingSuccessful = reader->parse(
      res->body.c_str(),
      res->body.c_str() + res->body.size(),
      &json,
      &errors
    );
    delete reader;

    if (!parsingSuccessful)
    {
      throw std::exception("could not read json");
    }
    
    const Json::Value arr = json["data"];

    for (int i = 0; i < arr.size(); i++) {
      const auto item = arr[i];

      table.add_row({ item["_id"].asCString(), item["code"].asCString() });
    }
  }
  else {
    throw std::runtime_error("http result was nullptr");
  }

  std::cout << table << std::endl;
}

void handleCommands(httplib::Client& client, std::string& input) {
  if (matches(input, "login")) {
    login(client); 
    return;
  }
  else if (matches(input, "help")) {
    help();
    return;
  }

  auto tokens = split(input);

  if (tokens.size() < 2) {
    std::cout << "type 'help' for commands" << std::endl;
    return;
  }

  auto url = MAKE_API_URI(input);
  auto res = client.Get(url.c_str());

  try {
    if (matches(tokens, "add")) {
      tokens.erase(tokens.begin());
      handlePostRequest(client, tokens);
    }
    else if (matches(tokens, "delete")) {
      tokens.erase(tokens.begin());
      handleDeleteRequest(client, tokens);
    }
    else if (matches(tokens, "update")) {
      tokens.erase(tokens.begin());
      handlePutRequest(client, tokens);
    }
    else if (matches(tokens, "view")) {
      tokens.erase(tokens.begin());
      handleViewRequest(client, tokens[0]);
    }
    else {
      std::cout << "unknown commmand '" << input << "'" << std::endl;
    }
  }
  catch (std::exception e) {
    tabulate::Table table;
    auto& f = table.add_row({ "status", "body" }).format();
    table.add_row({ "internal error", e.what() });
    f.background_color(tabulate::Color::red);
    f.font_color(tabulate::Color::white);

    std::cout << table  << std::endl;;
  }
}

int main()
{
  std::string domain = "battlenetwork.io";
  int port = 3000;

  httplib::Client client(domain.c_str(), port);

  std::cout << "Connecting to " << domain << ":" << std::to_string(port) << "..." << (client.is_valid()? "OK" : "FAILED") << std::endl;
  std::string input;

  while (std::getline(std::cin, input) && strcasecmp(input.c_str(), "quit")) {
    handleCommands(client, input);
  }

  std::cout << "Goodbye" << std::endl;

  return 0;
}