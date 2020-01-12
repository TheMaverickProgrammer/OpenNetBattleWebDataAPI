/*
PublicFolders uses routes use to PublicFolders and GET resources from the Mongo DB
*/
var PublicFoldersModel = require('./models/PublicFoldersModel');

var PublicFoldersController = {};

// POST API_IP/VERSION/PublicFolders/
// Create a NEW PublicFolder
// AddPublicFolder
PublicFoldersController.AddPublicFolder = function(req, res) {
  var db = req.database;

  var PublicFolders = {
    name: req.body.name,
    cards: req.body.cards || []
  };

  // Force name to fit 8 char limit
  if(typeof PublicFolders.name !== 'undefined')
    PublicFolders.name = PublicFolders.name.substring(0, 8);

  // Execute a query
  var model = new PublicFoldersModel(PublicFolders);

  var promise = model.save();

  promise.then(function(PublicFolders) {
    res.json({data: PublicFolders});
  }, function(err) {
    res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/PublicFolders/
// Get ALL PublicFolders
// GetPublicFoldersList
PublicFoldersController.GetPublicFoldersList = function(req, res) {  
  var query = PublicFoldersModel.find().exec();

  query.then(function(PublicFolders) {
    res.json({data: PublicFolders});
  }, function(err) {
    res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/PublicFolders/:id
// Get a single PublicFolder
// GetPublicFolderByID
PublicFoldersController.GetPublicFolderByID = function(req, res) {
  var query = PublicFoldersModel.findById(req.params.id);
  var promise = query.exec();

  promise.then(function(PublicFolders) {
    if(PublicFolders !== null) {
      return res.json({data: PublicFolders});
    }

    throw "Could not find a public folder with that ID";
  }).catch(function(err) {
    res.status(500).json({error: err});
  });
}

// DELETE API_IP/VERSION/PublicFolders/:id
// Delete a PublicFolder permanently
// DeletePublicFolder
PublicFoldersController.DeletePublicFolder = function(req, res) {
  var query = PublicFoldersModel.findById(req.params.id).exec();
  var name;

  query.then(function(PublicFolders, reject) {
    if(PublicFolders !== null) {
      name = PublicFolders.name;
      return PublicFolders.deleteOne();
    }

    throw "Could not find a public folder with that ID";
  }).then(function(PublicFolder){
    res.status(200).json({data: {message: "Public folder " + name + " removed"}});
  }).catch(function(err) {
    res.status(500).json(err);
  });
}

module.exports = PublicFoldersController;
