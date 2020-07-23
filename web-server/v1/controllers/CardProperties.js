/*
CardPropertiesController uses routes use to POST and GET resources from the Mongo DB
*/
var CardPropertiesModel = require('./models/CardPropertiesModel');
var CardsModel = require('./models/CardsModel');

const settings = require('../../server-settings');
const moment = require('moment');

var CardPropertiesController = {};

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

// POST API_IP/VERSION/card-properties/
// Create a NEW CardProperties entry
// AddCardProperties
CardPropertiesController.AddCardProperties = function(req, res) {
  var CardProperties = {
    name: req.body.name,
    damage: req.body.damage,
    element: req.body.element,
    secondaryElement: req.body.secondaryElement,
    description: req.body.description,
    verboseDescription: req.body.verboseDescription,
    image: req.body.image,
    icon: req.body.icon,
    codes: req.body.codes,
    timeFreeze: req.body.timeFreeze,
    limit: req.body.limit,
    action: req.body.action,
    canBoost: req.body.canBoost,
    metaClasses: req.body.metaClasses,
    class: req.body.class
  };

  // Force card name to fit char limit
  CardProperties.name = CardProperties.name.substring(0, settings.preferences.maxCardNameLength);

  // Force description to fit char limit
  if(typeof CardProperties.description !== 'undefined')
  CardProperties.description = CardProperties.description.substring(0, settings.preferences.maxDescriptionLength);

  // Force verboseDescription to fit char limit
  if(typeof CardProperties.verboseDescription !== 'undefined') 
  CardProperties.verboseDescription = CardProperties.verboseDescription.substring(0, settings.preferences.maxVerboseDescriptionLength);

  // Execute a query
  var model = new CardPropertiesModel(CardProperties);

  var promise = model.save();

  promise.then(async function(CardProperties) {
    res.json({data: CardProperties});

    return await makeCards(CardProperties._id, CardProperties.codes);
  }).catch(function(err) {
    res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/card-properties/:id
// Get a list of Cards that share the same properties model
// GetCardPropertiesByID
CardPropertiesController.GetCardPropertiesByID = function(req, res) {
  var query = CardPropertiesModel.findById(req.params.id);

  var promise = query.exec();

  promise.then(function(CardProperties) {
    if(CardProperties === null) {
		  throw "Failed to find CardProperties model with that ID";
    }
    
    res.json({data: CardProperties});
  }).catch( (err) => {
    res.status(500).json({error: err});
  });
}
// PUT API_IP/VERSION/card-properties/:id
// Update a Card Properties entry
// UpdateCardProperties
CardPropertiesController.UpdateCardProperties = function(req, res) {
  var query = CardPropertiesModel.findById(req.params.id);
  var promise = query.exec();

  var count = 0;
  var countMax = 0;
  var codes = [];
  var modelId;
  var all_completed_successfully = false;
  var newCardModel;

  promise.then(async (CardProperties) => {
    if(CardProperties == null) {
      throw "No CardProperties with that ID to update";
    }

    CardProperties.name = req.body.name || CardProperties.name;
    CardProperties.damage = req.body.damage || CardProperties.damage;
    CardProperties.element = req.body.element || CardProperties.element;
    CardProperties.secondaryElement = req.body.secondaryElement || CardProperties.secondaryElement;
    CardProperties.description = req.body.description || CardProperties.description;
    CardProperties.verboseDescription = req.body.verboseDescription || CardProperties.verboseDescription;
    CardProperties.image = req.body.image || CardProperties.image;
    CardProperties.icon = req.body.icon || CardProperties.icon;
    CardProperties.codes = req.body.codes || CardProperties.codes;
    CardProperties.timeFreeze = req.body.timeFreeze || CardProperties.timeFreeze;
    CardProperties.limit = req.body.limit || CardProperties.limit;
    CardProperties.action = req.body.action || CardProperties.action;
    CardProperties.metaClasses = req.body.metaClasses || CardProperties.metaClasses;
    CardProperties.class = req.body.class || CardProperties.class;

    // Update our new max
    countMax = CardProperties.codes.length;

    // Force card name to fit char limit
    CardProperties.name = CardProperties.name.substring(0, settings.preferences.maxCardNameLength);

    // Force description to fit char limit
    if(typeof CardProperties.description !== 'undefined')
    CardProperties.description = CardProperties.description.substring(0, settings.preferences.maxDescriptionLength);

    // Force verboseDescription to fit char limit
    if(typeof CardProperties.verboseDescription !== 'undefined') 
    CardProperties.verboseDescription = CardProperties.verboseDescription.substring(0, settings.preferences.maxVerboseDescriptionLength);
    
    return await CardProperties.save();
  }).then((CardProperties) => {
    newCardProperties = CardProperties;
    modelId = CardProperties._id;
    codes = CardProperties.codes;

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

      res.status(200).json({data: newCardProperties});
    }
  });
}

// DELETE API_IP/VERSION/card-properties/:id
// Delete a CardProperties entry permanently (includes model and all linked Cards will become invalidated)
// DeleteCardProperties
CardPropertiesController.DeleteCardProperties = function(req, res) {
  var query = CardPropertiesModel.findById(req.params.id);
  
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
    res.status(200).json({data: {message: "CardProperties "  + modelId + " and related Cards removed"}});
  }).catch((err) => {
    res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/card-properties/since/:time
// Get an array of card properties after the time (in seconds)
// GetCardPropertiesAfterDate
CardPropertiesController.GetCardPropertiesAfterDate = function(req, res) {
  var promise = CardPropertiesModel.find({updated: { $gte : moment.unix(req.params.time) }}).exec();
  
  promise.then(function(models) {
    res.json({data: models});
  }).catch(function(err) {
    res.status(500).json({error: err});
  });
}

module.exports = CardPropertiesController;
