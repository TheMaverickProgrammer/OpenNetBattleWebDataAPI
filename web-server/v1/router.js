/*
Author: Maverick Peppers
Date: 12/16/2019
Description: Router to map resources to controllers via URL endpoints
*/

module.exports = function Router(database, settings) {
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

  // CARD PROPERTIES RESOURCE
  var cardProperties = require('./controllers/CardProperties');

  // CARD COMBOS RESOURCE
  var cardCombos = require('./controllers/CardCombos');

  // FOLDERS RESOURCE
  var folders = require('./controllers/Folders');

  // PUBLIC FOLDERS RESOURCE
  var publicFolders = require('./controllers/PublicFolders');

  /** RESOURCES */

  // must use this endpoint to login and get a session cookie
  router.get('/login', auth.isAuthenticated, function(req, res){
    res.status(200).json({
        status: 'Login successful!',
	    user: req.user
    });
  });
  
  // Will always logout and clear the session cookie
  router.get('/logout', function(req, res){
    req.logout();
	  res.clearCookie(settings.server.name + ' Cookie');
    res.status(200).json({
      status: 'Logout successful!',
    });
  });

  // Use this endpoint to create admins remotely
  router.route('/admin')
    .post(auth.isAdminAuthenticated, adminUsers.AddAdminUser);
	
  router.route('/admin/:id')
    .get(auth.isAdminAuthenticated, adminUsers.GetAdminUserByID)
    .put(auth.isAuthenticated, adminUsers.UpdateAdminUser)
    .delete(auth.isAdminAuthenticated, adminUsers.DeleteAdminUser);

  // Use the users module as an endpoint
  router.route('/users')
    .get(auth.isAdminAuthenticated, users.GetUsersList)
    .post(function(req, res, next) {
      if(req.user && !req.user.isAdmin) 
        return res.status(500).json({error: "Sign out before creating a new acount"});

      let ip = "";

      if(req.ips.length) ip = req.ips[0];
      else ip = req.ip;

      // See if using IPv6
      if(ip.indexOf(".") > -1) {
        if(ip.substr(0,7) != "::ffff:") {
          return res.status(500).json({error: "Invalid IPv6 format"});
        }
      }
      
      if(settings.server.signupWhiteList.findIndex( item => item === ip) > -1) {
        next();
      } else {
        return res.status(401).end();
      }
    }, users.AddUser);

  router.route('/users/:id')
    .get(function(req, res, next) {
      if(req.user && req.user.isAdmin) {
        return next();
      } else if(req.user && req.params.id == req.user.userId) {
        return next();
      }
      
      return res.status(401).end();
	  }, users.GetUserByID)
    .put(auth.isAuthenticated, users.UpdateUser)
    .delete(auth.isAdminAuthenticated, users.DeleteUser);

  router.route('/users/since/:time')
    .get(auth.isAdminAuthenticated, users.GetUsersAfterDate);

  // Use the cards module as an endpoint
  router.route('/cards')
    .get(auth.isAuthenticated, cards.GetCardsList);

  router.route('/cards/since/:time')
     .get(auth.isAuthenticated, cards.GetCardsAfterDate)

  router.route('/cards/:id')
    .get(auth.isAuthenticated, cards.GetCardByID)
    .delete(auth.isAdminAuthenticated, cards.DeleteCard); // only admin delete cards

  router.route('/cards/byModel/:id')
    .get(auth.isAuthenticated, cards.GetCardsByModelID);

  // Use the card properties module as an endpoint
  router.route('/card-properties/')
    .post(auth.isAdminAuthenticated, cardProperties.AddCardProperties);

  router.route('/card-properties/:id')
    .get(auth.isAuthenticated, cardProperties.GetCardPropertiesByID)
    .put(auth.isAdminAuthenticated, cardProperties.UpdateCardProperties)
    .delete(auth.isAdminAuthenticated, cardProperties.DeleteCardProperties);

  router.route('/card-properties/since/:time')
    .get(auth.isAuthenticated, cardProperties.GetCardPropertiesAfterDate);

  // Use the card combos module as an endpoint
  router.route('/combos')
    .get(auth.isAuthenticated, cardCombos.GetCardComboList)
    .post(auth.isAdminAuthenticated, cardCombos.AddCardCombo);

  router.route('/combos/:id')
    .get(auth.isAuthenticated, cardCombos.GetCardComboByID)
    .put(auth.isAdminAuthenticated, cardCombos.UpdateCardCombo)
    .delete(auth.isAdminAuthenticated, cardCombos.DeleteCardCombo);

  router.route('/combos/since/:time')
    .get(auth.isAuthenticated, cardCombos.GetCardCombosAfterDate);

  // Use the folders module as an endpoint
  router.route('/folders')
    .get(auth.isAuthenticated, folders.GetFoldersList)
    .post(auth.isAuthenticated, folders.AddFolder);

  router.route('/folders/:id')
    .get(auth.isAuthenticated, folders.GetFolderByID)
    .put(auth.isAuthenticated, folders.UpdateFolder)
    .delete(auth.isAuthenticated, folders.DeleteFolder);

  router.route('/folders/since/:time')
    .get(auth.isAuthenticated, folders.GetFoldersAfterDate);

  // Use the events module as an endpoint
  router.route('/public-folders')
    .get(auth.isAuthenticated, publicFolders.GetPublicFoldersList)
    .post(auth.isAuthenticated, publicFolders.AddPublicFolder);

  router.route('/public-folders/:id')
    .get(auth.isAuthenticated, publicFolders.GetPublicFolderByID)
    .delete(auth.isAdminAuthenticated, publicFolders.DeletePublicFolder);

  router.route('/public-folders/since/:time')
    .get(auth.isAuthenticated, publicFolders.GetPublicFoldersAfterDate);

  return router;
};
