/*
CardModels uses routes use to POST and GET resources from the Mongo DB
*/
var CardModelsModel = require('./models/CardModelsModel');
var CardsModel = require('./models/CardsModel');

var CardModelsController = {};


function makeCards(id,codes) {
  var allCodes = codes.map((c) => {
    var Card = {
      modelId: id,
      code: c
    };

    var model = CardsModel(Card);
    return model.save();
  });

  return Promise.all(allCodes);
}

// POST API_IP/VERSION/card-models/
// Create a NEW Card
// AddCard
CardModelsController.AddCard = function(req, res) {
  var db = req.database;

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

  // Force description to fit 30 char limit
  if(typeof CardModel.description !== 'undefined')
  CardModel.description = CardModel.description.substring(0, 30);

  // Force verboseDescription to fit a 300 char limit
  if(typeof CardModel.verboseDescription !== 'undefined') 
    CardModel.verboseDescription = CardModel.verboseDescription.substring(0, 300);

  // Execute a query
  // Yes it's a mongoose model of a Card model
  var model = new CardModelsModel(CardModel);

  var promise = model.save();

  promise.then(function(CardModel) {
    res.json({data: CardModel});

    return makeCards(CardModel._id, CardModel.codes);
  }, function(err) {
    res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/card-models/:id
// Get a list of Cards that share the same model
// GetCardModelByID
CardModelsController.GetCardModelByID = function(req, res) {
  var query = CardModelsModel.find({_id: req.params.id});

  var promise = query.exec();

  promise.then(function(CardModel) {
    if(CardModel === null) {
		  res.status(500).json({message: "Failed to find Card model with that ID"});
		  return;
    }
    
    res.json({data: CardModel});

  }, function(err) {
      res.status(500).json({error: err});
  });
}
// PUT API_IP/VERSION/card-models/:id
// Update a Card Model
// UpdateCardModel
CardModelsController.UpdateCardModel = function(req, res) {
  var query = CardModelsModel.findOne({_id: req.params.id});
  var promise = query.exec();

  var count = 0;
  var countMax = 0;
  var codes = [];
  var modelId;
  var all_completed_successfully = false;
  var newCardModel;

  promise.then((CardModelModel) => {
    if(CardModelModel == null) {
      res.status(500).json({error: "No CardModel with that ID to update"});
      return;
    }

    // Update our max before updates
    countMax = CardModelModel.codes.length;

    CardModelModel.name = req.body.name || CardModelModel.name;
    CardModelModel.description = req.body.description || CardModelModel.description;
    CardModelModel.verboseDescription = req.body.verboseDescription || CardModelModel.verboseDescription;
    CardModelModel.codes = req.body.codes || CardModelModel.codes;
    CardModelModel.damage = req.body.damage || CardModelModel.damage;
    CardModelModel.element = req.body.element || CardModelModel.element;
    CardModelModel.secondaryElement = req.body.secondaryElement || CardModelModel.secondaryElement;
    CardModelModel.image = req.body.image || CardModelModel.image;
    CardModelModel.icon = req.body.icon || CardModelModel.icon;

    // Force description to fit 30 char limit
    if(typeof CardModelModel.description !== 'undefined')
    CardModelModel.description = CardModelModel.description.substring(0, 30);

    // Force verboseDescription to fit a 300 char limit
    if(typeof CardModelModel.verboseDescription !== 'undefined') 
    CardModelModel.verboseDescription = CardModelModel.verboseDescription.substring(0, 300);

    console.log("saving changes");

    return CardModelModel.save();
  }).then((CardModelModel) => {
    console.log("looking for cards...");

    newCardModel = CardModelModel;
    modelId = CardModelModel._id;
    codes = CardModelModel.codes;
    var CardsQuery = CardsModel.find({modelId: modelId});
    return CardsQuery.exec();
  }).then((Cards, reject) => {
    console.log("found " + Cards.length + " cards!");
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
              await CardsModel.findById({_id: card._id}).deleteOne().exec(); // we need to get rid of it now it is not fitting
            }
          }
        )(i++);
      });
      
      count = i;
      all_completed_successfully = true;
    } catch (e) {
      reject(e);
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

      res.json({data: newCardModel});
    }
  });
}

// DELETE API_IP/VERSION/card-models/:id
// Delete a CardModel permanently (includes model and all linked Cards will become invalidated)
// DeleteCardModel
CardModelsController.DeleteCardModel = function(req, res) {
  var query = CardModelsModel.findOne({_id: req.params.id});
  var promise = query.exec();

  promise.then(function(post) {
    var promiseCardModelRemove = post.remove();
    return promiseCardModelRemove.exec();
  }).then(function(post) {
    var modelId = post._id;
    var CardsQuery = CardsModel.find({modelId: modelId});
    var promiseCardsRemove = CardsQuery.deleteOne();
    return promiseCardsRemove.exec();
  }).then(() => {
    res.status(200).json({data: {message: "CardModel and all Card data removed"}});
  }).catch((err) => {
    res.status(500).json({error: err});
  });
}

module.exports = CardModelsController;
