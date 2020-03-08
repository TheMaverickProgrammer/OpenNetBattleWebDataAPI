/*
Cards use routes use to POST and GET resources from the Mongo DB
*/
var CardsModel = require('./models/CardsModel');
var CardModelsModel = require('./models/CardModelsModel');

var CardsController = {};

// GET API_IP/VERSION/Cards/
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

// GET API_IP/VERSION/Cards/:id
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
      res.json({data: {code: code, detail: Detail}});
  }).catch((err) => {
      res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/Cards/byModel/:id
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

// DELETE API_IP/VERSION/Cards/:id
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


module.exports = CardsController;