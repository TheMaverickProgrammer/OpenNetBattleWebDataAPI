# Open Net Battle Web Data API
Web API for the [Open Net Battle](https://github.com/TheMaverickProgrammer/OpenNetBattle) project
This is a RESTFUL service that recieves request to fetch or store data in a MongoDB database using Mongoose.

There is no visuals. For a front-end dashboard to interface with the API visit [Open Net Battle Web Dashboard](https://github.com/TheMaverickProgrammer/OpenNetBattleWebDashboard) project.

## DISCLAIMER
There will not be a tutorial beyond this README.
This project has 2 parts: The web server (api), and the C++ client

# 1. Web Server
## docs
View the public documentation hosted by postman [>> here <<](https://documenter.getpostman.com/view/9873403/SWLYAWAU)

## requirements
A mongo DB server for the data store

## install
- Clone this project
- Enter the directory via console
- Enter `npm install`


## running
`npm start`

## configuring
Edit the `server-config.json` file to edit the API's configurations


```
{
  "database": {
	  "url": "localhost",
	  "user": "yourMongoAdminUsername",
	  "password": "your mongo password",
	  "port": "27017",
	  "collection": "yourCollectionName"
  },
  "server": {
    "name": "Open Net Battle Data API",
    "port": 999,
	"sessionDurationSeconds": 604800,
	"signupWhiteList": [""],
		"ssh": {
		"enabled": true,
		"user": "yourServerUsername",
		"password": "yourServerPassword"
	}
  },
  "preferences": {
	  "maxFolderNameLength": 8,
	  "maxCardNameLength": 8,
	  "maxDescriptionLength": 30,
	  "maxVerboseDescriptionLength": 300
  }
}

```

### Session Duration Seconds 
This property tells the server how long to keep sessions for. 
Take the time and convert into seconds.
After this expires users will have to log back in.

### Signup White List
In order to let users create an account, the server has to allow `/POST` requests to the
users endpoint. This could be attacked maliciously. To solve this, I added a whitelist array
of **IPv6** addresses that the endpoint will allow through before doing auth checks.

For testing purposes you may want to add local host `::1` to the array.

## Further security
For public use, some additional security should be been not present in this distribution. 

You may also want to lock out your ports and API access completely except for white-listed IP addresses.

Run express with HTTPS by [following this guide](https://timonweb.com/posts/running-expressjs-server-over-https/)

#### Using SSH
set `server.ssh` to `true` to use tunneling. You must provide your server username and password or the tunnel will fail.
It assumes your server has ssh configured to listen on port `22`. When using tunneling, it will connect to your database
locally (on the remote server) and use the configured `database.port` to connect to the mongo db at that port as well.

# 2. Client

If you're building the [OpenNetBattle Engine](https://github.com/TheMaverickProgrammer/OpenNetBattle) from source, you'll need to build the DLL to interact with the web server.

## Windows
The ClientApplication solution file has 2 projects: one aptly named "ClientApplication" and the other "OpenBattleNetworkWebClient"

1. Right-click and Build "OpenBattleNetworkWebClient" first. This will build and generate a DLL.

This DLL handles communication between the RESTful web server and provides a programmer-friendly API to determine
the client status (logged in) and cache data (folders, downloaded chip images, etc)

2. (Optional) Right-click and Build "ClientApplication". This will require the DLL to run.

Once its built you can run the terminal and from there, you can log in and manage your account.

## MacOSX
To build the DyLib, navigate to the `client` directory. Open your terminal in this folder and type:

```
clang++ -shared -fpic -std=c++17 WebClient.cpp -I./includes -I./includes/jsoncpp includes/httplib/httplib.cc includes/jsoncpp/jsoncpp.cpp -o libOpenNetBattleWebClient.dylib
```

## Linux
TODO
