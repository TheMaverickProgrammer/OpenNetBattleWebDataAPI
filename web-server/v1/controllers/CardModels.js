/*
CardModels uses routes use to POST and GET resources from the Mongo DB
*/
var CardModelsModel = require('./models/CardModelsModel');
var CardsModel = require('./models/CardsModel');

const settings = require('../../server-settings');
const moment = require('moment');

var CardModelsController = {};

function makeCards(id,codes) {
  var allCodes = codes.map((c) => {
    var Card = {
      modelId: id,
      code: c
    };

    var model = new CardsModel(Card);
    return model.save();
  });

  return Promise.all(allCodes);
}

// POST API_IP/VERSION/card-models/
// Create a NEW Card
// AddCard
CardModelsController.AddCard = function(req, res) {
  var CardModel = {
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

  // Force card name to fit char limit
  CardModel.name = CardModel.name.substring(0, settings.preferences.maxCardNameLength);

  // Force description to fit char limit
  if(typeof CardModel.description !== 'undefined')
  CardModel.description = CardModel.description.substring(0, settings.preferences.maxDescriptionLength);

  // Force verboseDescription to fit char limit
  if(typeof CardModel.verboseDescription !== 'undefined') 
    CardModel.verboseDescription = CardModel.verboseDescription.substring(0, settings.preferences.maxVerboseDescriptionLength);

  // Execute a query
  // Yes it's a mongoose model of a Card model
  var model = new CardModelsModel(CardModel);

  var promise = model.save();

  promise.then(async function(CardModel) {
    res.json({data: CardModel});

    return await makeCards(CardModel._id, CardModel.codes);
  }).catch(function(err) {
    res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/card-models/:id
// Get a list of Cards that share the same model
// GetCardModelByID
CardModelsController.GetCardModelByID = function(req, res) {
  var query = CardModelsModel.findById(req.params.id);

  var promise = query.exec();

  promise.then(function(CardModel) {
    if(CardModel === null) {
		  throw "Failed to find Card model with that ID";
    }
    
    res.json({data: CardModel});
  }).catch( (err) => {
    res.status(500).json({error: err});
  });
}
// PUT API_IP/VERSION/card-models/:id
// Update a Card Model
// UpdateCardModel
CardModelsController.UpdateCardModel = function(req, res) {
  var query = CardModelsModel.findById(req.params.id);
  var promise = query.exec();

  var count = 0;
  var countMax = 0;
  var codes = [];
  var modelId;
  var all_completed_successfully = false;
  var newCardModel;

  promise.then(async (CardModel) => {
    if(CardModel == null) {
      throw "No CardModel with that ID to update";
    }

    CardModel.name = req.body.name || CardModel.name;
    CardModel.description = req.body.description || CardModel.description;
    CardModel.verboseDescription = req.body.verboseDescription || CardModel.verboseDescription;
    CardModel.codes = req.body.codes || CardModel.codes;
    CardModel.damage = req.body.damage || CardModel.damage;
    CardModel.element = req.body.element || CardModel.element;
    CardModel.secondaryElement = req.body.secondaryElement || CardModel.secondaryElement;
    CardModel.image = req.body.image || CardModel.image;
    CardModel.icon = req.body.icon || CardModel.icon;

    // Update our new max
    countMax = CardModel.codes.length;

    // Force card name to fit char limit
    CardModel.name = CardModel.name.substring(0, settings.preferences.maxCardNameLength);

    // Force description to fit char limit
    if(typeof CardModel.description !== 'undefined')
      CardModel.description = CardModel.description.substring(0, settings.preferences.maxDescriptionLength);

    // Force verboseDescription to fit char limit
    if(typeof CardModel.verboseDescription !== 'undefined') 
      CardModel.verboseDescription = CardModel.verboseDescription.substring(0, settings.preferences.maxVerboseDescriptionLength);
    
    return await CardModel.save();
  }).then((CardModel) => {
    newCardModel = CardModel;
    modelId = CardModel._id;
    codes = CardModel.codes;

    // Things is looking through the Cards table
    var CardsQuery = CardsModel.find({modelId: modelId});
    return CardsQuery.exec();
    
  }).then((Cards) => {
    var i = 0;
    try{
      Cards.map((card) => {
        return (
          /*
            Needed to capture var `i` in a closure in order to track the count of all successful items
          */
          async function(i) {
            if(i < countMax) {
              // update it
              card.code = codes[i] || card.code;
              await CardsModel(card).save();
            } else {
              // we need to get rid of it now it is not fitting
              await CardsModel.findById(card._id).deleteOne();
            }
          }
        )(i++);
      });
      
      count = i;
      all_completed_successfully = true;
    } catch (e) {
      throw e;
    }
  }).catch((err) => {
    res.status(500).json({error: err});
  }).finally(async () => {
    if(all_completed_successfully) {
      // If we have more codes than we did before the update
      // we need to create new Cards
      if(count < countMax) {
        var remainingCodes = codes.slice(count, countMax);
        await makeCards(modelId, remainingCodes);
      }

      res.status(200).json({data: newCardModel});
    }
  });
}

// DELETE API_IP/VERSION/card-models/:id
// Delete a CardModel permanently (includes model and all linked Cards will become invalidated)
// DeleteCardModel
CardModelsController.DeleteCardModel = function(req, res) {
  var query = CardModelsModel.findById(req.params.id);
  
  query.exec().then(function(post) {
    if(post == null) {
      throw "No CardModel with that ID to delete";
    }

    return post.deleteOne();
  }).then(function(post) {
    var modelId = post._id;

    // Don't really care if individual cards fail or not. 
    // We can clean them up manually with their DELETE API call...
    CardsModel.find({modelId: modelId}).exec().then((Cards) => Cards.map((Card) => { Card.deleteOne(); }));
    res.status(200).json({data: {message: "CardModel "  + modelId + " and related Card data removed"}});
  }).catch((err) => {
    res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/card-models/since/:time
// Get an array of card models after the time (in seconds)
// GetCardModelsAfterDate
CardModelsController.GetCardModelsAfterDate = function(req, res) {
  var promise = CardModelsModel.find({updated: { $gte : moment.unix(req.params.time) }}).exec();
  
  promise.then(function(models) {
    res.json({data: models});
  }).catch(function(err) {
    res.status(500).json({error: err});
  });
}

module.exports = CardModelsController;
