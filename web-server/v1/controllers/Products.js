/*
ProductsController uses routes use to POST and GET resources from the Mongo DB
*/

var ProductsModel = require('./models/ProductsModel');
var TxModel = require('./models/TxModel');
var UsersModel = require('./models/UsersModel');

const moment = require('moment');
const { UpdateFolder } = require('./Folders');

var ProductsController = {};

// POST API_IP/VERSION/products/
// Create a NEW Product entry
// AddProduct
ProductsController.AddProduct = async function(req, res) {
   // Users can only create products for their own account
   var userId = req.user.userId;

  var Product = {
    user: userId,
    item: req.body.itemId,
    monies: req.body.monies,
  };

  if(Product.monies <= 0) {
    return res.status(500).json({error: "Product must be worth something"});
  }

  // Execute a query
  var model = new ProductsModel(Product);

  var promise = model.save();

  promise.then(async function(Product) {
    return res.status(200).json({data: Product});
  }).catch(function(err) {
    return res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/products
// Get a list of all products created by this user
// GetProductList
ProductsController.GetProductsList = function(req, res) {
  var query = ProductsModel.find({userId: req.user.userId});

  var promise = query.exec();

  promise.then(function(list) {
    if(list === null) {
		  throw "Failed to fetch list";
    }
    
    res.status(200).json({data: list});
  }).catch( (err) => {
    res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/products/:id
// Get a product entry that matches this ID
// GetProductByID
ProductsController.GetProductByID = function(req, res) {
  var query = ProductsModel.findById(req.params.id);

  var promise = query.exec();

  promise.then(function(Product) {
    if(Product === null) {
		  throw "Failed to find Product model with that ID";
    }
    
    res.status(200).json({data: Product});
  }).catch( (err) => {
    res.status(500).json({error: err});
  });
}
// PUT API_IP/VERSION/products/:id
// Update a Product entry
// UpdateProduct
ProductsController.UpdateProduct = function(req, res) {
  var query = ProductsModel.findById(req.params.id);
  var promise = query.exec();

  promise.then(async (Product) => {
    if(Product == null) {
      throw "No ProductModel with that ID to update";
    }

    Product.monies = req.body.monies || Product.monies;

    if(Product.monies <= 0) {
      throw "Product must be worth something";
    }

    let newProduct = await Product.save();

    res.status(200).json({data: newProduct});
  }).catch((err) => {
    res.status(500).json({error: err});
  });
}

// DELETE API_IP/VERSION/products/:id
// Delete a Product entry permanently
// DeleteProduct
ProductsController.DeleteProduct = function(req, res) {
  var query = ProductsModel.findById(req.params.id);
  
  query.exec().then(function(post) {
    if(post == null) {
      throw "No Product entry with that ID to delete";
    }

    return post.deleteOne();
  }).then(() => {
    res.status(200).json({data: {message: "Product "  + req.params.id + " removed"}});
  }).catch((err) => {
    res.status(500).json({error: err});
  });
}

// GET API_IP/VERSION/products/since/:time
// Get an array of products updated after the time (in seconds)
// GetProductsAfterDate
ProductsController.GetProductsAfterDate = function(req, res) {
  var promise = ProductsModel.find({updated: { $gte : moment.unix(req.params.time) }}).exec();
  
  promise.then(function(models) {
    res.json({data: models});
  }).catch(function(err) {
    res.status(500).json({error: err});
  });
}

// POST API_IP/VERSION/products/purchase/:id
// Try to purchase a product and return a Tx response
// PurchaseProduct
ProductsController.PurchaseProduct = async function(req, res) {
  var productId = req.params.id;
  var customerId = req.user.userId;

  var product = await ProductsModel.findById(productId);
  var customer = await UsersModel.findById(customerId);

  if(product == null) {
    res.status(500).json({error: "Product does not exist"});
  }

  if(customer == null) {
    res.status(500).json({error: "Customer does not exist"});
  }

  if(customer.monies < productId.monies) {
    res.status(500).json({error: "Not enough monies to purchase"});
  }

  var productOwnerId = product.userId;

  var Tx = {
    from: customerId,
    to: productOwnerId,
    product: productId,
  };

  // Execute a query
  var model = new TxModel(Tx);
  var promise = model.save();

  promise.then(async function(Tx) {
    return res.status(200).json({data: Tx});
  }).catch(function(err) {
    return res.status(500).json({error: err});
  });
}

module.exports = ProductsController;
