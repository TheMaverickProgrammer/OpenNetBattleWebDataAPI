var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;

const ProductTypes = {
  Card: "Card",
  KeyItem: "KeyItem"
};

Object.freeze(ProductTypes);

var Products = Schema({
  userId: {type: Schema.Types.ObjectId, required: true}, // owner of the product
  itemId: {type: Schema.Types.ObjectId, required: true}, // key item, card, etc...
  monies: {type: Number, required: true},
  type: {type: String, required: true},
  created: {type: Date, default: Date.now},
  updated: {type: Date, default: Date.now}
});

// Execute before each .save() call
Products.pre('save', function(callback) {
  var self = this;
  self.updated = Date.now();
  callback();
});

// Export function to create Products model class
module.exports = { ProductTypes: ProductTypes, ProductsModel: mongoose.model('Products', Products) };
