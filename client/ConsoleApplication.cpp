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
#include <conio.h>

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

std::vector<std::string> split_preserve_quotes(const std::string& str, const char delim = ' ') {
  auto cont = std::vector<std::string>();

  std::string build;
  bool quoted = false;

  for (auto iter = str.begin(); iter != str.end();) {
    if (*iter == delim && !quoted) {
      cont.push_back(build);
      build.clear();
      iter++;  continue;
    }
    else if (*iter == '\"') {
      quoted = !quoted;
    }

    build += *iter;
    iter++;
  }

  if (build.size()) {
    cont.push_back(build);
  }
  return cont;
}

#if defined(_MSC_VER) && _MSC_VER > 1310
// Visual C++ 2005 and later require the source files in UTF-8, and all strings 
// to be encoded as wchar_t otherwise the strings will be converted into the 
// local multibyte encoding and cause errors. To use a wchar_t as UTF-8, these 
// strings then need to be convert back to UTF-8. This function is just a rough 
// example of how to do this.
# define utf8(str)  ConvertToUTF8(L##str)
const char * ConvertToUTF8(const wchar_t * pStr) {
  static char szBuf[1024];
  WideCharToMultiByte(CP_UTF8, 0, pStr, -1, szBuf, sizeof(szBuf), NULL, NULL);
  return szBuf;
}
#else
// Visual C++ 2003 and gcc will use the string literals as is, so the files 
// should be saved as UTF-8. gcc requires the files to not have a UTF-8 BOM.
# define utf8(str)  str
#endif

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
  char input[256];
  std::stringstream ss(input);

  char c = 0;
  size_t idx = 0;
  do {
    c = _getch();
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
  input[idx] = '\0';

  std::getline(ss, pass);
  client.set_basic_auth(user.c_str(), pass.c_str());
}

void help() {
  tabulate::Table table;
  auto first_row = table.add_row({ "command", "description", "example" });
  table.format().hide_border();
  first_row.format().font_color(tabulate::Color::yellow);

  table.add_row({ "view", "list all entries. If ID is given, list the contents of that ID.", "view users 19" });
  table.add_row({ "delete", "ID required. Permanently deletes a resource", "delete folder 143" });
  table.add_row({ "add", "adds an entry to a resource", "add chip ..." });
  table.add_row({ "update", "ID required. Permanently alters a resource", "update folder 143 ..." });
  table.add_row({ "login", "Prompts for account username, pass, and then saves the auth", "login" });
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
  table.add_row({ "chips", "chip information" });
  table.add_row({ "admin", "Only admin can create other admins" });

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

void displayChipsResource(const Json::Value& data, bool detail = false) {
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
                    item["detail"]["element"].asCString(),
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

void displayChipsModelResource(const Json::Value& data) {
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

void handlePostRequest(httplib::Client& client, std::vector<std::string>& input) {
  std::string uri;
  std::string resource = input[0];

  if (!(
    matches(resource, "chips")
    || matches(resource, "users")
    || matches(resource, "folders")
    || matches(resource, "public-folders")
    || matches(resource, "admin")
    )) {
    std::string message = (std::string("unknown resource ") + resource);
    message += "\nType `help resources` for a list of resources";
    throw std::exception(message.c_str());
  }

  uri = MAKE_API_URI(resource);

  //uri += '?';

  std::string params;

  for (int i = 1; i < input.size(); i++) {
    auto tokens = split(input[i], '=');

    if (tokens.size() != 2) {
      std::string message = "Token " + input[i] + " did not contain a key-value pair separated by \"=\"\nRequest aborted.";
      throw std::exception(message.c_str());
    }

    params += input[i] + "&";
  }

  std::cout << "Making request to \"" << uri << "\"";

  auto res = client.Post(uri.c_str(), params, "application/x-www-form-urlencoded");

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
      std::cout << std::endl;
      throw std::exception("could not read json");
    }

    const Json::Value error = json["error"];

    if (error.size()) {
      std::cout << std::endl;
      std::string message;
      bool isChain = false; // whether or not we need to accumulate all messages;

      auto members = error.getMemberNames();
      for (auto& m : members) {
        if (m == "errors") {
          isChain = true;
        }
      }

      if (isChain) {
        for (auto& m : error["errors"]) {
          message += m["message"].asString() + "\n";
        }
      }
      else {
        message = error["message"].asString();
      }

      std::cout << std::endl;
      throw std::exception(message.c_str());
    }

    const Json::Value arr = json["data"];
    tabulate::Table results;
    int size = arr.size();

    if (size > 0) size -= 1; // json value returns +1 results for the table header
    auto& f = results.add_row({ std::to_string(size) + " results" }).format();
    f.background_color(tabulate::Color::blue);
    f.font_color(tabulate::Color::white);
    f.hide_border();

    std::cout << "..." << results << std::endl;

    if (resource == "chips") {
      displayChipsResource(arr, input.size() != 1);
    }
  }
  else {
    std::cout << std::endl;
    throw std::runtime_error("http result was nullptr");
  }
}

void handlePutRequest(httplib::Client& client, std::vector<std::string>& input) {
  std::string uri;
  std::string resource = input[0];

  if (!(
    matches(resource, "chips")
    || matches(resource, "users")
    || matches(resource, "folders")
    || matches(resource, "public-folders")
    || matches(resource, "admin")
    )) {
    std::string message = (std::string("unknown resource ") + resource);
    message += "\nType `help resources` for a list of resources";
    throw std::exception(message.c_str());
  }

  if (input.size() < 2) {
    throw std::exception("provide an ID of the resource you want to update");
  }

  uri = MAKE_API_URI(resource);

  uri += "/" + input[1];

  std::string params;

  for (int i = 2; i < input.size(); i++) {
    auto tokens = split(input[i], '=');

    if (tokens.size() != 2) {
      std::string message = "Token " + input[i] + " did not contain a key-value pair separated by \"=\"\nRequest aborted.";
      throw std::exception(message.c_str());
    }

    params += input[i] + "&";
  }

  std::cout << "Making request to \"" << uri << "\"";

  auto res = client.Put(uri.c_str(), params, "application/x-www-form-urlencoded");

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
      std::cout << std::endl;
      throw std::exception("could not read json");
    }

    const Json::Value error = json["error"];

    if (error.size()) {
      std::cout << std::endl;
      std::string message;
      bool isChain = false; // whether or not we need to accumulate all messages;

      auto members = error.getMemberNames();
      for (auto& m : members) {
        if (m == "errors") {
          isChain = true;
        }
      }

      if (isChain) {
        for (auto& m : error["errors"]) {
          message += m["message"].asString() + "\n";
        }
      }
      else {
        try {
          message = error["message"].asString();
        }
        catch (...) {
          message = error.asString();
        }
      }

      std::cout << std::endl;
      throw std::exception(message.c_str());
    }

    const Json::Value arr = json["data"];
    tabulate::Table results;
    int size = arr.size();

    if (size > 0) size -= 1; // json value returns +1 results for the table header
    auto& f = results.add_row({ std::to_string(size) + " results" }).format();
    f.background_color(tabulate::Color::blue);
    f.font_color(tabulate::Color::white);
    f.hide_border();

    std::cout << "..." << results << std::endl;

    if (resource == "chips") {
      displayChipsModelResource(arr);
    }
  }
  else {
    std::cout << std::endl;
    throw std::runtime_error("http result was nullptr");
  }
}

