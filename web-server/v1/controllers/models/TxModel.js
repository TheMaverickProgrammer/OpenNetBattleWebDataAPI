var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;

var Tx = Schema({
  from: {type: Schema.Types.ObjectId, required: true},
  to: {type: Schema.Types.ObjectId, required: true},
  product: {type: Schema.Types.ObjectId, required: true},
  monies: {type: Number, required: true},
  created: {type: Date, default: Date.now},
});

// Export function to create Tx model class
module.exports = mongoose.model('Tx', Tx);
