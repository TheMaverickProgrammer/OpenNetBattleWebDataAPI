/*
Users uses routes use to POST and GET resources from the Mongo DB
*/
const moment = require('moment');
var UsersModel = require('./models/UsersModel');
var UsersController = {};

var validateUserName = async function (name) {
  var result = false;
  var p = UsersModel.findOne({username: name}).exec();
  await p.then((user) => {
    if(user == null) {
      result = true;
    }
  });
  return result;
}

// POST API_IP/VERSION/users/
// Create a NEW User
// AddUser
UsersController.AddUser = async function(req, res) {
  var user = {
    username: req.body.username,
    twitter: req.body.twitter || "",
    password: req.body.password,
    email: req.body.email || "",
    created: Date.now()
  };

  // Force public name to fit 60 char limit
  if(typeof user.username !== 'undefined')
  user.username = user.username.substring(0, 60);

  if(await validateUserName(user.username) == false) {
    return res.status(500).json({error: "User with that name already exists"});
  }

  // Execute a query
  var model = new UsersModel(user);
  var promise = model.save();

  promise.then(function(user) {
    res.json({data: user});
  }).catch(err => {
    res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/users/
// Get ALL Users
// GetUsersList
UsersController.GetUsersList = function(req, res) {
  UsersModel.find({}, function(err, Users) {
    if(err) {
      res.status(500).json({error: err});
    } else {
      res.json({data: Users});
    }
  });
}

// GET API_IP/VERSION/users/:id
// Get a single User
// GetUserByID
UsersController.GetUserByID = function(req, res) {
  var query = UsersModel.findById(req.params.id);

  var promise = query.exec();

  promise.then(function(user) {
    let copy = { 
      username: user.username, 
      twitter: user.twitter, 
      email: user.email, 
      monies: user.monies,
      pool: user.pool || [],
      userId: user._id 
    };
	
    res.json({data: copy});
  }).catch((err) => {
    res.status(500).json({error: err});
  });
}

// PUT API_IP/VERSION/users/:id
// Update a User
// UpdateUser
UsersController.UpdateUser = function(req, res) {
  if(!(req.user.isAdmin || req.params.id == req.user.userId)) {
	  res.status(401).json({error: "Not Authenticated"});
  }

  UsersModel.findById(req.params.id).then(async (user) => {
    if(user == null) {
      throw "User not found with that ID";
    }

    user.username = req.body.username || user.username;
    user.twitter  = req.body.twitter || user.twitter;
    user.password = req.body.password || user.password;
    user.email    = req.body.email || user.email;
    
    return await user.save();
  }).then((updatedModel) => {
      let copy = { 
        username: updatedModel.username, 
        twitter: updatedModel.twitter, 
        email: updatedModel.email, 
        monies: updatedModel.monies,
        pool: updatedModel.pool || [],
        userId: updatedModel._id 
      };
      res.status(200).json({
          data: copy
      });
  }).catch((err) => {
      res.status(500).json({error: err});
  });
}

// DELETE API_IP/VERSION/users/:id
// Delete a user permanently
// DeleteUser
UsersController.DeleteUser = function(req, res) {
  var query = UsersModel.findById(req.params.id).exec();
  var name;

  query.then(function(user) {
    if(user !== null) {
      name = user.username;
      return user.deleteOne();
    }
    throw "User not found with that ID";
  }).then(function(){
    res.status(200).json({data: {message: "User " + name + " removed"}});
  }).catch(function(err) {
    res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/users/since/:time
// Get an array of users after the time (in seconds)
// GetUsersAfterDate
UsersController.GetUsersAfterDate = function(req, res) {
  let promise = UsersModel.find({updated: { $gte : moment.unix(req.params.time) }}).exec();
  
  promise.then(function(users) {
    res.json({data: users});
  }).catch(function(err) {
    res.status(500).json({error: err});
  });
}

module.exports = UsersController;
