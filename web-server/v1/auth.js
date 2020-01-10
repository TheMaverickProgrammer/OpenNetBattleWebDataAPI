/*
Authentication using Passport node module
*/

module.exports = function Auth(database) {
  var passport = require('passport');
  var BasicStrategy = require('passport-http').BasicStrategy;
  var bcrypt = require('bcryptjs');
  var UsersModel = require('./controllers/models/UsersModel');
  var AdminUsersModel = require('./controllers/models/AdminUsersModel');

  // Used when regular user is not found
  var verifyAdminPassword = function(username, password, cb) {
    var db = database;
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
			        isMatch = {isAdmin: true, adminUser };
              //console.log("user logged in status: " + JSON.stringify(isMatch));
              cb(null, isMatch);
            });
          }
        }
    });
  };

  var verifyUserPassword = function(username, password, cb) {
    UsersModel.findOne({username: username},
     function(err, user) {
        if(err) {
          cb(err);
        } else {
          if(!user) {
            // Check if this is an admin login
            verifyAdminPassword(username, password, cb);
          } else {
            // Check password using bcrypt
            bcrypt.compare(password, user.password, function(err, isMatch) {
              if(err) { console.log("err: " + JSON.stringify(err)); return cb(err); }
			        isMatch = { isAdmin: false, user };
              //console.log("user logged in status: " + JSON.stringify(isMatch));
              cb(null, isMatch);
            });
          }
        }
    });
  };

  passport.serializeUser(function(user, done) {
    done(null, user.username);
  });

  passport.deserializeUser(function(username, done) {
    var query = UsersModel.findOne({username: username});
    var promise = query.exec();

      promise.then(function(user) {
        done(null, user);
      }, function(err) {
      done(err, false);
    });
  });

  // Basic strategy for users
  passport.use('basic', new BasicStrategy(
    function(username, password, done) {
      verifyUserPassword(username, password,
        function(err, isMatch) {
          if(err) { return done(err); }

          // Password did not match
          if(!isMatch || !isMatch.user) { return done(null, false); }
 
          var isAdmin = isMatch.isAdmin || false;
		      var username = isMatch.user.username;
		      var userId = isMatch.user._id;
		  
          // Success
          var userInfo = {
            username: username,
			      userId: userId,
            isAdmin: isAdmin
          };

          return done(null, userInfo);
        });
      })
  );
  
  // Basic strategy for admins
  passport.use('admin', new BasicStrategy(
    function(username, password, done) {
      verifyAdminPassword(username, password,
        function(err, isMatch) {
          if(err) { return done(err); }

          // Password did not match
          if(!isMatch || !isMatch.user) { return done(null, false); }
 
          var isAdmin = isMatch.isAdmin || false;

          // We must be admin otherwise something went seriously wrong
          // for this type of authentication
		      if(!isAdmin) { return done(null, false); }
      
		      var username = isMatch.user.username;
          
          // Success
          var userInfo = {
            username: username,
			      userId: null,
            isAdmin: isAdmin
          };

          return done(null, userInfo);
        });
      })
  );

  // Export the function to authenticate resource requests
  // store this in a session cookie
  this.isAuthenticated = function(req,res,next){
    if(req.user) {
       return next();
    }
    
    return passport.authenticate('basic', { session: true })(req, res, next);
  }

  // Never allow admins to store cookies. They must request permission every request.
  this.isAdminAuthenticated = function(req,res,next){
    if(req.user) {
       return next();
    }
    
    return passport.authenticate('admin', { session: true })(req, res, next);
  }

  //this.isAuthenticated = passport.authenticate('basic', {session: true});
  //this.isAdminAuthenticated = passport.authenticate('admin', { session: true});

  // returns the scope as a constructed auth object
  return this;
};
