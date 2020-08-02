/*
CardCombosController uses routes use to POST and GET resources from the Mongo DB
*/

var CardCombosModel = require('./models/CardCombosModel');

const settings = require('../../server-settings');
const moment = require('moment');

var CardCombosController = {};

// POST API_IP/VERSION/combos/
// Create a NEW CardCombos entry
// AddCardCombo
CardCombosController.AddCardCombo = async function(req, res) {
  var CardCombo = {
    cards: req.body.cards || null,
    name: req.body.name,
    damage: req.body.damage,
    element: req.body.element,
    secondaryElement: req.body.secondaryElement,
    timeFreeze: req.body.timeFreeze,
    action: req.body.action,
    metaClasses: req.body.metaClasses
  };

  // NOTE: combos do not have card name limit b/c they do not go on cards

  // When creating card combos, each card list must be entirely unique
  // Order does not matter when comparing card lists
  // Combo names do not need to be unique
  if(CardCombo.cards === null) {
    return res.status(500).json({error: "Combo must have cards"});
  } else {
    if(CardCombo.cards.length >= 0 && CardCombo.cards.length < 3) {
      return res.status(500).json({error: "Combo must have at minimum 3 cards"});
    }
  }

  try {
    let combo = await CardCombosModel.findOne({cards: { $all: CardCombo.cards } }).exec();
    if(combo !== null) {
      return res.json({error: "Combo matches existing entry " + combo.name + " (" + combo._id + ")"});
    }
  }catch(err) {
    res.status(500).json({error: "Internal server error while looking for matching combo => "});
  }

  // Execute a query
  var model = new CardCombosModel(CardCombo);

  var promise = model.save();

  promise.then(async function(CardCombo) {
    return res.status(200).json({data: CardCombo});
  }).catch(function(err) {
    return res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/combos
// Get a list of all card combos
// GetCardComboList
CardCombosController.GetCardComboList = function(req, res) {
  var query = CardCombosModel.find({});

  var promise = query.exec();

  promise.then(function(list) {
    if(list === null) {
		  throw "Failed to fetch list";
    }
    
    res.status(200).json({data: list});
  }).catch( (err) => {
    res.status(500).json({error: err});
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

    // When creating card combos, each card list must be entirely unique
    // Order does not matter when comparing card lists
    let res = null;

    try {
      res = await CardCombosModel.findOne({cards: { $all: CardCombo.cards} }).exec();
      if(res) {
        return res.json({error: "Combo matches existing entry " + res.name + " (" + res._id + ")"});
      }
    }catch(err) {
      res.status(500).json({error: "Internal server error looking for matching combo"});
    }

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
