/*
Author: Maverick Peppers
Date: 12/16/2019
Description: Router to map resources to controllers via URL endpoints
*/

module.exports = function Router(database) {
  var db = database;

  var router = require('express').Router();

  // Require the passport module
  var passport = require('passport');

  // Require multi part form and storage modules
  var multer = require('multer');

  var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      var settings = require('../server-settings');
      var finalDest = settings.uploadDir;

      console.log("Disc storage dest: " + finalDest);

      cb(null, finalDest);
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + "-" + file.originalname);
    }
  });

  var upload = multer({ storage: storage});

  // Require the auth module
  var auth = require('./auth')(db);

  // USERS RESOURCE
  var users = require('./controllers/Users');

  // ADMIN USERS RESOURCE
  var adminUsers = require('./controllers/AdminUsers');

  // CHIPS RESOURCE
  var chips = require('./controllers/Chips');

  // CHIP MODELS RESOURCE
  var chipModels = require('./controllers/ChipModels');

  // FOLDERS RESOURCE
  var folders = require('./controllers/Folders');

  // PUBLIC FOLDERS RESOURCE
  var publicFolders = require('./controllers/PublicFolders');

  /** RESOURCES */

  // Use this endpoint to create admins remotely
  router.route('/admin')
    .post(adminUsers.AddAdminUser);

  // Use the users module as an endpoint
  router.route('/users')
    .get(auth.isAdminAuthenticated, users.GetUsersList)
    .post(auth.isAdminAuthenticated, users.AddUser);

  router.route('/users/:id')
    .get(auth.isAdminAuthenticated, users.GetUserByID)
    .put(auth.isAuthenticated, users.UpdateUser)
    .delete(auth.isAdminAuthenticated, users.DeleteUser);

  // Use the chips module as an endpoint
  router.route('/chips')
    .get(auth.isAuthenticated, chips.GetChipsList)

  router.route('/chips/:id')
    .get(auth.isAuthenticated, chips.GetChipByID)

  router.route('/chips/byModel/:id')
    .get(auth.isAuthenticated, chips.GetChipsByModelID);

  router.route('/chip-models/')
    .post(auth.isAuthenticated, chipModels.AddChip);

  router.route('/chip-models/:id')
    .get(auth.isAuthenticated, chipModels.GetChipModelByID)
    .put(auth.isAdminAuthenticated, chipModels.UpdateChipModel)
    .delete(auth.isAdminAuthenticated, chipModels.DeleteChipModel);

  // Use the folders module as an endpoint
  router.route('/folders')
    .get(auth.isAuthenticated, folders.GetFoldersList)
    .post(auth.isAuthenticated, folders.AddFolder);

  router.route('/folders/:id')
    .get(auth.isAuthenticated, folders.GetFolderByID)
    .put(auth.isAuthenticated, folders.UpdateFolder)
    .delete(auth.isAuthenticated, folders.DeleteFolder);

  // Use the events module as an endpoint
  router.route('/public-folders')
    .get(auth.isAuthenticated, publicFolders.GetPublicFoldersList)
    .post(auth.isAuthenticated, publicFolders.AddPublicFolder);

  router.route('/public-folders/:id')
    .get(auth.isAuthenticated, publicFolders.GetPublicFolderByID)
    .delete(auth.isAdminAuthenticated, publicFolders.DeletePublicFolder);

  router.get('/login', auth.isAuthenticated, function(req, res){
    res.status(200).json({
        status: 'Login successful!'
    });
  });
  
  router.get('/logout', auth.isAuthenticated, function(req, res){
    req.logout();
    res.status(200).json({
      status: 'Logout successful!'
    });
  });

  return router;
};
