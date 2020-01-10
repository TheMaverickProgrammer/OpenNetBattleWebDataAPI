/*
ChipModels uses routes use to POST and GET resources from the Mongo DB
*/
var ChipsModelModel = require('./models/ChipsModelModel');
var ChipsModel = require('./models/ChipsModel');

var ChipModelsController = {};


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

// POST API_IP/VERSION/chip-models/
// Create a NEW Chip
// AddChip
ChipModelsController.AddChip = function(req, res) {
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

  // Force description to fit 30 char limit
  if(typeof ChipModel.description !== 'undefined')
  ChipModel.description = ChipModel.description.substring(0, 30);

  // Force verboseDescription to fit a 300 char limit
  if(typeof ChipModel.verboseDescription !== 'undefined') 
    ChipModel.verboseDescription = ChipModel.verboseDescription.substring(0, 300);

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

// GET API_IP/VERSION/chip-models/:id
// Get a list of chips that share the same model
// GetChipModelByID
ChipModelsController.GetChipModelByID = function(req, res) {
  var query = ChipsModelModel.find({_id: req.params.id});

  var promise = query.exec();

  promise.then(function(ChipModel) {
    if(ChipModel === null) {
		  res.status(500).json({message: "Failed to find chip model with that ID"});
		  return;
    }
    
    res.json({data: ChipModel});

  }, function(err) {
      res.status(500).json({error: err});
  });
}
// PUT API_IP/VERSION/chip-models/:id
// Update a Chip Model
// UpdateChipModel
ChipModelsController.UpdateChipModel = function(req, res) {
  var query = ChipsModelModel.findOne({_id: req.params.id});

  var promise = query.exec();

  promise.then(function(ChipModelModel) {
    if(ChipModelModel == null) {
      res.status(500).json({error: "No ChipModel with that ID to update"});
      return;
    }

    ChipModelModel.name = req.body.name || ChipModelModel.name;
    ChipModelModel.description = req.body.description || ChipModelModel.description;
    ChipModelModel.verboseDescription = req.body.verboseDescription || ChipModelModel.verboseDescription;
    ChipModelModel.codes = req.body.codes || ChipModelModel.codes;
    ChipModelModel.damage = req.body.damage || ChipModelModel.damage;
    ChipModelModel.element = req.body.element || ChipModelModel.element;
    ChipModelModel.secondaryElement = req.body.secondaryElement || ChipModelModel.secondaryElement;
    ChipModelModel.image = req.body.image || ChipModelModel.image;
    ChipModelModel.icon = req.body.icon || ChipModelModel.icon;

    // Force description to fit 30 char limit
    if(typeof ChipModelModel.description !== 'undefined')
    ChipModelModel.description = ChipModelModel.description.substring(0, 30);

    // Force verboseDescription to fit a 300 char limit
    if(typeof ChipModelModel.verboseDescription !== 'undefined') 
    ChipModelModel.verboseDescription = ChipModelModel.verboseDescription.substring(0, 300);
	
    var promiseSave = ChipModelModel.save();
    promiseSave.then(function(ChipModelModel){
      var modelId = ChipModelModel._id;

      var chipsQuery = ChipsModel.find({modelId: modelId});
      var promise = chipsQuery.exec();

      var count = 0;
      var countMax = ChipsModelModel.codes.size();
      promise.then(function(Chip) {
        if(count < countMax) {
          // update it
          Chip.code = ChipModelModel.codes[count] || Chip.code;
          Chip.save().exec();
        } else {
          Chip.remove().exec(); // we need to get rid of it now it is not fitting
        }

        count++;
      }).finally(function() {
        // If we have more codes than we did before the update
        // we need to create new chips
        if(count < countMax) {
          var remainingCodes = ChipModelModel.codes.slice(count, countMax);
          makeChips(db, ChipMode._id, remaingingCodes);
        }
      });

      res.json({data: ChipModelModel});
    },function(err){
      res.status(500).json({error: err});
    });
  }, function(err) {
      res.status(500).json({error: err});
  });
}

// DELETE API_IP/VERSION/chip-models/:id
// Delete a ChipModel permanently (includes model and all linked chips will become invalidated)
// DeleteChipModel
ChipModelsController.DeleteChipModel = function(req, res) {
  var query = ChipsModelModel.findOne({_id: req.params.id});

  var promise = query.exec();

  promise.then(function(post) {
    var modelId = post._id;

    var chipsQuery = ChipsModel.find({modelId: modelId});
    var promiseChipsRemove = chipsQuery.remove();
    promiseChipsRemove.exec();

    var promiseChipModelRemove = post.remove();
    promiseChipModelRemove.exec();

    // We don't care too much about the result of the chip entries
    // As long as the model is removed, the chips will point to invalidated
    // data.
    promiseChipModelRemove.then(function(){
      res.status(200).json({data: {message: "ChipModel data removed"}});
    },function(err){
      res.status(500).json({error: err});
    });
  }, function(err) {
      res.status(500).json({error: err});
  });
}

module.exports = ChipModelsController;
