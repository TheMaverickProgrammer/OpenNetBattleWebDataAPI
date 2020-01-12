# Open Net Battle Data API
Web api for the open net battle project [>> here <<](https://github.com/TheMaverickProgrammer/OpenNetBattle)

There will not be a tutorial beyond this README. 

This project has 2 parts: The web server (api), and the C++ client

# 1. Client

TODO

# 2. Web Server
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
    "port": 999
  },
  "preferences": {
	  "maxFolderNameLength": 8,
	  "maxCardNameLength": 8,
	  "maxDescriptionLength": 30,
	  "maxVerboseDescriptionLength": 300
  }
}

```

## Further security
For public use, some additional security should be been not present in this distribution. For instance, I have also locked-out the `POST /admin` endpoint in my build after creating my first admin account so that no one else can create admins on the fly.

You may also want to lock out your ports and API access completely except for white-listed IP addresses. 
