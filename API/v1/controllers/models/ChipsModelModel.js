var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;

var ChipsModelModel = Schema({
  name: {type: String, required: true},
  damage: {type: Number, required: true},
  element: {type: String, required: true},
  secondaryElement: {type: String, default: "None"},
  description: {type: String, required: true}, // 200 char limit
  verboseDescription: {type: String, required: true}, // 1000 char limit
  image: {type: String, required: true},       // URL location
  icon:  {type: String, required: true},       // URL location
  timestamp: {type: Date, default: Date.now},
  codes: {type: Array, default: ['*']}
});

// Export function to create ChipsModel model class
module.exports = mongoose.model('chipsModel', ChipsModelModel);