void handleDeleteRequest(httplib::Client& client, std::vector<std::string>& input) {
  std::string uri;
  std::string resource = input[0];

  if (!(
    matches(resource, "chips")
    || matches(resource, "users")
    || matches(resource, "folders")
    || matches(resource, "public-folders")
    || matches(resource, "admin")
    )) {
    std::string message = (std::string("unknown resource ") + resource);
    message += "\nType `help resources` for a list of resources";
    throw std::exception(message.c_str());
  }

  if (input.size() < 2) {
    throw std::exception("provide an ID of the resource you want to delete");
  }

  uri = MAKE_API_URI(resource);

  uri += "/" + input[1];

  std::cout << "Making request to \"" << uri << "\"";

  auto res = client.Delete(uri.c_str());

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
      std::cout << std::endl;
      throw std::exception("could not read json");
    }

    const Json::Value error = json["error"];

    if (error.size()) {
      std::cout << std::endl;
      std::string message;
      bool isChain = false; // whether or not we need to accumulate all messages;

      auto members = error.getMemberNames();
      for (auto& m : members) {
        if (m == "errors") {
          isChain = true;
        }
      }

      if (isChain) {
        for (auto& m : error["errors"]) {
          message += m["message"].asString() + "\n";
        }
      }
      else {
        message = error["message"].asString();
      }

      std::cout << std::endl;
      throw std::exception(message.c_str());
    }

    const Json::Value arr = json["data"];
    tabulate::Table results;
    int size = arr.size();

    if (size > 0) size -= 1; // json value returns +1 results for the table header
    auto& f = results.add_row({ std::to_string(size) + " results" }).format();
    f.background_color(tabulate::Color::blue);
    f.font_color(tabulate::Color::white);
    f.hide_border();

    std::cout << "..." << results << std::endl;

    if (resource == "chips") {
      displayChipsResource(arr, input.size() != 1);
    }
  }
  else {
    std::cout << std::endl;
    throw std::runtime_error("http result was nullptr");
  }
}

void handleViewRequest(httplib::Client& client, std::vector<std::string>& input) {
  std::string uri;
  std::string resource = input[0];

  if (!( 
    matches(resource, "chips") 
    || matches(resource, "users")
    || matches(resource, "folders")
    || matches(resource, "public-folders")
    || matches(resource, "admin")
      )) {
    std::string message = (std::string("unknown resource ") + resource);
    message += "\nType `help resources` for a list of resources";
    throw std::exception(message.c_str());
  }

  if (input.size() == 1) {
    uri = MAKE_API_URI(resource);
  }
  else {
    // _id
    uri = MAKE_API_URI(resource + "/" + input[1]);
  }

  std::cout << "Making request to \"" << uri << "\"";

  auto res = client.Get(uri.c_str());

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
      std::cout << std::endl;
      throw std::exception("could not read json");
    }
    
    const Json::Value arr = json["data"];
    tabulate::Table results;
    int size = arr.size();

    if (size > 0) size -= 1; // json value returns +1 results for the table header
    auto& f = results.add_row({ std::to_string(size) + " results" }).format();
    f.background_color(tabulate::Color::blue);
    f.font_color(tabulate::Color::white);
    f.hide_border();

    std::cout << "..." << results << std::endl;

    if (resource == "chips") {
      displayChipsResource(arr, input.size() != 1);
    }
  }
  else {
    std::cout << std::endl;
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
  else if (matches(input, "help resources")) {
    showResources();
    return;
  }

  auto tokens = split_preserve_quotes(input);

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
      handleViewRequest(client, tokens);
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