/*
Folders uses routes use to Folders and GET resources from the Mongo DB
*/
var FoldersModel = require('./models/FoldersModel');

var FoldersController = {};

// POST API_IP/VERSION/Folders/
// Create a NEW Folder
// AddFolder
FoldersController.AddFolder = function(req, res) {
  var db = req.database;

  // Users can only create Folders for their own account
  var userId = req.user.userId;

  var Folders = {
    uderId: userId,
    name: req.body.name,
    chips: req.body.chips || []
  };

  // Force name to fit 8 char limit
  if(typeof Folders.name !== 'undefined')
    Folders.name = Folders.name.substring(0, 8);

  // Execute a query
  var model = new FoldersModel(Folders);

  var promise = model.save();

  promise.then(function(Folders) {
    res.json(Folders);
  }, function(err) {
    res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/Folders/
// Get ALL Folders
// GetFoldersList
FoldersController.GetFoldersList = function(req, res) {
  userId = req.body.userId;
  
  var query = FoldersModel.find({userId: req.user.userId});

  var promise = query.exec();

  promise.then(function(Folders) {
    res.json({Folders});
  }, function(err) {
    res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/Folders/:id
// Get a single Folders
// GetFoldersByID
FoldersController.GetFolderByID = function(req, res) {
  var query = FoldersModel.findOne({_id: req.params.id});

  var promise = query.exec();

  promise.then(function(Folders) {
    res.json(Folders);
  }, function(err) {
    res.status(500).json({error: err});
  });
}

// PUT API_IP/VERSION/Folders/:id
// Update a Folder
// UpdateFolder
FoldersController.UpdateFolder = function(req, res) {
  var query = FoldersModel.findOne({_id: req.params.id});

  var promise = query.exec();

  promise.then(function(Folders) {
    if(Folders == null) {
      res.send({status: "BAD", message: "No Folders to update"});
      return;
    }

    Folders.name = req.body.name || Folders.name;
    Folders.chips = req.body.description || Folders.chips;

    var promiseSave = Folders.save();

    promiseSave.then(function(Folders){
      res.json(Folders);
    },function(err){
      res.send(err);
    });
  }, function(err) {
      res.send(err);
  });
}

// DELETE API_IP/VERSION/Folders/:id
// Delete a Folder permanently
// DeleteFolder
FoldersController.DeleteFolder = function(req, res) {
  var query = BlogPostModel.findOne({_id: req.params.id});

  var promise = query.exec();

  promise.then(function(Folders) {
    var promiseRemove = Folders.remove();

    promiseRemove.then(function(){
      res.json({status: "OK", message: "Folders removed"});
    },function(err){
      res.send(err);
    });
  }, function(err) {
      res.send(err);
  });
}

module.exports = FoldersController;
