/*******************************************
File name: server.js
Author: Maverick Peppers
Date: 12/16/2019
Description:
  The main script acts as a RESTful API
  server. Handles HTTP requests. Uses
  Passport for user registration and
  authentication. This script is
  a Web API on top of the Open NetBattle Web API.
********************************************/

/*******************************************
LOAD REQUIRED PACKAGES
*******************************************/
// Require the file service module
var fs = require('fs');

// Require the path module
var path = require('path');

// Require the logger module
var logger = require('morgan');

// Require the express module
var express = require('express');

// Require the cookie parser module
var cookieParser = require('cookie-parser');

// Require the session module
var session = require('express-session');

// Mongoose database & ORM
var mongoose = require('mongoose');

// Require the passport module for sessions
var passport = require('passport');

// Require the body-parser module
var bodyParser = require('body-parser');

// Require the url module
var url = require('url');

// Require Cross Origin Resource Sharing
var cors = require('cors')

var settings = require('./server-settings');

// Create the express application
var app = express();

// Use the json parser in our application
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(cookieParser());

/*******************************************
CONFIGURE RESOURCE SHARING WHITELIST
*******************************************/

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE");
  res.header("Access-Control-Allow-Headers", "Authorization, Origin, X-Requested-With, Content-Type, Accept");
  next();
});

/*******************************************
CONFIGURE THE DATABASE
*******************************************/

// Create a mongoose connection
var mongooseConnection = mongoose.createConnection();

// Connect to mongo
var url = settings.url,
    port = settings.port,
    database = settings.database,
    user = settings.user,
    pass = settings.password;

var connectString = 'mongodb://'+user+":"+pass+"@"+url+':'+port+'/'+database+"?authSource=admin";
mongoose.set('useCreateIndex', true);
mongoose.connect(connectString, { useNewUrlParser: true, useUnifiedTopology: true} );

// Check the state of the pending transactions
var db = mongoose.connection;

db.on('error', function(err) {
  // Print the error let the system know it's not good
  console.log(err.stack);
});

db.once('open', function() {
  console.log("Connected to database on " + connectString);
});

// Use the Passport middleware in our routes
app.use(session({secret: 'OpenNetBattle', resave: false, saveUninitialized: true}));
app.use(passport.initialize());
app.use(passport.session());

// Use the logger module in our development application
var env = process.env.NODE_ENV || 'dev';

if(env === 'dev') {
  app.use(logger('dev'));
}

// DEBUG: Print session data
app.use(function(req, res, next) {
  var session = req.session;

  if(!session) {
    session = req.session = {};
  }

  next();
});

// Now that the client has connected to the database,
// add it as middleware giving the request object
// a variable named 'database' that all routes
// can use to execute queries.

app.use(function(req, res, next) {
  req.database = db;

  next(); // Move onto the next middleware
});

/******************************************
CONFIG SERVER
*******************************************/
// Use environment defined port or 3000
var port = process.env.PORT || 3000;

var cleanup = function() {
    db.close();
    process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

/******************************************
CREATE ROUTES
*******************************************/

app.get('/heartbeat', (req, res) => res.sendStatus(200));

// Create our express router
var v1Router = require('./v1/router')(db);

// Register ALL routes with /v1
app.use('/v1', v1Router);

// Catch 404 routing error
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;

  res.json(err);

  next(err);
});

// Dev error handler -- to print stack trace
if(app.get('env') == 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);

/*    res.render('error', {
      message: err.message,
      error: err
    });
	*/
	res.json({message: err.message, error:err});
  });
}

// Production error handler -- no stack traces
// leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.send();
});

/*****************************************
START THE SERVER
******************************************/
app.listen(port);

console.log('OpenNetBattle API is listening on'
+ ' port ' + port + '...');

module.exports = app;
