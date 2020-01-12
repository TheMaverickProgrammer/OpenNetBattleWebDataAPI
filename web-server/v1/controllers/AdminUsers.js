/*
AdminUsers uses routes use to POST and GET resources from the Mongo DB
*/
var AdminUsersModel = require('./models/AdminUsersModel');

var AdminUsersController = {};

// POST API_IP/VERSION/admin/
// Create a NEW adminUser
// AddadminUser
AdminUsersController.AddAdminUser = function(req, res) {
  var db = req.database;

  var adminUser = {
    username: req.body.username,
    password: req.body.password
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

module.exports = AdminUsersController;
