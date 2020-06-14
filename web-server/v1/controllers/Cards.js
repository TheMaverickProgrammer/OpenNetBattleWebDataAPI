/*
Cards use routes use to POST and GET resources from the Mongo DB
*/
const moment = require('moment');

var CardsModel = require('./models/CardsModel');
var CardModelsModel = require('./models/CardModelsModel');
var CardsController = {};

// GET API_IP/VERSION/cards/
// Get ALL Cards
// GetCardsList
CardsController.GetCardsList = function(req, res) {
  CardsModel.find(function(err, Cards) {
    if(err) {
      res.status(500).json({error: err});
    } else {
      res.json({data: Cards});
    }
  });
}

// GET API_IP/VERSION/cards/:id
// Get a single Card
// GetCardByID
CardsController.GetCardByID = function(req, res) {
  var query = CardsModel.findById(req.params.id);

  var promise = query.exec();
  var code  = '';

  promise.then((Card) => {
    if(Card === null) {
		  throw "Failed to find a card with that ID";
    }
    
    code = Card.code;
    // Make a second database query to find the card detail
    var detail = CardModelsModel.findOne({_id: Card.modelId});
    return detail.exec();
  }).then((Detail) => {
      res.json({data: {_id: req.params.id, code: code, detail: Detail}});
  }).catch((err) => {
      res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/cards/byModel/:id
// Get a list of cards that share the same model
// GetCardsByModelID
CardsController.GetCardsByModelID = function(req, res) {
  var query = CardsModel.find({modelId: req.params.id});

  var promise = query.exec();

  promise.then((Cards) => {
    if(Cards === null) {
		  throw "Failed to find cards with that model ID";
    }
    
    res.json({data: Cards});
  }).catch(function(err) {
    res.status(500).json({error: err});
  });
}

// DELETE API_IP/VERSION/cards/:id
// Delete a card permanently
// DeleteCard
CardsController.DeleteCard = function(req, res) {
  var promise = CardsModel.findById(req.params.id).exec();
  var card;
  promise.then(function(Card) {
    if(Card !== null) {
      card = Card;
      return Card.deleteOne();
    }

    throw "Failed to delete a card with that ID";

  }).then(function(){
    res.status(200).json({message: "Card " + card._id + " (code = " + card.code + ") removed"});
  }).catch(function(err) {
    res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/cards/since/:time
// Get an array of cards after the time (in seconds)
// GetCardsAfterDate
CardsController.GetCardsAfterDate = function(req, res) {
  // This is a combination of using GetCardsByModelID 
  // with GetCardModelsAfterDate calls
  let promise = CardModelsModel.find({updated: { $gte : moment.unix(req.params.time) }}).exec();
  let cardsArray = [];
  let errors = [];

  promise.then(async models => {
    // Now that we have all the updated models,
    // loop through and find the assoc. card resource for them
    // Accumulate the result and any errors for later inspecting
    // We don't want this request to fail because one model was broken
    for(const model of models) {
      try {
        let relatedCards = await CardsModel.find({modelId: model._id}).exec();
        cardsArray = [...cardsArray, ...relatedCards];
      }catch(err) {
        errors = [...errors, err];
      }
    }
  }).catch( err => {
    res.status(500).json({error: err});
  }).finally(() =>{
    // Some individual cards could fail. Let's know about them
    res.json({data: cardsArray, batchErrors: errors});
  });
}

module.exports = CardsController;
