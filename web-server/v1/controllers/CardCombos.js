/*
CardCombosController uses routes use to POST and GET resources from the Mongo DB
*/
var CardPropertiesModel = require('./models/CardPropertiesModel');
var CardsModel = require('./models/CardsModel');
var CardCombosModel = require('./models/CardComboModel');

const settings = require('../../server-settings');
const moment = require('moment');

var CardCombosController = {};

// POST API_IP/VERSION/combos/
// Create a NEW CardCombos entry
// AddCardCombo
CardCombosController.AddCardCombo = function(req, res) {
  var CardCombo = {
    cards: req.body.cards,
    name: req.body.name,
    damage: req.body.damage,
    element: req.body.element,
    secondaryElement: req.body.secondaryElement,
    timeFreeze: req.body.timeFreeze,
    action: req.body.action,
    metaClasses: req.body.metaClasses
  };

  // Force card name to fit char limit
  CardCombo.name = CardCombo.name.substring(0, settings.preferences.maxCardNameLength);

  // Execute a query
  var model = new CardCombosModel(CardCombo);

  var promise = model.save();

  promise.then(async function(CardCombo) {
    return res.status(200).json({data: CardCombo});
  }).catch(function(err) {
    return res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/combos/:id
// Get a card combo entry that matches this ID
// GetCardComboByID
CardCombosController.GetCardComboByID = function(req, res) {
  var query = CardCombosModel.findById(req.params.id);

  var promise = query.exec();

  promise.then(function(CardCombo) {
    if(CardCombo === null) {
		  throw "Failed to find CardCombo model with that ID";
    }
    
    res.status(200).json({data: CardCombo});
  }).catch( (err) => {
    res.status(500).json({error: err});
  });
}
// PUT API_IP/VERSION/combos/:id
// Update a Card combo entry
// UpdateCardCombo
CardCombosController.UpdateCardCombo = function(req, res) {
  var query = CardCombosModel.findById(req.params.id);
  var promise = query.exec();

  promise.then(async (CardCombo) => {
    if(CardCombo == null) {
      throw "No CardCombosModel with that ID to update";
    }

    CardCombo.cards = req.body.cards || CardCombo.cards;
    CardCombo.name = req.body.name || CardCombo.name;
    CardCombo.damage = req.body.damage || CardCombo.damage;
    CardCombo.element = req.body.element || CardCombo.element;
    CardCombo.secondaryElement = req.body.secondaryElement || CardCombo.secondaryElement;
    CardCombo.timeFreeze = req.body.timeFreeze || CardCombo.timeFreeze;
    CardCombo.action = req.body.action || CardCombo.action;
    CardCombo.metaClasses = req.body.metaClasses || CardCombo.metaClasses;

    // Force card name to fit char limit
    CardCombo.name = CardCombo.name.substring(0, settings.preferences.maxCardNameLength);
    
    let newCardCombo = await CardCombo.save();

    res.status(200).json({data: newCardCombo});
  }).catch((err) => {
    res.status(500).json({error: err});
  });
}

// DELETE API_IP/VERSION/combos/:id
// Delete a CardCombos entry permanently
// DeleteCardCombo
CardCombosController.DeleteCardCombo = function(req, res) {
  var query = CardCombosModel.findById(req.params.id);
  
  query.exec().then(function(post) {
    if(post == null) {
      throw "No CardCombos entry with that ID to delete";
    }

    return post.deleteOne();
  }).then(() => {
    res.status(200).json({data: {message: "CardCombo "  + req.params.id + " removed"}});
  }).catch((err) => {
    res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/combos/since/:time
// Get an array of card combos updated after the time (in seconds)
// GetCardCombosAfterDate
CardCombosController.GetCardCombosAfterDate = function(req, res) {
  var promise = CardCombosModel.find({updated: { $gte : moment.unix(req.params.time) }}).exec();
  
  promise.then(function(models) {
    res.json({data: models});
  }).catch(function(err) {
    res.status(500).json({error: err});
  });
}

module.exports = CardCombosController;
