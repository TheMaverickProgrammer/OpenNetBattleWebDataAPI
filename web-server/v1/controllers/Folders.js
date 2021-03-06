/*
Folders uses routes use to Folders and GET resources from the Mongo DB
*/
const moment = require('moment');
const settings = require('../../server-settings');

var FoldersModel = require('./models/FoldersModel');
var FoldersController = {};

var validateUserFolderName = async function (userId, foldername) {
  var result = false;
  var p = FoldersModel.findOne({userId: userId, name: foldername}).exec();
  await p.then((Folder) => {
    if(Folder == null) {
      result = true;
    }
  });
  return result;
}

// POST API_IP/VERSION/folders/
// Create a NEW Folder
// AddFolder
FoldersController.AddFolder = async function(req, res) {
  // Users can only create Folders for their own account
  var userId = req.user.userId;

  var Folders = {
    userId: userId,
    name: req.body.name,
    cards: req.body.cards || []
  };

  // Force name to fit char limit
  if(Folders.name.length > settings.preferences.maxFolderNameLength) {
    Folders.name = Folders.name.substring(0, settings.preferences.maxFolderNameLength);
  }

  if(await validateUserFolderName(userId, Folders.name) == false) {
    return res.status(500).json({error: "You already have a folder with the same name"});
  }

  // Execute a query
  var model = new FoldersModel(Folders);
  var promise = model.save();

  promise.then(function(Folders) {
    res.json({data: Folders});
  }).catch(function(err) {
    res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/folders/
// Get ALL Folders
// GetFoldersList
FoldersController.GetFoldersList = function(req, res) {  
  var query = FoldersModel.find({userId: req.user.userId});
  var promise = query.exec();

  promise.then(function(Folders) {
    res.json({data: Folders});
  }).catch(function(err) {
    res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/folders/:id
// Get a single Folders
// GetFoldersByID
FoldersController.GetFolderByID = function(req, res) {
  folderId = req.params.id;

  var query = FoldersModel.findOne({userId: req.user.userId, _id: folderId});
  var promise = query.exec();

  promise.then(function(Folders) {
    if(Folders == null) {
      throw "No Folder with that ID";
    }

    return res.json({data: Folders});
  }).catch(function(err) {
    res.status(500).json({error: err});
  });
}

// PUT API_IP/VERSION/folders/:id
// Update a Folder
// UpdateFolder
FoldersController.UpdateFolder = function(req, res) {
  var query = FoldersModel.findOne({userId: req.user.userId, _id: req.params.id});
  var promise = query.exec();

  promise.then(async function(Folders) {    
    if(Folders == null) {
      throw "No Folder with that ID to update";
    }

    var nameBefore = Folders.name;

    Folders.name = req.body.name || Folders.name;
    Folders.cards = req.body.cards || Folders.cards;

    // Force name to fit char limit
    if(Folders.name.length > settings.preferences.maxFolderNameLength) {
      Folders.name = Folders.name.substring(0, settings.preferences.maxFolderNameLength);
    }

    if(Folders.name != nameBefore) {
      if(await validateUserFolderName(req.user.userId, Folders.name) == false) {
        throw "You already have a folder with the same name";
      }
    }

    return await Folders.save();
  }).then(function(Folders){
    res.json({data: Folders});
  }).catch(function(err) {
    console.log("error: " + err);
    res.status(500).json({error: err});
  });
}

// DELETE API_IP/VERSION/folders/:id
// Delete a Folder permanently
// DeleteFolder
FoldersController.DeleteFolder = function(req, res) {
  var query = FoldersModel.findOne({userId: req.user.userId, _id: req.params.id});

  var promise = query.exec();
  var name;

  promise.then(function(Folders) {
    if(Folders !== null) {
      name = Folders.name;
      return Folders.deleteOne();
    }

    throw "Could not find a folder with that ID";
  }).then(function(){
    res.status(200).json({data: {message: "Folder " + name + " removed"}});
  }).catch(function(err) {
    res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/folders/since/:time
// Get an array of folders after the time (in seconds)
// GetFoldersAfterDate
FoldersController.GetFoldersAfterDate = function(req, res) {
  var query = FoldersModel.find({userId: req.user.userId, updated: { $gte : moment.unix(req.params.time) }}).exec();
  
  query.then(function(folders) {
    res.json({data: folders});
  }).catch(function(err) {
    res.status(500).json({error: err});
  });
}

module.exports = FoldersController;
