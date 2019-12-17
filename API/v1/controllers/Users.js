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

  console.log("UsersController: " + JSON.stringify(req.body))

  var user = {
    username: req.body.username,
    twitter: req.body.twitter,
    password: req.body.password,
    email: req.body.email,
    created: Date.now()
  };

  console.log("new user: " + JSON.stringify(user))

  // Force public name to fit 60 char limit
  if(typeof user.username !== 'undefined')
  user.username = user.username.substring(0, 60);

  // Execute a query
  var model = new UsersModel(user);
  var promise = model.save();

  promise.then(function(user) {
    res.json(user);
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
      res.json(Users);
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
    res.json(user);
  }, function(err) {
    res.status(500).json({error: err});
  });
}

// PUT API_IP/VERSION/users/:id
// Update a User
// UpdateUser
UsersController.UpdateUser = function(req, res) {
  UsersModel.findById(req.params.id).then((user) => {
      user.username = req.body.publicName || user.username;
      user.twitter  = req.body.twitterUrl || user.twitter;
      user.password = req.body.password || user.password;
      user.email    = req.body.email || user.email;
      return user;
  }).then((user) => {
      return user.save();
  }).then((updatedModel) => {
      res.json({
          msg: 'model updated',
          updatedModel
      });
  }).catch((err) => {
      res.status(500).send(err);
  });
}

// DELETE API_IP/VERSION/users/:id
// Delete a user permanently
// DeleteUser
UsersController.DeleteUser = function(req, res) {
  var query = UsersModel.findOne({_id: req.params.id});

  var promise = query.exec();

  promise.then(function(businessUser) {
    var promiseRemove = post.remove();

    promiseRemove.then(function(){
      res.json({status: "OK", message: "User removed"});
    },function(err){
      res.send(err);
    });
  }, function(err) {
      res.send(err);
  });
}

module.exports = UsersController;
