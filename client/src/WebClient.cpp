#include "WebAPI/WebClient.h"

#include <httplib.h>
#include <json/json.h>

#ifdef __ANDROID__
#define USE_STRCPY_S 1
#endif

#ifdef __APPLE__
#define USE_STRCPY_S 1
#endif

#ifndef USE_STRCPY_S
#define USE_STRCPY_S 0
#endif

#if USE_STRCPY_S == 0
#define XPLATFORM_STRCPY(dest, len, src) strcpy_s(dest, len, src)
#else
#define XPLATFORM_STRCPY(dest, len, src) strcpy(dest, src)
#endif

namespace WebAccounts {
    /*! \brief Private implementation of the WebClient class so using the client is as easy as including the header file*/
    class WebClientPimpl {
    public:        /*! \brief constructor creates a httplib client connection with a domain and port*/
        WebClientPimpl(WebClient* parent, const char* domain, int port);

        /*! \brief destructor cleans up httplib client */
        ~WebClientPimpl();

    private:
        httplib::Client* client{ nullptr }; //!< HTTP client
        WebClient* parent{ nullptr }; //!< pointer to public-facing WebClient object

        /*! \brief loads the byte buffer with image data of a card to be rendered by a graphics API
            \param card. A Card with a valid ID.
            \param imageBuffer. A byte buffer that will contain the image data.
            \return true if the image data was found on the API and is non-null

            If no valid card or associated card model is found, the operation returns false
            If this op is false, imageBuffer is in an invalid state.
            Even if the op is true, imageBuffer may not contain any graphics data (null)
        */
        const bool GetImageForCard(Card card, byte* imageBuffer);

        /*! \brief loads the byte buffer with icon data of a card to be rendered by a graphics API
            \param card. A Card with a valid ID.
            \param iconBuffer. A byte buffer that will contain the icon data.
            \return true if the icon data was found on the API and is non-null

            If no valid card or associated card model is found, the operation returns false
            If this op is false, iconBuffer is in an invalid state.
            Even if the op is true, iconBuffer may not contain any graphics data (null)
        */
        const bool GetIconForCard(Card card, byte* iconBuffer);

        /*! \brief Will log HTTP errors based on their code to the errors member object*/
        void ParseStatusError(const std::string& url, int code);

        /*! \brief Parses the JSON object that has an "error" key
            \param json. A Json::Value object reference that has an "error" key.
            \return returns the size of all parsed errors

            Error object may contain multiple errors and so we parse those and add those
            to our log for later.
        */
        const size_t ParseErrors(const Json::Value& json);

        /*! \brief Will try to download card props model with the ID & stores the data in our out-argument
            \param id. String ID of the card props model to download from the API
            \param model. A card props structure to fill in from remote data

            If the request fails it is logged to the member `errors` object

            Returns true if card is downloaded successfully. False if there were errors.
        */
        const bool FetchCardProperties(const std::string& id, CardProperties& model);

        /*! \brief Will try to download card combo model with the ID & stores the data in our out-argument
            \param id. String ID of the card combo model to download from the API
            \param model. A card combo structure to fill in from remote data

            If the requests fails it is logged to the member `errors` object

            Returns true if combo is downloaded successfully. False if there were errors.
        */
        const bool FetchCardCombo(const std::string& id, CardCombo& model);

        /*! \brief This will parse JSON data for the folder and return a filled-out Folder object with downloaded cards
            \param data. The JSON to interpret.
            \param folder. The out-argument to fill out from data.

            This will assign the out-argument `folder` with data from JSON
            It will also attempt to download card data or use the cache if possible

            \warning This does not gaurantee that folder data is correct. This should be used as an auxillary function.
        */
        void DigestFolderData(const Json::Value& data, Folder& folder);

        /*! \brief This will parse JSON data for the combo and return a filled-out CardCombo object with downloaded cards
            \param data. The JSON to interpret.
            \param combo. The out-argument to fill out from data.

            This will assign the out-argument `combo` with data from JSON
            It will also attempt to download card data or use the cache if possible

            \warning This does not gaurantee that combo data is correct. This should be used as an auxillary function.
        */
        void DigestCardComboData(const Json::Value& data, CardCombo& combo);

    public:
        /*! \brief return the httplib client ptr used by this private implemenation*/
        httplib::Client* GetClient() const;

        /*! \brief Given a URL path, will append the proper URI versioning the API uses*/
        const std::string MakeVersionURI(std::string path) const;

