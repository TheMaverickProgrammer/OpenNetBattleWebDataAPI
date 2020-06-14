var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;

var Folders = Schema({
  userId: {type: Schema.Types.ObjectId, required: true},
  name: { type: String, required: true },
  cards: {type: Array, default: []},
  created: {type: Date, default: Date.now},
  updated: {type: Date, default: Date.now}
});

// Execute before each .save() call
Folders.pre('save', function(callback) {
  var self = this;
  self.updated = Date.now();
  callback();
});

// Export function to create Folders model class
module.exports = mongoose.model('Folders', Folders);
