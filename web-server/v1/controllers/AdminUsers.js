/*
AdminUsers uses routes use to POST and GET resources from the Mongo DB
*/
const moment = require('moment');
var AdminUsersModel = require('./models/AdminUsersModel');
var AdminUsersController = {};

// POST API_IP/VERSION/admin/
// Create a NEW adminUser
// AddAdminUser
AdminUsersController.AddAdminUser = function(req, res) {
  var db = req.database;

  var adminUser = {
    username: req.body.username,
    twitter: req.body.twitter || "",
    password: req.body.password,
    email: req.body.email,
    created: Date.now()
  };

  // Execute a query
  var model = new AdminUsersModel(adminUser);
  var promise = model.save();

  promise.then(function(adminUser) {
    res.json({data: adminUser});
  }).catch(function(err) {
    res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/admin/:id
// Get a single Admin User
// GetAdminUserByID
AdminUsersController.GetAdminUserByID = function(req, res) {
  var query = AdminUsersModel.findById(req.params.id);

  var promise = query.exec();

  promise.then(function(adminUser) {
    res.json({data: adminUser});
  }).catch((err) => {
    res.status(500).json({error: err});
  });
}

// PUT API_IP/VERSION/admin/:id
// Update an Admin User
// UpdateAdminUser
AdminUsersController.UpdateAdminUser = function(req, res) {
  if(!req.user.isAdmin) {
	  res.status(401).json({error: "Not Authenticated"});;
  }

  AdminUsersModel.findById(req.params.id).then(async (adminUser) => {
    if(adminUser == null) {
      throw "Admin User not found with that ID";
    }

    adminUser.username = req.body.publicName || adminUser.username;
    adminUser.twitter  = req.body.twitterUrl || adminUser.twitter;
    adminUser.password = req.body.password || adminUser.password;
    adminUser.email    = req.body.email || adminUser.email;
    return await adminUser.save();
  }).then((updatedModel) => {
      res.status(200).json({
          data: updatedModel
      });
  }).catch((err) => {
      res.status(500).json({error: err});
  });
}

// DELETE API_IP/VERSION/admin/:id
// Delete an admin permanently
// DeleteAdminUser
AdminUsersController.DeleteAdminUser = function(req, res) {
  var query = AdminUsersModel.findById(req.params.id).exec();
  var name;

  query.then(async function(adminUser) {
    if(adminUser !== null) {
      name = adminUser.username;
      return await adminUser.deleteOne();
    }
    throw "Admin User not found with that ID";
  }).then(function(){
    res.status(200).json({data: {message: "Admin User " + name + " removed"}});
  }).catch(function(err) {
    res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/admin/since/:time
// Get an array of admins after the time (in seconds)
// GetAdminsAfterDate
AdminUsersController.GetAdminsAfterDate = function(req, res) {
  let promise = AdminUsersModel.find({updated: { $gte : moment.unix(req.params.time) }}).exec();
  
  promise.then(admins => {
    res.json({data: admins});
  }).catch(err => {
    res.status(500).json({error: err});
  });
}

module.exports = AdminUsersController;