        /* \brief Will try to login, collect the userId of the account, and return the status of the attempt
           \param userId. The destination for the userId returned by the account login. If failed, do not use.

           \return True if login was successful. False otherwise.
        */
        const bool Login(std::string& userId);

        /*! \brief Adds a local folder (new folder) to the remote folder
            \param from. A Folder object containing a list of cards to push to our account.

            Any errors are pushed to the member variable `errors`

            POST: the folder object will recieve a new ID from the server
        */
        void AddFolderToAccount(Folder& from);

        /*! \brief Will send a delete folder request from our account

            \warning Currently does not test for errors
        */
        void RemoveFolderFromAccount(const std::string& id);

        /*! \brief Update a folder on our account from our local folder state
            \param from. The local folder we are syncing to remote.

            \warning Currently does not test for errors
        */
        void UpdateFolderOnAccount(Folder& from);

        /*! \brief This will download all folders attached to this account and return them in the out-argument
            \param folders. The Folder data on this account. May be empty due to failed attempt.
            \param since. The millisecond timestamp to search for updates instead of returning all folder.
            \return True if the request was successful and parsing was also succesful. False otherwise.

            Errors are logged in the `errors` member object
        */
        const bool DownloadFolders(AccountState::FolderCache& folders, long long since);

        /*! \brief This will download all card combos in the database and return them in the out-argument
            \param combos. The card combo data. May be empty due to failed attempt.
            \param since. The milliseocnd timestamp to search for updates instead of returning all combos.
            \return True if the request was successful and parsing was also succesful. False otherwise.

            Errors are logged in the `errors` member object
        */
        const bool DownloadCardCombos(AccountState::CardComboCache& combos, long long since);

        /*! \brief Will try to download a card with the ID and stores the data in our out-argument
            \param id. String ID of the card to download from the API
            \param card. A card structure to fill in from remote data

            If the request fails it is logged to the member `errors` object

            Returns true if card is downloaded successfully. False if there were errors.
        */
        const bool FetchCard(const std::string& id, Card& card);

        /*! \brief Will merge the difference from dest cache and src cache 
            \param dest. The destination cache. Difference in folders and content will be added here.
            \param src. The source cache. We compare the folders and content with dest before merging.

            If the dest cache does not contain a folder from src, that folder is added
            If the dest cache does contain a folder from src, the card contents are merged.
        */
        void MergeFolderCache(AccountState::FolderCache& dest, AccountState::FolderCache& src);

        /*! \brief Will reach the endpoint that returns codes on a transaction*/
        PurchaseResult PurchaseProductImpl(const std::string& uuid);

        /*! \brief Will update the card pool and monies on the user table as reflected by the server
            \param destPool. The destination container to store the cards in the pool
            \param destMonies. The destination unsigned 32bit location to store the monies value
        */
        void FetchCardPoolAndMonies(std::vector<std::string>& destPool, uint32_t& destMonies);

        /*! \brief Will merge local pool data from remote pool data
            \param dest. The destination container. Difference in pools will be added here.
            \param src. The source container. We compare the folders and content with dest before merging.
            
            If the dest does not contain a card from src, that card is added*/
        void MergeCardPool(std::vector<std::string>& dest, const std::vector<std::string>& src);

        /*! \brief Will reach the endpoint that returns codes on a transaction
            \param dest. The destination container to store the key items
        */
        void FetchKeyItems(std::vector<KeyItem>& dest);

        /*! \brief Will download public-api fields set by the web api's server-settings.json file
        */
        void FetchServerSettings(ServerSettings& settings);
    };

    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                 WEB CLIENT IMPLEMENTATION                                            //
    //////////////////////////////////////////////////////////////////////////////////////////////////////////

    WebClient::WebClient(const char* version, const char* domain, int port) {
        size_t len = strlen(version);
        this->version = new char[len + 1];
        XPLATFORM_STRCPY(this->version, len + 1, version);
        this->version[len] = '\0';

        len = strlen(domain);
        this->domain = new char[len + 1];
        XPLATFORM_STRCPY(this->domain, len + 1, domain);
        this->domain[len] = '\0';

        this->port = port;
        isOk = 1;
        isLoggedIn = 0;

        privImpl = new WebClientPimpl(this, domain, port);
    }

    WebClient::~WebClient() {
        delete this->version;
        delete this->domain;
        delete privImpl;
    }

    const AccountState& WebClient::GetLocalAccount() const { return local; }

    const bool WebClient::Login(const char* user, const char* pass) {
        httplib::Client* client = privImpl->GetClient();

        if (!client) return false;

        client->set_basic_auth(user, pass);

        isLoggedIn = privImpl->Login(local.userId);

        return isLoggedIn;
    }

