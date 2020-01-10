/*
Chips uses routes use to POST and GET resources from the Mongo DB
*/
var ChipsModel = require('./models/ChipsModel');
var ChipsModelModel = require('./models/ChipsModelModel');

var ChipsController = {};

// GET API_IP/VERSION/Chips/
// Get ALL Chips
// GetChipsList
ChipsController.GetChipsList = function(req, res) {
  ChipsModel.find(function(err, Chips) {
    if(err) {
      res.status(500).json({error: err});
      return;
    } else {
      res.json({data: Chips});
    }
  });
}

// GET API_IP/VERSION/Chips/:id
// Get a single Chip
// GetChipByID
ChipsController.GetChipByID = function(req, res) {
  var query = ChipsModel.findOne({_id: req.params.id});

  var promise = query.exec();

  promise.then(function(Chip) {
    if(Chip === null) {
		  res.status(500).json({message: "Failed to find a chip with that ID"});
		  return;
    }
    
    // Make a second database query to find the chip detail
    var detail = ChipsModelModel.findOne({_id: Chip.modelId});
    var promise = detail.exec();
    
    promise.then(function(ChipDetail) {
      res.json({data: {code: Chip.code, detail: ChipDetail}});
    }, function(err) {
      res.status(500).json({error: err});
    });
  }, function(err) {
      res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/Chips/byModel/:id
// Get a list of chips that share the same model
// GetChipsByModelID
ChipsController.GetChipsByModelID = function(req, res) {
  var query = ChipsModel.find({modelId: req.params.id});

  var promise = query.exec();

  promise.then(function(Chips) {
    if(Chips === null) {
		  res.status(500).json({message: "Failed to find chips with that model ID"});
		  return;
    }
    
    res.json({data: Chips});

  }, function(err) {
      res.status(500).json({error: err});
  });
}

module.exports = ChipsController;
