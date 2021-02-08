var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;

var PublicFolders = Schema({
  author: {type: String, required: true},
  name: {type: String, required: true, unique: true},
  cards: {type: Array, default: []},
  created: {type: Date, default: Date.now},
  updated: {type: Date, default: Date.now}
});

// Execute before each .save() call
PublicFolders.pre('save', function(callback) {
  var self = this;
  self.updated = Date.now();
  callback();
});

// Export function to create Public Folders model class
module.exports = mongoose.model('PublicFolders', PublicFolders);
