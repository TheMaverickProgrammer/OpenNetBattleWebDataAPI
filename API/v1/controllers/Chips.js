/*
Chips uses routes use to POST and GET resources from the Mongo DB
*/
var ChipsModel = require('./models/ChipsModel');
var ChipsModelModel = require('./models/ChipsModelModel');

var ChipsController = {};

function makeChips(db,id,codes) {
  codes.forEach((c) => {
    var Chip = {
      modelId: id,
      code: c
    };

    var model = ChipsModel(Chip);
    var promise = model.save();
    
    promise.then(function(Chip) {
		  // Do nothing
		}, function(err) {
		  res.status(500).json({error: err});
		});
  });
}

// POST API_IP/VERSION/chips/
// Create a NEW Chip
// AddChip
ChipsController.AddChip = function(req, res) {
  var db = req.database;

  var ChipModel = {
    name: req.body.name,
    description: req.body.description,
    verboseDescription: req.body.verboseDescription,
    codes: req.body.codes,
    damage: req.body.damage,
    element: req.body.element,
    secondaryElement: req.body.secondaryElement,
    image: req.body.image,
    icon: req.body.icon
  };

  // Force description to fit 200 char limit
  if(typeof ChipModel.description !== 'undefined')
  ChipModel.description = ChipModel.description.substring(0, 200);

  // Force verboseDescription to fit a 1000 char limit
  if(typeof ChipModel.verboseDescription !== 'undefined') 
    ChipModel.verboseDescription = ChipModel.verboseDescription.substring(0, 1000);

  // Execute a query
  // Yes it's a mongoose model of a chip model
  var model = new ChipsModelModel(ChipModel);

  var promise = model.save();

  promise.then(function(ChipModel) {
    res.json({data: ChipModel});

    makeChips(db, ChipModel._id, ChipModel.codes);

  }, function(err) {
    res.status(500).json({error: err});
  });
}

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

// PUT API_IP/VERSION/Chips/:id
// Update a Chip 
// UpdateChip
ChipsController.UpdateChip = function(req, res) {
  var query = ChipsModelModel.findOne({_id: req.params.id});

  var promise = query.exec();

  promise.then(function(ChipModelModel) {
    if(ChipModelModel == null) {
      res.status(500).json({error: "No ChipModel with that ID to update"});
      return;
    }
    
    var promiseSave = ChipModelModel.save();
    promiseSave.then(function(ChipModelModel){
      res.json(ChipModelModel);
    },function(err){
      res.status(500).json({error: err});
    });
  }, function(err) {
      res.status(500).json({error: err});
  });
}

// DELETE API_IP/VERSION/Chips/:id
// Delete a Chip permanently (includes model and all linked chips)
// DeleteChips
ChipsController.DeleteChip = function(req, res) {
  var query = ChipsModelModel.findOne({_id: req.params.id});

  var promise = query.exec();

  promise.then(function(post) {
    var modelId = post._id;

    var promiseRemove = post.remove();

    var query = ChipsModel.find({modelId: modelId});

    promiseRemove.then(function(){
      res.status(200).json({data: {message: "Chip removed"}});
    },function(err){
      res.status(500).json({error: err});
    });
  }, function(err) {
      res.status(500).json({error: err});
  });
}

module.exports = ChipsController;
