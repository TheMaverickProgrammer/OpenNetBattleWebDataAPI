#include "WebClient.h"

#include <httplib/httplib.h>
#include <json/json.h>
#include <iostream>

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
        httplib::Client* client; //!< HTTP client
        WebClient* parent; //!< pointer to public-facing WebClient object

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
        void ParseStatusError(int code);

        /*! \brief Parses the JSON object that has an "error" key
            \param json. A Json::Value object reference that has an "error" key.
            \return returns the size of all parsed errors

            Error object may contain multiple errors and so we parse those and add those
            to our log for later.
        */
        const size_t ParseErrors(const Json::Value& json);

        /*! \brief Will try to download a card model with the ID and stores the data in our out-argument
            \param id. String ID of the card model to download from the API
            \param model. A card model structure to fill in from remote data

            If the request fails it is logged to the member `errors` object

            Returns true if card is downloaded successfully. False if there were errors.
        */
        const bool FetchCardModel(const std::string& id, CardModel& model);

        /*! \brief This will parse JSON data for the folder and return a filled-out Folder object with downloaded cards
            \param data. The JSON to interpret.
            \param folder. The out-argument to fill out from data.

            This will assign the out-argument `folder` with data from JSON
            It will also attempt to download card data or use the cache if possible

            \warning This does not gaurantee that folder data is correct. This should be used as an auxillary function.
        */
        void DigestFolderData(const Json::Value& data, Folder& folder);

    public:
        /*! \brief return the httplib client ptr used by this private implemenation*/
        httplib::Client* GetClient() const;

        /*! \brief Given a URL path, will append the proper URI versioning the API uses*/
        const std::string MakeVersionURI(std::string path) const;

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
            \return True if the request was successful and parsing was also succesful. False otherwise.

            Errors are logged in the `errors` member object
        */
        const bool DownloadFolders(AccountState::FolderCache& folders);

        /*! \brief Will try to download a card with the ID and stores the data in our out-argument
            \param id. String ID of the card to download from the API
            \param card. A card structure to fill in from remote data

            If the request fails it is logged to the member `errors` object

            Returns true if card is downloaded successfully. False if there were errors.
        */
        const bool FetchCard(const std::string& id, Card& card);
    };

    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                 WEB CLIENT IMPLEMENTATION                                            //
    //////////////////////////////////////////////////////////////////////////////////////////////////////////

    const std::string WebClient::GetSessionCookieStr() const
    {
        return this->cookieName + "=" + this->sessionID;
    }

    void WebClient::SetServerCookie(Cookie && cookie)
    {
        this->loginCookie = cookie;
    }

    WebClient::WebClient(const char* domain, int port, const char* version, const char* cookie) {
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

        sessionID = std::string();
        cookieName = std::string(cookie);

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

        auto res = client->Get(privImpl->MakeVersionURI("login").c_str());

        isLoggedIn = (res && res->status == 200);

        if (isLoggedIn) {
            if (res->has_header("Set-Cookie")) {
                this->SetServerCookie(Cookie::ParseHeader(res->get_header_value("Set-Cookie")));
                std::cout << "sessionID: " << this->GetSessionID() << std::endl;
            }
            else {
                this->errors.push_back("client could not find any cookies in server response");
            }
        }

        // We should only need to send credentials over wire once
        client->set_basic_auth("", "");

        return isLoggedIn;
    }

    void WebClient::LogoutAndReset() {
        httplib::Client* client = privImpl->GetClient();

        if (!client) return;

        httplib::Headers headers = {
            { "Cookie", GetSessionCookieStr().data() }
        };

        auto res = client->Get(privImpl->MakeVersionURI("logout").c_str(), headers);

        if (res && res->status == 200) {
            isLoggedIn = false;
            local = AccountState{};
            sessionID.clear();
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
            auto&&[iter, ignore] = local.folders.insert(std::make_pair(folder.name, std::make_shared<Folder>(folder)));
            iter->second->mode = Folder::RemoteActionMode::UPDATE;
        }
    }

    void WebClient::RemoveFolder(const Folder& folder) {
        auto iter = local.folders.find(folder.id);
        if (iter == local.folders.end()) return;

        iter->second->mode = Folder::RemoteActionMode::DESTROY;
    }

    void WebClient::FetchAccount() {
        AccountState::FolderCache folders;

        if (privImpl->DownloadFolders(folders)) {
            this->local.folders = folders;
        }
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
            }

            iter++;
        }

        for (auto& e : toErase) {
            local.folders.erase(e);
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

    //////////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                    PRIVATE IMPLEMENTATION                                            //
    //////////////////////////////////////////////////////////////////////////////////////////////////////////

    WebClientPimpl::WebClientPimpl(WebClient* parent, const char* domain, int port) : parent(parent) {
        client = new httplib::Client(domain, port);
    }

    WebClientPimpl::~WebClientPimpl() {
        if (client) {
            delete client; client = nullptr;
        }
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

        CardModel model;

        // Query the API if we don't have this model data
        if (!this->FetchCardModel(card.modelId, model))
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

        CardModel model;

        // Query the API if we don't have this model data
        if (!this->FetchCardModel(card.modelId, model))
            return false;

        iconBuffer = model.iconData;
        return iconBuffer; // non-null data will be true
    }

    void WebClientPimpl::ParseStatusError(int code) {
        switch (code) {
        case 401:
            parent->errors.push_back("User is not authenticated (is the client logged in?)");
            break;
        case 404:
            parent->errors.push_back("No page found at requested URL");
            break;
        case 500:
            parent->errors.push_back("There was a problem communicating with the server");
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

        httplib::Headers headers = {
            { "Cookie", parent->GetSessionCookieStr().data() }
        };

        auto res = client->Post(MakeVersionURI("folders").c_str(), headers, params);

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
                ParseStatusError(res->status);
            }
        }
        else {
            parent->errors.push_back("POST response for AddFolderToAccount was nullptr");
        }
    }

    void WebClientPimpl::RemoveFolderFromAccount(const std::string& id) {
        httplib::Headers headers = {
            { "Cookie", parent->GetSessionCookieStr().data() }
        };
        client->Delete(MakeVersionURI("folders/" + id).c_str(), headers);
    }

    void WebClientPimpl::UpdateFolderOnAccount(Folder& from) {
        httplib::Params params;
        params.insert(std::make_pair("name", from.name));

        for (auto cardID : from.cards) {
            params.insert(std::make_pair("cards", cardID));
        }

        httplib::Headers headers = {
            { "Cookie", parent->GetSessionCookieStr().data() }
        };

        auto res = client->Put(MakeVersionURI("folders/" + from.id).c_str(), headers, params);
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
            httplib::Headers headers = {
                { "Cookie", parent->GetSessionCookieStr().data() }
            };
            auto res = client->Get(MakeVersionURI(std::string("cards/") + id).c_str(), headers);

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
                        CardModel model;
                        FetchCardModel(card.modelId, model);
                    }
                    else {
                        parent->errors.push_back(error);
                    }

                    return true;
                }
                else {
                    ParseStatusError(res->status);
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

    const bool WebClientPimpl::FetchCardModel(const std::string& id, CardModel& model) {
        if (id.empty()) return false;

        auto iter = parent->local.cardModels.find(id);
        if (iter != parent->local.cardModels.end()) {
            model = *iter->second;
            return true;
        }

        try {
            httplib::Headers headers = {
                { "Cookie", parent->GetSessionCookieStr().data() }
            };
            auto path = MakeVersionURI(std::string("card-models/") + id);
            auto res = client->Get(path.c_str(), headers);

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

                        std::shared_ptr<CardModel> newModel = std::make_shared<CardModel>();
                        std::vector<char> codes;

                        for (auto&& code : data["codes"]) {
                            codes.push_back(code.asString()[0]);
                        }

                        // fill in our model
                        newModel->damage = data["damage"].asInt();
                        newModel->description = data["description"].asString();
                        newModel->verboseDescription = data["vernoseDescription"].asString();
                        newModel->element = data["element"].asString();
                        newModel->secondaryElement = data["secondaryElement"].asString();
                        newModel->iconURL = data["icon"].asString();
                        newModel->imageURL = data["image"].asString();
                        newModel->isTFC = false; /* TODO: add this to RESTFUL API */
                        newModel->codes = codes;
                        newModel->id = data["_id"].asString();
                        newModel->name = data["name"].asString();

                        // something has gone terribly wrong. We need a name at minimum.
                        if (newModel->name.empty()) {
                            parent->errors.push_back("Something has gone wrong when interpretting card json. Here is the dump:\n");
                            parent->errors.push_back(json.toStyledString());
                            return false;
                        }

                        std::string imageURL = newModel->imageURL;
                        std::string iconURL = newModel->iconURL;

                        // cache it
                        auto&&[iter, ignore] = parent->local.cardModels.insert(std::make_pair(newModel->id, newModel));

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
                    ParseStatusError(res->status);
                }
            }
            else {
                parent->errors.push_back("GET response for FetchCardModel was nullptr");
            }
        }
        catch (std::exception & e) {
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

    const bool WebClientPimpl::DownloadFolders(AccountState::FolderCache& folders) {
        try {
            httplib::Headers headers = {
                { "Cookie", parent->GetSessionCookieStr().data() }
            };

            auto res = client->Get(MakeVersionURI("folders").c_str(), headers);

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
                    ParseStatusError(res->status);
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
}
