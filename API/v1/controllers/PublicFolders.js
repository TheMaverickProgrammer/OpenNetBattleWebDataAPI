/*
PublicFolders uses routes use to PublicFolders and GET resources from the Mongo DB
*/
var PublicFoldersModel = require('./models/PublicFoldersModel');

var PublicFoldersController = {};

// POST API_IP/VERSION/PublicFolders/
// Create a NEW PublicFolders
// AddPublicFolders
PublicFoldersController.AddPublicFolders = function(req, res) {
  var db = req.database;

  var PublicFolders = {
    name: req.body.name,
    chips: req.body.chips || []
  };

  // Force name to fit 8 char limit
  if(typeof PublicFolders.name !== 'undefined')
    PublicFolders.name = PublicFolders.name.substring(0, 8);

  // Execute a query
  var model = new PublicFoldersModel(PublicFolders);

  var promise = model.save();

  promise.then(function(PublicFolders) {
    res.json(PublicFolders);
  }, function(err) {
    res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/PublicFolders/
// Get ALL PublicFolders
// GetPublicFoldersList
PublicFoldersController.GetPublicFoldersList = function(req, res) {  
  var query = PublicFoldersModel.find();

  var promise = query.exec();

  promise.then(function(PublicFolders) {
    res.json({PublicFolders});
  }, function(err) {
    res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/PublicFolders/:id
// Get a single PublicFolders
// GetPublicFoldersByID
PublicFoldersController.GetPublicFoldersByID = function(req, res) {
  var query = PublicFoldersModel.findOne({_id: req.params.id});

  var promise = query.exec();

  promise.then(function(PublicFolders) {
    res.json(PublicFolders);
  }, function(err) {
    res.status(500).json({error: err});
  });
}

// DELETE API_IP/VERSION/PublicFolders/:id
// Delete an PublicFolders permanently
// DeletePublicFolders
PublicFoldersController.DeletePublicFolders = function(req, res) {
  var query = BlogPostModel.findOne({_id: req.params.id});

  var promise = query.exec();

  promise.then(function(PublicFolders) {
    var promiseRemove = PublicFolders.remove();

    promiseRemove.then(function(){
      res.json({status: "OK", message: "PublicFolders removed"});
    },function(err){
      res.send(err);
    });
  }, function(err) {
      res.send(err);
  });
}

module.exports = PublicFoldersController;
