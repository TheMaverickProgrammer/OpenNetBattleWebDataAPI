# battlenetwork-web-api
Web api for the open battlenetwork project [>> here <<](https://github.com/TheMaverickProgrammer/battlenetwork)

There will not be a tutorial beyond this README. The web api is not intended to be expanded upon but to help mobile users organize their folders
and share optimal folders with eachother.

# docs
View the public documentation hosted by postman [>> here <<](https://documenter.getpostman.com/view/9873403/SWLYAWAU?version=latest)

# requirements
A mongo DB server for the data store

# install
Clone this project
Enter the directory via console
Enter `npm install`

# running
`npm start`

# configuring
Edit the `server-config.json` file to edit the API's configurations

As of now, only the database settings can be configured

```
{
  "dbType": "mongo",
  "url": "localhost",
  "user": "mongoAdmin",
  "password": "enter your password here",
  "port": "27017",
  "collection": "my_battlenetwork_collection"
}
```

**DO NOT CHANGE `dbType`!** This api uses mongoose module for mongo databases only
