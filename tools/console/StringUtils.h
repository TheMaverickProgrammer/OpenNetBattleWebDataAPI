#pragma once

#include <vector>

namespace StringUtils {

    /*! \brief Will split a string that matches the delimeter
        \param str. The input string to split
        \param delim. The token to split with when we come across it.
        \return a list of strings separated by the delimeter. Can be empty.
    */
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

    /*! \brief Will split a string that matches the delimeter but will preserve "" quoted content
    \param str. The input string to split
    \param delim. The token to split with when we come across it.
    \return a list of strings separated by the delimeter. Content in quotes are not checked. Can be empty.
*/
    std::vector<std::string> splitPreserveQuotes(const std::string& str, const char delim = ' ') {
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
#define utf8(str)  _ConvertToUTF8(L##str)

const char* _ConvertToUTF8(const wchar_t* pStr) {
    static char szBuf[1024];
    WideCharToMultiByte(CP_UTF8, 0, pStr, -1, szBuf, sizeof(szBuf), NULL, NULL);
    return szBuf;
}
#else
    // Visual C++ 2003 and gcc will use the string literals as is, so the files 
    // should be saved as UTF-8. gcc requires the files to not have a UTF-8 BOM.
# define utf8(str)  str
#endif

    /*! \brief given an input of string tokens, check to see if the first token matches a desired string
        \param list. An array-like structure that has support for the indexing [] operator
        \param match. A const char string we want to compare to
        \return a case-insensitive match will return true if the strings are identical. False otherwise.
    */
    template<typename StringList>
    const bool matches(StringList& list, const char* match) {
        return (!strcasecmp(list[0].c_str(), match));
    }

    /*! \brief Check to see if the first string matches a desired string
    \param str. The string to test.
    \param match. A const char string we want to compare to
    \return a case-insensitive match will return true if the strings are identical. False otherwise.
*/
    const bool matches(std::string& str, const char* match) {
        return (!strcasecmp(str.c_str(), match));
    }
}