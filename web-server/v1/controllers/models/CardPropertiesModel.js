var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;

const MAX_LIMIT = 5;
const DEFAULT_LIMIT = 3;
const MIN_LIMIT = 1;

const ClassTypes = {
  STND: 1,
  MEGA: 2,
  GIGA: 3,
  DARK: 4
};

Object.freeze(ClassTypes);

var CardProperties = Schema({
  name: {type: String, required: true, unique: true},
  damage: {type: Number, required: true},
  element: {type: String, required: true},
  secondaryElement: {type: String, default: "None"},
  description: {type: String, required: true}, // char limit
  verboseDescription: {type: String, required: true}, // char limit
  image: {type: String, required: true},       // URL location
  icon:  {type: String, required: true},       // URL location
  created: {type: Date, default: Date.now},
  updated: {type: Date, default: Date.now},
  codes: {type: Array, default: ['*']},
  timeFreeze: {type: Boolean, default: false},
  limit: {type: Number, default: DEFAULT_LIMIT},
  action: {type: String, required: true},
  canBoost: {type: Boolean, default: false},
  metaClasses: {type: Array, default: []},
  class: {type: Number, default: ClassTypes.STND}
});

// Execute before each .save() call
CardProperties.pre('save', function(callback) {
  var self = this;
  self.updated = Date.now();

  self.limit = Math.min(Math.max(MIN_LIMIT, self.limit), MAX_LIMIT);
  self.class = Math.min(Math.max(ClassTypes.STND, self.class), ClassTypes.DARK);

  self.canBoost = self.damage != 0;

  callback();
});

// Export function to create CardProperties class
module.exports = mongoose.model('CardProperties', CardProperties);
