#pragma once

// Define EXPORTED for any platform
#ifndef WEBAPI_STATIC
# ifdef OPENNETBATTLEWEBCLIENT_EXPORTS
#   define EXPORT_DLL  __declspec( dllexport )
#   define EXTERN_TEMPLATE extern
# else
#   define EXPORT_DLL  __declspec( dllimport )
#   define EXTERN_TEMPLATE extern
# endif
#else
# define EXPORT_DLL
#endif

#include "WebAccountsAPI.h"
#include <functional>

namespace WebAccounts {
    // forward declare pimpl
    class WebClientPimpl;

    // Input params are (url, bytes, byte_len)
    // Where url is a C String
    // Where bytes is bytes downloaded 
    // Where byte_len is length of bytes
    using DownloadImageHandler = std::function<void(const char*, byte*&, size_t&)>;

    /*! \brief settings defined by the web api server that should be shared with a client*/
    struct ServerSettings {
      byte* comboIconData{ 0 };
      size_t comboIconDataLen{ 0 };
    };

    /*! \brief error codes returned when purchasing products over the API */
    enum class PurchaseResult : uint8_t {
      success = 0x00,
      invalid_purchase = 0x01,
      self_sell = 0x02,
      key_item_owned = 0x03,
      no_monies = 0x04,
      network_error = 0x05
    };

    /*! \brief WebClient objects are a wrapper around HTTP requests for the Open Battle Web API 
        This wrapper is smart to cache all downloaded data and manage the desynced state each folder is in
        It provides utilities to easily integrate into the battle engine
    */
    class WebClient {
        friend class WebClientPimpl;

    private:
        char* version; //!< HTTP API this client is targetting (e.g. "v1")
        char* domain; //!< The endpoint where the HTTP API lives (e.g. openbattle.org)
        int port; //!< The port the HTTP API listens to (e.g. 3030)
        char isOk; //!< Flag to hint if the client is well-formed and connected to the server.
        char isLoggedIn; //!< Flag to remember if a user was logged in successfully 
        std::vector<std::string> errors; //!< A list of errors we can log later
        AccountState local; //!< Represents the player's user account
        DownloadImageHandler downloadImageHandler; //!< User-provided download functor
        ServerSettings serverSettings; //!< The web api fields and values that needs to be shared with a client
        WebClientPimpl* privImpl; //!< Private implementation to make header/DLL separate without needing new headers

    public:
        /*! \brief Only constructor for the web client. It must have a version, domain URL, and port #
            \param version. String e.g. "v1"
            \param domain. String e.g. "openbattle.org"
            \param port. Integer e.g. 3030

            Will create a new HTTP client object for `client`
            isOK is set to TRUE 
        */
        EXPORT_DLL WebClient(const char* version, const char* domain, int port);

        /*! \brief Destructor deletes client if it was allocated */
        EXPORT_DLL ~WebClient();

        /*! \brief Returns a const reference to the local account */
        EXPORT_DLL const AccountState& GetLocalAccount() const;

        /*! \brief Will make a login request with the supplied username and password 
            \param user. String username
            \param pass. String password
            \return true if the account was logged into. False otherwise.
            
            If the account is logged into, the HTTP client sets the authentication header 
            to the SESSION cookie returned from the Web API 
        */
        EXPORT_DLL const bool Login(const char* user, const char* pass);

        /*! \brief Will logout of account and destroy all local information*/
        EXPORT_DLL void LogoutAndReset();

        /*! \brief Adds a card to an existing local folder
            \param card. Card reference.
            \param folder. Folder reference to modify

            If the folder is not due for deletion (mode) then mark it for update with the remote server.
        */
        EXPORT_DLL void AddCard(const Card& card, Folder& folder);

        /*! \brief Removed a card to an existing local folder
            \param card. Card reference.
            \param folder. Folder reference to modify

            If the folder is not due for deletion (mode) then mark it for update with the remote server.
        */
        EXPORT_DLL void RemoveCard(const Card& card, Folder& folder);

        /*! \brief Will create a folder on the remote account with the input folder data
            \param folder. Const Folder reference that will be copied.

            If the folder ID is found, we do nothing. 
            If the folder ID is not found, then we add it to our local web client and mark it for update.
            If the source folder is already marked for deletion, it is not added.
        */
        EXPORT_DLL void AddFolder(const Folder& folder);

        /*! \brief Remove the folder from our account
            \param folder. Const Folder reference to lookup ID and remove.

            If the folder is not found, we do nothing.
            If we found the folder, mark it for deletion
        */
        EXPORT_DLL void RemoveFolder(const Folder& folder);

        /*! \brief Used at startup. This will overwrite the contents of the web client's folders.
            This routine will download folders and associated card and model data.
            \param since. A millisecond timestamp that returns data from the API from that point onward.

            \warning There's no gaurantee the return information is correct. We just assume so and log errors
        */
        EXPORT_DLL void FetchAccount(long long since);

        /*! \brief downloads the associated card's model data and stores it away into the local account state
            \param uuid. Const string reference of the Card's UUID.
        */
        EXPORT_DLL const bool FetchCard(const std::string& uuid);

        /*! \brief pushes (upload) changes to the user account on the Web API
            
            This routine loops through each folder and if the folder is marked for UPDATE
            then it PUTS that data to the API. If the folder is marked for CREATE then
            we are adding a new folder to our remote account. If it is marked as DESTROY 
            then the folder is requested to be removed from the account (locally and remotely)
        */
        EXPORT_DLL void PushAccount();

        EXPORT_DLL PurchaseResult PurchaseProduct(const std::string& uuid);

        /*! \brief Query if the connection is OK */
        EXPORT_DLL const bool IsOK();

        /*! \brief Query if the user was ever authenticated */
        EXPORT_DLL const bool IsLoggedIn() const;

        /*! \brief return a copy of all reported errors */
        EXPORT_DLL const bool GetNextError(char** str);

        /*! \brief clears all errors */
        EXPORT_DLL void ClearErrors();

        /*! \brief Provide a download handler for raw image data here 
            \warning WebClient's default download handler does nothing.
            \param callback. A const DownloadImageHandler reference to set the image download routine
        */
        EXPORT_DLL void SetDownloadImageHandler(const DownloadImageHandler& callback);

        /* !\brief Read the server settings aquired from the web api*/
        EXPORT_DLL const ServerSettings& GetServerSettings() const;
    };
}