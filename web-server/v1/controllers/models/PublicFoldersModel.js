var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;

var PublicFolders = Schema({
  name: {type: String, required: true},
  cards: {type: Array, default: []},
  timestamp: {type: Date, default: Date.now},
});

// Export function to create Public Folders model class
module.exports = mongoose.model('PublicFolders', PublicFolders);
