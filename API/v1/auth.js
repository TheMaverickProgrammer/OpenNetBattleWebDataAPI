/*
Authentication using Passport node module
*/

module.exports = function Auth(database) {
  var passport = require('passport');
  var BasicStrategy = require('passport-http').BasicStrategy;
  var bcrypt = require('bcryptjs');

  var users = require('./controllers/models/UsersModel');

  // Used when business user is not found
  var verifyAdminPassword = function(username, password, cb) {
    var db = database;

    var AdminUsersModel = require('./controllers/models/AdminUsersModel');

    AdminUsersModel.findOne({username: username},
     function(err, adminUser) {
        if(err) {
          cb(err);
        } else {
          if(!adminUser) {
            cb(null, false);
          } else {
            // Check password using bcrypt
            bcrypt.compare(password, adminUser.password, function(err, isMatch) {
              if(err) { console.log("err: " + JSON.stringify(err)); return cb(err); }
              console.log("user logged in status: " + JSON.stringify(isMatch));
              isMatch.isAdmin = true;
              cb(null, isMatch);
            });
          }
        }
    });
  };

  var verifyUserPassword = function(email, password, cb) {
    UsersModel.findOne({email: email},
     function(err, user) {
        if(err) {
          cb(err);
        } else {
          if(!user) {
            // Check if this is an admin login
            verifyAdminPassword(email, password, cb);
          } else {
            // Check password using bcrypt
            bcrypt.compare(password, businessUser.password, function(err, isMatch) {
              if(err) { console.log("err: " + JSON.stringify(err)); return cb(err); }
              console.log("user logged in status: " + JSON.stringify(isMatch));
              cb(null, isMatch);
            });
          }
        }
    });
  };

  passport.serializeUser(function(user, done) {
    console.log("serializing user");

    done(null, user.email);
  });

  passport.deserializeUser(function(email, done) {
    console.log("deserializing user");

    var query = UsersModel.findOne({email: email});
    var promise = query.exec();

    promise.then(function(user) {
      done(null, user);
    }, function(err) {
      done(err, false);
    });
  });

  // Basic strategy for users
  passport.use('basic', new BasicStrategy(
    function(email, password, done) {
      verifyUserPassword(email, password,
        function(err, isMatch) {
          if(err) { return done(err); }

          // Password did not match
          if(!isMatch) { return done(null, false); }

          // Success
          var userInfo = {
            email: email,
            isAdmin: isMatch.isAdmin || false,
          };

          return done(null, userInfo);
        });
      })
  );

  // Export the function to authenticate resource requests
  // DO NOT store this in a session cookie -- force authentication every request
  isAuthenticated = passport.authenticate('basic', { session: false });

  return this;
};
