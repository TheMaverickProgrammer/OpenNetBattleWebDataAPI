/*
Author: Maverick Peppers
Date: 12/16/2019
Description: Router to map resources to controllers via URL endpoints
*/

module.exports = function Router(database) {
  var db = database;

  var router = require('express').Router();

  // Require the auth module
  var auth = require('./auth')(db);

  // USERS RESOURCE
  var users = require('./controllers/Users');

  // ADMIN USERS RESOURCE
  var adminUsers = require('./controllers/AdminUsers');

  // CARDS RESOURCE
  var cards = require('./controllers/Cards');

  // CARD MODELS RESOURCE
  var cardModels = require('./controllers/CardModels');

  // FOLDERS RESOURCE
  var folders = require('./controllers/Folders');

  // PUBLIC FOLDERS RESOURCE
  var publicFolders = require('./controllers/PublicFolders');

  /** RESOURCES */

  // must use this endpoint to login and get a session cookie
  router.get('/login', auth.isAuthenticated, function(req, res){
    res.status(200).json({
        status: 'Login successful!'
    });
  });
  
  // Will always logout and clear the session cookie
  router.get('/logout', function(req, res){
    req.logout();
    res.status(200).json({
      status: 'Logout successful!'
    });
  });

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

  // Use the cards module as an endpoint
  router.route('/cards')
    .get(auth.isAuthenticated, cards.GetCardsList);

  router.route('/cards/:id')
    .get(auth.isAuthenticated, cards.GetCardByID)
    .delete(auth.isAdminAuthenticated, cards.DeleteCard); // only admin delete cards

  router.route('/cards/byModel/:id')
    .get(auth.isAuthenticated, cards.GetCardsByModelID);

  router.route('/card-models/')
    .post(auth.isAuthenticated, cardModels.AddCard);

  router.route('/card-models/:id')
    .get(auth.isAuthenticated, cardModels.GetCardModelByID)
    .put(auth.isAdminAuthenticated, cardModels.UpdateCardModel)
    .delete(auth.isAdminAuthenticated, cardModels.DeleteCardModel);

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

  return router;
};
