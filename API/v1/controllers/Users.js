/*
Users uses routes use to POST and GET resources from the Mongo DB
*/
var UsersModel = require('./models/UsersModel');

var UsersController = {};

// POST API_IP/VERSION/users/
// Create a NEW User
// AddUser
UsersController.AddUser = function(req, res) {
  var db = req.database;

  var user = {
    username: req.body.username,
    twitter: req.body.twitter || "",
    password: req.body.password,
    email: req.body.email,
    created: Date.now()
  };

  // Force public name to fit 60 char limit
  if(typeof user.username !== 'undefined')
  user.username = user.username.substring(0, 60);

  // Execute a query
  var model = new UsersModel(user);
  var promise = model.save();

  promise.then(function(user) {
    res.json({data: user});
  }, function(err) {
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
  var query = UsersModel.findOne({_id: req.params.id});

  var promise = query.exec();

  promise.then(function(user) {
    res.json({data: user});
  }, function(err) {
    res.status(500).json({error: err});
  });
}

// PUT API_IP/VERSION/users/:id
// Update a User
// UpdateUser
UsersController.UpdateUser = function(req, res) {
  if(!(req.user.isAdmin || req.params.id == req.user.userId)) {
	res.status(401).json({error: "Not Authenticated"});
	return;
  }

  UsersModel.findById({_id: req.params.id}).then((user) => {
      user.username = req.body.publicName || user.username;
      user.twitter  = req.body.twitterUrl || user.twitter;
      user.password = req.body.password || user.password;
      user.email    = req.body.email || user.email;
      return user;
  }).then((user) => {
      return user.save();
  }).then((updatedModel) => {
      res.json({
          data: updatedModel
      });
  }).catch((err) => {
      res.status(500).json({error: err});
  });
}

// DELETE API_IP/VERSION/users/:id
// Delete a user permanently
// DeleteUser
UsersController.DeleteUser = function(req, res) {
  var query = UsersModel.findOne({_id: req.params.id});

  var promise = query.exec();

  promise.then(function(user) {
    var name = user.username;
    var promiseRemove = post.remove();

    promiseRemove.then(function(){
      res.status(200).json({data: {message: "User " + name + " removed"}});
    },function(err){
      res.status(500).json({error: err});
    });
  }, function(err) {
      res.status(500).json({error: err});
  });
}

module.exports = UsersController;
