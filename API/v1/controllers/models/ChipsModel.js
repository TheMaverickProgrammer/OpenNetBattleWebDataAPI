var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;

var Chips = Schema({
  modelId: {type: Schema.Types.ObjectId, required: true},
  code: {type: String, required: true}
});

// Export function to create Chips model class
module.exports = mongoose.model('Chips', Chips);