var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;

var Folders = Schema({
  userId: {type: Schema.Types.ObjectId, required: true},
  name: {type: String, required: true},
  chips: {type: Array, default: []},
  timestamp: {type: Date, default: Date.now}
});

// Export function to create Folders model class
module.exports = mongoose.model('Folders', Folders);
