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

  // FOLDERS RESOURCE
  var folders = require('./controllers/Folders');

  // PUBLIC FOLDERS RESOURCE
  var publicFolders = require('./controllers/PublicFolders');

  /** RESOURCES */

  // Use this endpoint to create admins remotely
  router.route('/admin')
    .post(auth.isAuthenticated, adminUsers.AddAdminUser);

  // Use the users module as an endpoint
  router.route('/users')
    .get(auth.isAuthenticated, users.GetUsersList)
    .post(auth.isAuthenticated, users.AddUser);

  router.route('/users/:id')
    .get(auth.isAuthenticated, users.GetUserByID)
    .put(auth.isAuthenticated, users.UpdateUser)
    .delete(auth.isAuthenticated, users.DeleteUser);

  // Use the coupons module as an endpoint
  router.route('/chips')
    .get(auth.isAuthenticated, chips.GetChipsList)
    .post(auth.isAuthenticated, chips.AddChip);

  router.route('/chips/:id')
    .get(auth.isAuthenticated, chips.GetChipByID)
    .put(auth.isAuthenticated, chips.UpdateChip)
    .delete(auth.isAuthenticated, chips.DeleteChip);

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
    .delete(auth.isAuthenticated, publicFolders.DeletePublicFolder);

  return router;
};
