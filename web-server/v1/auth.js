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
              if(err) { return cb(err); }
              if(!isMatch) { return cb("Username not found or password did not match"); }

              let data = {isAdmin: true, adminUser };
              //console.log("user logged in status: " + JSON.stringify(isMatch));
              cb(null, data);
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
              if(err) { return cb(err); }
              if(!isMatch) { return cb("Username not found or password did not match"); }
              let data = { isAdmin: false, user };
              //console.log("user logged in status: " + JSON.stringify(isMatch));
              cb(null, data);
            });
          }
        }
    });
  };

  passport.serializeUser(function(user, done) {
    done(null, user.userId);
  });

  passport.deserializeUser(function(userId, done) {
    // find a user or admin if user fails
    var query = UsersModel.findOne({_id: userId});
    var promise = query.exec();

    promise.then(function(user) {
      if(user == null) {
        var query = AdminUsersModel.findOne({_id: userId});
        var promise = query.exec();
    
        promise.then(function(user) {
          if(user){
            /*
            Mongoose objects do not let us
            modify properties.
            Create a new object that
            we can modify*/
            var requestUser = {
              userId: user._id,
              isAdmin: true,
              username: user.username
            };
            
            done(null, requestUser);
          } else {
            done("Session not found", false);
          }
        }, function(err) {
          done(err, false);
        });
      } else {
        var requestUser = {
          userId: user._id,
          isAdmin: false,
          username: user.username
        };
        
        done(null, requestUser);
      }
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
          if(!isMatch ) { return done(null, false); }
 
          var isAdmin = isMatch.isAdmin || false;

		  var username; 
          var userId;

          if(!isAdmin) {
            username = isMatch.user.username;
            userId = isMatch.user._id;
          } else {
            username = isMatch.adminUser.username;
            userId = isMatch.adminUser._id;
          }

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
          if(!isMatch) { return done(null, false); }
 
          var isAdmin = isMatch.isAdmin || false;

          // We must be admin otherwise something went seriously wrong
          // for this type of authentication
		  if(!isAdmin) { return done(null, false); }
      
		  var username = isMatch.adminUser.username;
          var userId = isMatch.adminUser._id;

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

  // Export the function to authenticate resource requests
  // store this in a session cookie
  this.isAuthenticated = function(req,res,next){
    if(req.user) {
       return next();
    }
    
    return passport.authenticate('basic', { session: true })(req, res, next);
  }

  this.isAdminAuthenticated = function(req,res,next){
    if(req.user && req.user.isAdmin) {
       return next();
    }
    
    return passport.authenticate('admin', { session: true })(req, res, next);
  }

  // returns the scope as a constructed auth object
  return this;
};
