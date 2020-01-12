var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;

var Cards = Schema({
  modelId: {type: Schema.Types.ObjectId, required: true},
  code: {type: String, required: true}
});

// Export function to create Cards model class
module.exports = mongoose.model('Cards', Cards);