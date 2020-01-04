// ConsoleApplication.cpp : This file contains the 'main' function. Program execution begins and ends there.
//

//#include <tabulate/table.hpp>
#include <httplib/httplib.h>
#include <iostream>
#include <string>
#include <sstream>
#include <algorithm>
#include <iterator>

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
  std::cout << "commands are: view <RESOURCES>/:ID?, delete <RESOURCES>/:ID?, add <RESOURCES> <BODY>, update <RESOURCES>/:ID, login" << std::endl;
  std::cout << "resources are: users, chips, folders, public-folders, admins" << std::endl;
  std::cout << "type QUIT to quit" << std::endl;
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

  std::cout << "Making request to " << input << "\"" << std::endl;

  auto res = client.Get(input.c_str());

  if (res) {
    std::cout << res->status << " -> " << res->body << std::endl;
  }
  else {
    throw std::runtime_error("http result was nullptr");
  }
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
    std::cout << "There was an error making the request: " << e.what() << std::endl;;
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