    void WebClient::LogoutAndReset() {
        httplib::Client* client = privImpl->GetClient();

        if (!client) return;

        auto res = client->Get(privImpl->MakeVersionURI("logout").c_str());

        if (res && res->status == 200) {
          isLoggedIn = false;
          client->set_basic_auth("", "");
          local = AccountState{};
        }
    }

    void WebClient::AddCard(const Card& card, Folder& folder) {
        folder.cards.push_back(card.id);

        if (folder.mode != Folder::RemoteActionMode::DESTROY) {
            folder.mode = Folder::RemoteActionMode::UPDATE;
        }
    }

    void WebClient::RemoveCard(const Card& card, Folder& folder) {
        auto iter = std::find(folder.cards.begin(), folder.cards.end(), card.id);
        folder.cards.erase(iter);

        if (folder.mode != Folder::RemoteActionMode::DESTROY) {
            folder.mode = Folder::RemoteActionMode::UPDATE;
        }
    }

    void WebClient::AddFolder(const Folder& folder) {
        if (local.folders.find(folder.id) != local.folders.end()) return;

        if (folder.mode != Folder::RemoteActionMode::DESTROY) {
            auto&& [iter, ignore] = local.folders.insert(std::make_pair(folder.name, std::make_shared<Folder>(folder)));
            iter->second->mode = Folder::RemoteActionMode::UPDATE;
        }
    }

    void WebClient::RemoveFolder(const Folder& folder) {
        auto iter = local.folders.find(folder.id);
        if (iter == local.folders.end()) return;

        iter->second->mode = Folder::RemoteActionMode::DESTROY;
    }

    void WebClient::FetchAccount(long long since) {
        privImpl->FetchServerSettings(this->serverSettings);

        this->local.lastFetchTimestamp = since; // override this timestamp

        AccountState::FolderCache folders;
        AccountState::CardComboCache combos;

        if (privImpl->DownloadFolders(folders, this->local.lastFetchTimestamp)) {
            privImpl->MergeFolderCache(this->local.folders, folders);
        }

        privImpl->DownloadCardCombos(combos, this->local.lastFetchTimestamp);

        std::vector<std::string> cardPool;
        uint32_t monies{};
        privImpl->FetchCardPoolAndMonies(cardPool, monies);
        privImpl->MergeCardPool(this->local.cardPool, cardPool);
        privImpl->FetchKeyItems(this->local.keyItems);
        this->local.monies = monies;

        // update our last fetch time
        using namespace std::chrono;
        this->local.lastFetchTimestamp = system_clock::now().time_since_epoch().count();
    }

    const bool WebClient::FetchCard(const std::string& uuid) {
        WebAccounts::Card card;
        return privImpl->FetchCard(uuid, card);
    }

    void WebClient::PushAccount() {
        auto iter = local.folders.begin();

        std::vector<std::string> toErase;

        while (iter != local.folders.end()) {
            switch (iter->second->mode) {
            case Folder::RemoteActionMode::UPDATE:
                privImpl->UpdateFolderOnAccount(*iter->second);
                break;
            case Folder::RemoteActionMode::CREATE:
                privImpl->AddFolderToAccount(*iter->second);
                break;
            case Folder::RemoteActionMode::DESTROY:
                toErase.push_back(iter->second->name);
                privImpl->RemoveFolderFromAccount(iter->second->id);
                break;
            default:
                { /* do Nothing */ }
                break;
            }

            iter++;
        }

        for (auto& e : toErase) {
            local.folders.erase(e);
        }
    }

    PurchaseResult WebClient::PurchaseProduct(const std::string& uuid)
    {
      return privImpl->PurchaseProductImpl(uuid);
    }

    void WebClient::GenerateMask()
    {
      httplib::Client* client = privImpl->GetClient();

      if (!client) return;

      auto res = client->Get(privImpl->MakeVersionURI("/mask").c_str());

      if (res && res->status == 200) {
        local.mask = res->body;
      }
    }

    const bool WebClient::IsOK() {
        httplib::Client* client = privImpl->GetClient();

        if (!client) {
            isOk = false;
            return isOk;
        }

        auto res = client->Get("/heartbeat");

        isOk = (res ? res->status == 200 : false);

        return (bool)isOk;
    }

    const bool WebClient::IsLoggedIn() const {
        return isLoggedIn;
    }

    const bool WebClient::GetNextError(char** str) {
        if (errors.empty()) return false;

        auto first = errors.back();
        errors.pop_back();

        *str = new char[first.length() + 1];

        XPLATFORM_STRCPY(*str, first.length() + 1, first.data());
        (*str)[first.length()] = '\0';

        // true if there was an error message
        return true;
    }

