/*
TxController uses routes use to Txs and GET resources from the Mongo DB
*/
const moment = require('moment');
const njwt = require('njwt');
const mongoose = require('mongoose');
const settings = require('../../server-settings');

var TxModel = require('./models/TxModel');
var TxController = {};

// GET API_IP/VERSION/tx/since/:time
// Get an array of txs after the time (in seconds)
// GetTxAfterDate
TxController.GetTxAfterDate = function(req, res) {
  var query = TxModel.find({created: { $gte : moment.unix(req.params.time) }}).exec();
  
  query.then(function(Tx) {
    res.json({data: Tx});
  }).catch(function(err) {
    res.status(500).json({error: err});
  });
}

module.exports = TxController;
