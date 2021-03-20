#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>

namespace WebAccounts {
    typedef unsigned char byte;

    /*! \brief limits used per-folder */
    constexpr const unsigned MAX_LIMIT = 5;
    constexpr const unsigned DEFAULT_LIMIT = 3;
    constexpr const unsigned MIN_LIMIT = 1;

    /*! \brief What types of cards these can be */
    enum class ClassTypes : unsigned {
        STND = 1,
        MEGA = 2,
        GIGA = 3,
        DARK = 4
    };

    /*! \brief Represents the Card's data used in the game over the network*/
    struct CardProperties {
        std::vector<char> codes; //!< Every code this card can have
        int damage; //!< Base damage
        bool timeFreeze; //!< is this card a Time Freeze trigger
        std::string element, secondaryElement; //!< Element this card can be
        std::string description, verboseDescription; //!< Description of the card
        std::string imageURL, iconURL; //!< Icons of the card
        std::string id; //!< ID of the card
        std::string name; //!< Name of the card
        unsigned limit; //!< How many identical cards can be in the same deck
        std::string action; //!< The action this card invokes on the player
        bool canBoost; //!< Whether or not this card can be modified by other cards
        std::vector<std::string> metaClasses; //!< Programmer-supplied class types
        ClassTypes classType; //!< The class type of this card

        byte* imageData, *iconData; //!< Image buffer data to be used by a graphics API
        size_t imageDataLen, iconDataLen; //!< Length of image buffer
    };

    /*! \brief Represents data for combos used in-game */
    struct CardCombo {
      std::string id; //!< ID of this resource
      std::string name; //!< Name of the combo
      std::string element; //!< Primary element
      std::string secondaryElement; //!< Secondary element
      std::string action; //!< The action this card invokes on the player
      bool timeFreeze; //!< is this card a Time Freeze trigger
      bool canBoost; //!< Whether or not this card can be modified by other cards
      int damage; //!< Base damage
      std::vector<std::string> metaClasses; //!< Programmer-supplied class types
      std::vector<std::string> cards; //!< UUIDs of cards that trigger this combo IN-ORDER
    };

    /*! \brief Represents key item data used in-game*/
    struct KeyItem {
      std::string name; //!<  Name of the key item
      std::string description; //!< Description of the key item
    };

    /*! \brief A lightweight card structure used in battle. This will point to a card model that contains all the data*/
    struct Card {
        std::string modelId; //!< ID of the CardModel this structure will reference
        std::string id; //!< unique ID of this card implementation
        char code; //!< The unique code this card represents

        Card() = default;

        Card(const std::string& id) {
            this->modelId = std::string();
            code = '*';
            this->id = id;
        }

        Card(const Card& rhs) = default;
    };

    /*! \brief Folder structure contains cards. This will be fed into the battle engine to read from during battles */
    struct Folder {
        /*! \brief The state of this folder needs to be synced with remote. This flag represents the sync action to use. */
        enum class RemoteActionMode {
            NONE = 0,
            UPDATE,
            CREATE,
            DESTROY
        } mode{ RemoteActionMode::NONE };

        std::string name; //!< Name of the folder
        std::string id; //!< unique ID of the folder in the database
        std::vector<std::string> cards; //!< List of card IDs
        std::vector<std::string> errors; //!< Errors from web api

        Folder() = default;

        /**
          Specialized ctor that creates an empty folder 
          and assigns an ID to it.

          This is used in most creation of new folders.
        */
        Folder(const std::string& id) {
            this->mode = RemoteActionMode::NONE;
            this->name = std::string();
            this->cards = std::vector<std::string>();
            this->id = id;
        }

        Folder(const Folder& rhs) = default;
    };

    /*! \brief local account structure is a copy of the remote account and will be synced to the server periodically */
    struct AccountState {
        using CardPropertiesCache = std::map<std::string, std::shared_ptr<CardProperties>>;
        CardPropertiesCache cardProperties; //!< cache of the downloaded card property model data so we don't poll the server each time

        using CardComboCache = std::map<std::string, std::shared_ptr<CardCombo>>;
        CardComboCache cardCombos; //!< cache of the downloaded card combos 

        using CardCache = std::map<std::string, std::shared_ptr<Card>>;
        CardCache cards; //!< cache of the downloaded card data

        using FolderCache = std::map<std::string, std::shared_ptr<Folder>>;
        FolderCache folders; //!< cache of the folder data

        std::vector<std::string> cardPool; //!< cache of the card pool in the user's account
        std::vector<KeyItem> keyItems; //!< cache of the key items fetched from the endpoint

        uint32_t monies{}; //!< Monies on the account
        std::string mask; //!< Mask identifier for swapping with servers who wish to inspect key items
        std::string userId; //!< userID on the web api

        long long lastFetchTimestamp{ 0 }; //!< The last time a fetch was requested
    };
}