    void WebClient::ClearErrors() {
        errors.clear();
    }

    void WebClient::SetDownloadImageHandler(const DownloadImageHandler& callback) {
        downloadImageHandler = callback;
    }

    const ServerSettings& WebClient::GetServerSettings() const
    {
      return this->serverSettings;
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                    PRIVATE IMPLEMENTATION                                            //
    //////////////////////////////////////////////////////////////////////////////////////////////////////////

    WebClientPimpl::WebClientPimpl(WebClient* parent, const char* domain, int port) : 
      parent(parent) {
        client = new httplib::Client(domain, port);
    }

    WebClientPimpl::~WebClientPimpl() {
        if (client) {
            delete client; client = nullptr;
        }
    }

    const bool WebClientPimpl::Login(std::string& userId)
    {
      try {
        const std::string url = MakeVersionURI("login");
        auto res = client->Get(url.c_str());

        if (res) {
          if (res->status == 200) {
            Json::CharReaderBuilder builder;
            Json::CharReader* reader = builder.newCharReader();

            Json::Value json;
            std::string error;

            bool parsingSuccessful = reader->parse(
              res->body.c_str(),
              res->body.c_str() + res->body.size(),
              &json,
              &error
            );
            delete reader;

            if (parsingSuccessful && ParseErrors(json) == 0) {
              parent->errors.push_back(json.asString());
              Json::Value data = json["data"];
              Json::Value user = data["user"];
              userId = user["userId"].asString();
              return true;
            }
            else {
              parent->errors.push_back(error);
            }
          }
          else {
            ParseStatusError(url, res->status);
          }
        }
        else {
          parent->errors.push_back("GET response for Login was nullptr");
        }
      }
      catch (std::exception& e) {
        parent->errors.push_back(e.what());
      }

      return false;
    }

    httplib::Client* WebClientPimpl::GetClient() const {
        return this->client;
    }

    const bool WebClientPimpl::GetImageForCard(Card card, byte* imageBuffer) {
        imageBuffer = 0;

        if (card.id.empty()) return false;

        // Query the API if we don't have this card data filled
        if (card.modelId.empty()) {
            if (!this->FetchCard(card.id, card))
                return false; // Nothing we can do
        }

        CardProperties model;

        // Query the API if we don't have this model data
        if (!this->FetchCardProperties(card.modelId, model))
            return false;

        imageBuffer = model.imageData;
        return imageBuffer; // non-null data will be true
    }

    const bool WebClientPimpl::GetIconForCard(Card card, byte* iconBuffer) {
        iconBuffer = 0;

        if (card.id.empty()) return false;

        // Query the API if we don't have this card data filled
        if (card.modelId.empty()) {
            if (!this->FetchCard(card.id, card))
                return false; // Nothing we can do
        }

        CardProperties model;

        // Query the API if we don't have this model data
        if (!this->FetchCardProperties(card.modelId, model))
            return false;

        iconBuffer = model.iconData;
        return iconBuffer; // non-null data will be true
    }

    void WebClientPimpl::ParseStatusError(const std::string& url, int code) {
        parent->errors.push_back("Error reaching URL \"" + url + "\"");

        switch (code) {
        case 401:
            parent->errors.push_back("[401] User is not authenticated (is the client logged in?)");
            break;
        case 500:
            parent->errors.push_back("[500] There was a problem communicating with the server");
            break;
        default:
            parent->errors.push_back("Unknown error code: " + std::to_string(code));
        }
    }

    const size_t WebClientPimpl::ParseErrors(const Json::Value& json) {
        const Json::Value error = json["error"];

        if (error.size()) {
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

            parent->errors.push_back(message);
            return (size_t)error.size();
        }

        return 0;
    }

    void WebClientPimpl::AddFolderToAccount(Folder& from) {
        httplib::Params params;
        params.insert(std::make_pair("name", from.name));

        for (auto cardID : from.cards) {
            params.insert(std::make_pair("cards", cardID));
        }

        std::string url = MakeVersionURI("folders");
        auto res = client->Post(url.c_str(), params);

        if (res) {
            if (res->status == 200) {
                // Get new folder ID
                Json::CharReaderBuilder builder;
                Json::CharReader* reader = builder.newCharReader();

                Json::Value json;
                std::string error;

                bool parsingSuccessful = reader->parse(
                    res->body.c_str(),
                    res->body.c_str() + res->body.size(),
                    &json,
                    &error
                );
                delete reader;

                if (parsingSuccessful && ParseErrors(json) == 0) {
                    Json::Value data = json["data"];

                    from.id = json["_id"].asString();
                }
                else {
                    parent->errors.push_back(error);
                }
            }
            else {
                ParseStatusError(url, res->status);
            }
        }
        else {
            parent->errors.push_back("POST response for AddFolderToAccount was nullptr");
        }
    }

    void WebClientPimpl::RemoveFolderFromAccount(const std::string& id) {
        client->Delete(MakeVersionURI("folders/" + id).c_str());
    }

    void WebClientPimpl::UpdateFolderOnAccount(Folder& from) {
        httplib::Params params;
        params.insert(std::make_pair("name", from.name));

        for (auto cardID : from.cards) {
            params.insert(std::make_pair("cards", cardID));
        }

        auto res = client->Put(MakeVersionURI("folders/" + from.id).c_str(), params);
    }

    const std::string WebClientPimpl::MakeVersionURI(std::string path) const {
        return std::string("/v") + parent->version + "/" + path;
    }

    const bool WebClientPimpl::FetchCard(const std::string& id, Card& card) {
        if (id.empty()) return false;

        auto iter = parent->local.cards.find(id);
        if (iter != parent->local.cards.end()) {
            card = *iter->second;
            return true;
        }

        try {
            const std::string url = MakeVersionURI(std::string("cards/") + id);
            auto res = client->Get(url.c_str());

            if (res) {
                if (res->status == 200) {
                    Json::CharReaderBuilder builder;
                    Json::CharReader* reader = builder.newCharReader();

                    Json::Value json;
                    std::string error;

                    bool parsingSuccessful = reader->parse(
                        res->body.c_str(),
                        res->body.c_str() + res->body.size(),
                        &json,
                        &error
                    );
                    delete reader;

                    if (parsingSuccessful && ParseErrors(json) == 0) {
                        Json::Value data = json["data"];

                        // NOTE: I did pre-optimization on the RESTFUL web server HTTP endpoint
                        //       and forgot about it. This makes the 2nd fetch redundant...
                        card.modelId = data["detail"]["_id"].asString();
                        card.code = data["code"].asString()[0];
                        card.id = id;

                        // cache it
                        parent->local.cards.insert(std::make_pair(card.id, std::make_shared<Card>(card)));

                        // See if we need to download the model for this card too
                        CardProperties model;
                        FetchCardProperties(card.modelId, model);
                    }
                    else {
                        parent->errors.push_back(error);
                    }

                    return true;
                }
                else {
                    ParseStatusError(url, res->status);
                }
            }
            else {
                parent->errors.push_back("GET response for FetchCard was nullptr");
            }
        }
        catch (std::exception & e) {
            parent->errors.push_back(e.what());
        }

        return false;
    }

    void WebClientPimpl::MergeFolderCache(AccountState::FolderCache& dest, AccountState::FolderCache& src)
    {
      for (auto&& iter : src) {
        auto&& destIter = dest.find(iter.first);

        if (destIter != dest.end()) {
          // We have this folder. Merge the updated cards.
          auto& v1 = destIter->second->cards;
          auto& v2 = iter.second->cards;

          // We want our diff set to be the same type but non-reference
          std::remove_reference<decltype(v2)>::type dif;

          std::set_difference(v1.begin(), v1.end(), v2.begin(), v2.end(), std::inserter(dif, dif.begin()));

          for (auto&& cards : dif) {
            destIter->second->cards.push_back(cards);
          }
        }
        else {
          // We do not have this folder. Add it to destination.
          dest.insert(std::make_pair(iter.first, iter.second));
        }
      }
    }

    PurchaseResult WebClientPimpl::PurchaseProductImpl(const std::string& uuid)
    {
      if (!client) return PurchaseResult::network_error;

      httplib::Params params; // empty
      auto res = client->Post(MakeVersionURI("/product/purchase/" + uuid).c_str(), params);

      if (!res) {
        return PurchaseResult::network_error;
      }

      if (res->status != 200) {
        Json::CharReaderBuilder builder;
        Json::CharReader* reader = builder.newCharReader();

        Json::Value json;
        std::string error;

        bool parsingSuccessful = reader->parse(
          res->body.c_str(),
          res->body.c_str() + res->body.size(),
          &json,
          &error
        );
        delete reader;

        // normally we want to check for errors in our parse result
        // but in this endpoint we want to know about the errors
        // because they return specific codes...
        if (parsingSuccessful) {
          Json::Value value = json["code"];
          Json::UInt juint = value.asUInt();
          return static_cast<PurchaseResult>(juint);
        }

        parent->errors.push_back(error);
      }

      return PurchaseResult::success;
    }

    void WebClientPimpl::FetchCardPoolAndMonies(std::vector<std::string>& destPool, uint32_t& destMonies)
    {
      try {
        const std::string url = MakeVersionURI("users/"+parent->local.userId);
        auto res = client->Get(url.c_str());

        if (res) {
          if (res->status == 200) {
            Json::CharReaderBuilder builder;
            Json::CharReader* reader = builder.newCharReader();

            Json::Value json;
            std::string error;

            bool parsingSuccessful = reader->parse(
              res->body.c_str(),
              res->body.c_str() + res->body.size(),
              &json,
              &error
            );
            delete reader;

            if (parsingSuccessful && ParseErrors(json) == 0) {
              Json::Value data = json["data"];

              for (auto&& item : data["pool"]) {
                destPool.push_back(item.asString());
              }

              Json::Value monies = data["monies"];
              destMonies = static_cast<uint32_t>(monies.asUInt());
            }
            else {
              parent->errors.push_back(error);
            }
          }
          else {
            ParseStatusError(url, res->status);
          }
        }
        else {
          parent->errors.push_back("GET response for GetUserByID was nullptr");
        }
      }
      catch (std::exception& e) {
        parent->errors.push_back(e.what());
      }
    }

    void WebClientPimpl::MergeCardPool(std::vector<std::string>& dest, const std::vector<std::string>& src)
    {
      // TODO
    }

    void WebClientPimpl::FetchKeyItems(std::vector<KeyItem>& dest)
    {
      try {
        const std::string url = MakeVersionURI(std::string("keyitems/owned"));
        auto res = client->Get(url.c_str());

        if (res) {
          if (res->status == 200) {
            Json::CharReaderBuilder builder;
            Json::CharReader* reader = builder.newCharReader();

            Json::Value json;
            std::string error;

            bool parsingSuccessful = reader->parse(
              res->body.c_str(),
              res->body.c_str() + res->body.size(),
              &json,
              &error
            );
            delete reader;

            if (parsingSuccessful && ParseErrors(json) == 0) {
              Json::Value data = json["data"];
              
              for (auto&& item : data) {
                Json::String name = item["name"].asString();
                Json::String desc = item["description"].asString();

                dest.emplace_back(KeyItem{ name, desc });
              }
            }
            else {
              parent->errors.push_back(error);
            }
          }
          else {
            ParseStatusError(url, res->status);
          }
        }
        else {
          parent->errors.push_back("GET response for GetOwnedKeyItemsList was nullptr");
        }
      }
      catch (std::exception& e) {
        parent->errors.push_back(e.what());
      }
    }

    void WebClientPimpl::FetchServerSettings(ServerSettings& settings)
    {
      try {
        const std::string url = MakeVersionURI(std::string("settings/comboIconURL"));
        auto res = client->Get(url.c_str());

        if (res) {
          if (res->status == 200) {
            Json::CharReaderBuilder builder;
            Json::CharReader* reader = builder.newCharReader();

            Json::Value json;
            std::string error;

            bool parsingSuccessful = reader->parse(
              res->body.c_str(),
              res->body.c_str() + res->body.size(),
              &json,
              &error
            );
            delete reader;

            if (parsingSuccessful && ParseErrors(json) == 0) {
              Json::Value data = json["data"];
              Json::String asString = data.asString();
              const char* comboIconURL = asString.c_str();
              this->parent->downloadImageHandler(comboIconURL, settings.comboIconData, settings.comboIconDataLen);
            }
            else {
              parent->errors.push_back(error);
            }
          }
          else {
            ParseStatusError(url, res->status);
          }
        }
        else {
          parent->errors.push_back("GET response for FetchServerSettings was nullptr");
        }
      }
      catch (std::exception& e) {
        parent->errors.push_back(e.what());
      }
    }

    const bool WebClientPimpl::FetchCardProperties(const std::string& id, CardProperties& model) {
        if (id.empty()) return false;

        auto iter = parent->local.cardProperties.find(id);
        if (iter != parent->local.cardProperties.end()) {
            model = *iter->second;
            return true;
        }

        try {
            auto url = MakeVersionURI(std::string("card-properties/") + id);
            auto res = client->Get(url.c_str());

            if (res) {
                if (res->status == 200) {
                    Json::CharReaderBuilder builder;
                    Json::CharReader* reader = builder.newCharReader();

                    Json::Value json;
                    std::string error;

                    bool parsingSuccessful = reader->parse(
                        res->body.c_str(),
                        res->body.c_str() + res->body.size(),
                        &json,
                        &error
                    );
                    delete reader;

                    if (parsingSuccessful && ParseErrors(json) == 0) {
                        Json::Value data = json["data"];

                        std::shared_ptr<CardProperties> newModel = std::make_shared<CardProperties>();
                        std::vector<char> codes;
                        std::vector<std::string> metaClasses;

                        for (auto&& code : data["codes"]) {
                            codes.push_back(code.asString()[0]);
                        }

                        for (auto&& type : data["metaClasses"]) {
                            metaClasses.push_back(type.asString());
                        }

                        ClassTypes classType = static_cast<ClassTypes>(data["class"].asInt());

                        // fill in our model
                        newModel->id = data["_id"].asString();
                        newModel->name = data["name"].asString();
                        newModel->damage = data["damage"].asInt();
                        newModel->element = data["element"].asString();
                        newModel->secondaryElement = data["secondaryElement"].asString();
                        newModel->description = data["description"].asString();
                        newModel->verboseDescription = data["vernoseDescription"].asString();
                        newModel->imageURL = data["image"].asString();
                        newModel->iconURL = data["icon"].asString();
                        newModel->codes = codes;
                        newModel->timeFreeze = data["timeFreeze"].asBool();
                        newModel->limit = data["limit"].asInt();
                        newModel->action = data["action"].asString();
                        newModel->canBoost = data["canBoost"].asBool();
                        newModel->metaClasses = metaClasses;
                        newModel->classType = classType;

                        // something has gone terribly wrong. We need a name at minimum.
                        if (newModel->name.empty()) {
                            parent->errors.push_back("Something has gone wrong when interpretting card json. Here is the dump:\n");
                            parent->errors.push_back(json.toStyledString());
                            return false;
                        }

                        std::string imageURL = newModel->imageURL;
                        std::string iconURL = newModel->iconURL;

                        // cache it
                        auto&&[iter, ignore] = parent->local.cardProperties.insert(std::make_pair(newModel->id, newModel));

                        // Now that we have a permanent cached image to use, download data for it
                        parent->downloadImageHandler(iconURL.c_str(), iter->second->iconData, iter->second->iconDataLen);
                        parent->downloadImageHandler(imageURL.c_str(), iter->second->imageData, iter->second->imageDataLen);

                        model = *iter->second;
                    }
                    else {
                        parent->errors.push_back(error);
                    }

                    return true;
                }
                else {
                    ParseStatusError(url, res->status);
                }
            }
            else {
                parent->errors.push_back("GET response for FetchCardProperties was nullptr");
            }
        }
        catch (std::exception & e) {
            parent->errors.push_back(e.what());
        }

        return false;
    }

    const bool WebClientPimpl::FetchCardCombo(const std::string& id, CardCombo& model) {
        if (id.empty()) return false;

        auto iter = parent->local.cardCombos.find(id);
        if (iter != parent->local.cardCombos.end()) {
            model = *iter->second;
            return true;
        }

        try {
            auto url = MakeVersionURI(std::string("combos/") + id);
            auto res = client->Get(url.c_str());

            if (res) {
                if (res->status == 200) {
                    Json::CharReaderBuilder builder;
                    Json::CharReader* reader = builder.newCharReader();

                    Json::Value json;
                    std::string error;

                    bool parsingSuccessful = reader->parse(
                        res->body.c_str(),
                        res->body.c_str() + res->body.size(),
                        &json,
                        &error
                    );
                    delete reader;

                    if (parsingSuccessful && ParseErrors(json) == 0) {
                        Json::Value data = json["data"];

                        std::shared_ptr<CardCombo> newModel = std::make_shared<CardCombo>();
                        std::vector<std::string> cards;
                        std::vector<std::string> metaClasses;

                        for (auto&& card : data["cards"]) {
                            cards.push_back(card.asString());
                        }

                        for (auto&& type : data["metaClasses"]) {
                            metaClasses.push_back(type.asString());
                        }

                        // fill in our model
                        newModel->id = data["_id"].asString();
                        newModel->name = data["name"].asString();
                        newModel->damage = data["damage"].asInt();
                        newModel->element = data["element"].asString();
                        newModel->secondaryElement = data["secondaryElement"].asString();
                        newModel->cards = cards;
                        newModel->timeFreeze = data["timeFreeze"].asBool();
                        newModel->action = data["action"].asString();
                        newModel->canBoost = data["canBoost"].asBool();
                        newModel->metaClasses = metaClasses;

                        // something has gone terribly wrong. We need a name at minimum.
                        if (newModel->name.empty()) {
                            parent->errors.push_back("Something has gone wrong when interpretting combo json. Here is the dump:\n");
                            parent->errors.push_back(json.toStyledString());
                            return false;
                        }

                        // cache it
                        auto&& [iter, ignore] = parent->local.cardCombos.insert(std::make_pair(newModel->id, newModel));

                        model = *iter->second;
                    }
                    else {
                        parent->errors.push_back(error);
                    }

                    return true;
                }
                else {
                    ParseStatusError(url, res->status);
                }
            }
            else {
              parent->errors.push_back("GET response for FetchCardCombos was nullptr");
            }
        }
        catch (std::exception& e) {
            parent->errors.push_back(e.what());
        }

        return false;
    }

    void WebClientPimpl::DigestFolderData(const Json::Value& data, Folder& folder) {
        folder.id = data["_id"].asString();
        folder.name = data["name"].asString();

        for (auto&& id : data["cards"]) {
            Card card;
            if (this->FetchCard(id.asString(), card)) {
                folder.cards.push_back(card.id);
            }
        }
    }

    void WebClientPimpl::DigestCardComboData(const Json::Value& data, CardCombo& combo) {
        const std::string id = data["_id"].asString();

        if (this->FetchCardCombo(id, combo)) {
            for (auto&& id : combo.cards) {
                Card card;
                if (!this->FetchCard(id, card)) {
                    parent->errors.push_back("Could not fetch card " + id + " for combo " + combo.id);
                }
            }
        }
    }

    const bool WebClientPimpl::DownloadFolders(AccountState::FolderCache& folders, long long since) {
        try {
            const std::string url = MakeVersionURI("folders/since/" + std::to_string(since));
            auto res = client->Get(url.c_str());

            if (res) {
                if (res->status == 200) {
                    Json::CharReaderBuilder builder;
                    Json::CharReader* reader = builder.newCharReader();

                    Json::Value json;
                    std::string error;

                    bool parsingSuccessful = reader->parse(
                        res->body.c_str(),
                        res->body.c_str() + res->body.size(),
                        &json,
                        &error
                    );
                    delete reader;

                    if (parsingSuccessful && ParseErrors(json) == 0) {
                        const Json::Value& data = json["data"];
                        for (Json::ArrayIndex i = 0; i < data.size(); i++) {
                            std::shared_ptr<Folder> folder = std::make_shared<Folder>();
                            
                            // Folders have cards to fetch and cards have
                            // card properties to fetch
                            this->DigestFolderData(data[i], *folder);
                            folders.insert(std::make_pair(folder->name, folder));
                        }

                        return true;
                    }
                    else {
                        parent->errors.push_back(error);
                    }
                }
                else {
                    ParseStatusError(url, res->status);
                }
            }
            else {
                parent->errors.push_back("GET response for DownloadFolders was nullptr");
            }

        }
        catch (std::exception & e) {
            parent->errors.push_back(e.what());
        }

        return false;
    }

    const bool WebClientPimpl::DownloadCardCombos(AccountState::CardComboCache& combos, long long since) {
        try {
            const std::string url = MakeVersionURI("combos/since/"+std::to_string(since));
            auto res = client->Get(url.c_str());

            if (res) {
                if (res->status == 200) {
                    Json::CharReaderBuilder builder;
                    Json::CharReader* reader = builder.newCharReader();

                    Json::Value json;
                    std::string error;

                    bool parsingSuccessful = reader->parse(
                        res->body.c_str(),
                        res->body.c_str() + res->body.size(),
                        &json,
                        &error
                    );
                    delete reader;

                    if (parsingSuccessful && ParseErrors(json) == 0) {
                        const Json::Value& data = json["data"];
                        for (Json::ArrayIndex i = 0; i < data.size(); i++) {
                            std::shared_ptr<CardCombo> cardCombo = std::make_shared<CardCombo>();
                            // Combos have cards to fetch which in turn have
                            // card properties to fetch
                            this->DigestCardComboData(data[i], *cardCombo);
                            combos.insert(std::make_pair(cardCombo->name, cardCombo));
                        }

                        return true;
                    }
                    else {
                        parent->errors.push_back(error);
                    }
                }
                else {
                    ParseStatusError(url, res->status);
                }
            }
            else {
              parent->errors.push_back("GET response for DownloadCardCombos was nullptr");
            }
        }
        catch (std::exception& e) {
            parent->errors.push_back(e.what());
        }

        return false;
    }
}
