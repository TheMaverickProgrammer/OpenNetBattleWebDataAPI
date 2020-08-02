var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;

var CardCombos = Schema({
  cards: {type: Array, required: true},
  name: {type: String, required: true},
  damage: {type: Number, required: true},
  element: {type: String, required: true},
  secondaryElement: {type: String, default: "None"},
  created: {type: Date, default: Date.now},
  updated: {type: Date, default: Date.now},
  timeFreeze: {type: Boolean, default: false},
  action: {type: String, required: true},
  canBoost: {type: Boolean, default: false},
  metaClasses: {type: Array, default: []}
});

// Execute before each .save() call
CardCombos.pre('save', function(callback) {
  var self = this;
  self.updated = Date.now();

  self.canBoost = self.damage != 0;

  callback();
});


// Export function to create CardCombos class
module.exports = mongoose.model('CardCombos', CardCombos);