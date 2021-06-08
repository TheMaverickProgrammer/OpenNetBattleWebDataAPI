var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;

var Token = Schema({
  userId: {type: Schema.Types.ObjectId, required: true, ref: "user"},
  token: {type: String, required: true},
  created: {type: Date, default: Date.now, expires: 3600},
});

// Export function to create Token model class
module.exports = mongoose.model('Token', Token);
