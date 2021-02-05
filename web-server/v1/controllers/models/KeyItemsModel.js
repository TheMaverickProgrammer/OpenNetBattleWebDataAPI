var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;

var KeyItems = Schema({
  userId: {type: Schema.Types.ObjectId, required: true},
  owners: {type: Array, default: []}, // Ids of users who have this key item
  name: {type: String, required: true},
  servers: {type: Array, required: true}, // IP address of the server(s) handing these items out
  description: {type: String, required: true},
  created: {type: Date, default: Date.now},
  updated: {type: Date, default: Date.now}
});

// Execute before each .save() call
KeyItems.pre('save', function(callback) {
  var self = this;
  self.updated = Date.now();
  callback();
});

// Export function to create KeyItems model class
module.exports = mongoose.model('KeyItems', KeyItems);
