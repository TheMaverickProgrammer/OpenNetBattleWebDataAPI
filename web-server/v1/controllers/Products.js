/*
ProductsController uses routes use to POST and GET resources from the Mongo DB
*/

var {ProductTypes, ProductsModel} = require('./models/ProductsModel');
var TxModel = require('./models/TxModel');
var KeyItemsModel = require('./models/KeyItemsModel');
var UsersModel = require('./models/UsersModel');
const settings = require('../../server-settings');

const moment = require('moment');
const e = require('express');
const { relativeTimeRounding } = require('moment');

var validateItemType = function(type) {
  if(type == "Card" || type == "KeyItem") {
    return true;
  }

  return false;
}

var ProductsController = {};

// POST API_IP/VERSION/products/
// Create a NEW Product entry
// AddProduct
ProductsController.AddProduct = async function(req, res) {
   // Users can only create products for their own account
   var userId = req.user.userId;

  var Product = {
    userId: userId,
    itemId: req.body.itemId,
    monies: req.body.monies,
    type: req.body.type
  };

  if(Product.monies <= 0) {
    return res.status(500).json({error: "Product must be worth something"});
  }

  if(validateItemType(Product.type) == false) {
    return res.status(500).json({error: "Invalid product settings"});
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

    // People don't need to know who created this product
    delete Product.userId;
    
    res.status(200).json({data: Product});
  }).catch( (err) => {
    res.status(500).json({error: err});
  });
}
// PUT API_IP/VERSION/products/:id
// Update a Product entry
// UpdateProduct
ProductsController.UpdateProduct = function(req, res) {
  var query = ProductsModel.findOne({userId: req.user.userId, _id: req.params.id});
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
  // you can only delete a product if you own it
  var query = ProductsModel.findOne({userId: req.user.userId, _id: req.params.id});
  
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
  const ERROR_CODES = {
    invalid_purchase: 1,
    self_sell: 2,
    key_item_owned: 3,
    no_monies: 4,
    network_error: 5
  };

  Object.freeze(ERROR_CODES);

  var productId = req.params.id;
  var customerId = req.user.userId;

  var product, customer, productOwner, keyItem;

  // keep track of all changed properties incase a revert is needed
  var revert = {
    keyItemOwners: [],
    productOwnerMonies: 0,
    productOwnerPool: [],
    customerMonies: 0,
    customerPool: []
  }

  try {
    product = await ProductsModel.findOne({_id: productId});
  }catch(e) {
    return res.status(500).json({error: "Product does not exist", code: ERROR_CODES.invalid_purchase});
  }

  try {
    customer = await UsersModel.findOne({_id: customerId});
    Object.assign(revert.customerPool, customer.pool); // copy value
    Object.assign(revert.customerMonies, customer.monies); // copy value
  } catch(e) {
    return res.status(500).json({error: "Customer does not exist", code: ERROR_CODES.invalid_purchase});
  }

  try {
    productOwner = await UsersModel.findOne({_id: product.userId});
    Object.assign(revert.productOwnerPool, productOwner.pool); // copy value
    Object.assign(revert.productOwnerMonies, productOwner.monies); // copy value
  } catch(e) {
    return res.status(500).json({error: "Cannot buy from a vendor that does not exist", code: ERROR_CODES.invalid_purchase});
  }

  if(productOwner._id.equals(customer._id)) {
    return res.status(500).json({error: "You own this vendor", code: ERROR_CODES.self_sell});
  }

  let monies = customer.monies || 0;

  if(monies < product.monies) {
    return res.status(500).json({error: "Not enough monies to purchase", code: ERROR_CODES.no_monies});
  }

  var productOwnerId = product.userId;

  var productWasLoaned = null;

  if(product.type == ProductTypes.Card) {
    productWasLoaned = true; // assume it's loaned from within the system

    // look for the card in the owner's pool
    if(productOwner.pool.includes(product.itemId)) {
      productWasLoaned = false;
    }
  } else if(product.type == ProductTypes.KeyItem) {
    // INFINITE custom key items
    productWasLoaned = false;
  }

  var Tx = {
    from: customerId,
    to: productOwnerId,
    product: productId,
    monies: product.monies,
    loaned: productWasLoaned
  };

  // Prepare to execute the Tx query
  var model = new TxModel(Tx);

  // If the product completes, add the monies
  // to the account of the product owner

  if(productWasLoaned == false) {
    if(product.type == ProductTypes.Card) {
      let index = productOwner.pool.indexOf(product.itemId);

      if(index == -1) {
        // something went wrong with the state of the transaction

        try {
          let txFix = await TxModel.findOne({ _id: Tx._id });
          txFix.loaned = true;
          txFix.save();
          Tx.loaned = true; // update the copy of the record we will return too
          productWasLoaned = true; // fix if a race condtion happened here
        } catch(e) {
          console.log(e);
          return res.status(500).json({error: "Transaction became invalid during processing", code: ERROR_CODES.network_error});
        }
      } else {
        productOwner.pool.splice(index, 1); // remove from the owner's card pool
        customer.pool.push(product.itemId); // add to the customer's card pool
      }
    } else if(product.type == ProductTypes.KeyItem) {
      try {
        keyItem = await KeyItemsModel.findOne({ _id: product.itemId });
        Object.assign(revert.keyItemOwners, keyItem.owners); // copy value
        keyItem.owners.push(customer._id); // add the owner
      }catch(e) {
        console.log(e);
        return res.status(500).json({error: "KeyItem not found to purchase", code: ERROR_CODES.invalid_purchase});
      }
    }
  } else {
    // just give the item directly 
    if(product.type == ProductTypes.Card) {

      customer.pool.push(product.itemId);

    } else if(product.type == ProductTypes.KeyItem) {
      try{
        keyItem = await KeyItemsModel.findOne({ _id: product.itemId });
        Object.assign(revert.keyItemOwners, keyItem.owners); // copy value
        keyItem.owners.push(customer._id); // add the owner
      }catch(e) {
        console.log(e);
        return res.status(500).json({error: "KeyItem not found to purchase", code: ERROR_CODES.invalid_purchase});
      }
    }
  }

  // state flags
  var fail = {
    customer: true,
    keyItem: true,
    tx: true
  };

  try{
    /**
    * The following code tries to process everything 
    * in one pass. If any errors occur at this stage they will
    * all be `catch`-ed by the promise error handler
    * and the transaction will be deleted
    */

    // pay the owner
    if(productWasLoaned == false) {
      productOwner.monies += product.monies;
    } else {
      productOwner.monies += product.monies * (settings.preferences.loanPercentage/100.0);
    }

    productOwner.markModified('pool'); // mongoose doesn't notify changes on basic arrays
    await productOwner.save(); // update vendor records

    // charge customer full price
    customer.monies = Math.max(monies - product.monies, 0);

    customer.markModified('pool');
    await customer.save(); // update customer records (monies and card pool...)

    fail.customer = false;

    if(keyItem) {
      await keyItem.save(); // update keyItem record
    }

    // we still set this to false even if we don't have a keyItem
    // because this represents the "step where it fails" later if needed
    fail.keyItem = false; 

    let tx = await model.save();

    fail.tx = false;

    // return the resulting transaction
    return res.status(200).json({data: tx});
  }catch(err) {
    console.log(err);

    keyItem.owners = revert.keyItemOwners;
    customer.pool = revert.customerPool;
    customer.monies = revert.customerMonies;
    productOwner.pool = revert.productOwnerPool;
    productOwner.monies = revert.productOwnerMonies;

    // if any important transaction .save() fails, we have records to undo
    if(fail.tx) {
      // undo keyItem
      // undo customer
      // undo productOwner
      if(keyItem) { keyItem.save(); }
      customer.save();
      productOwner.save();

    }else if(fail.keyItem) {
      // undo customer
      // undo productOwner
      customer.save();
      productOwner.save();
    }else if(fail.customer) {
      // undo productOwner
      productOwner.save();
    }

    return res.status(500).json({error: err, code: ERROR_CODES.network_error});
  }
}

module.exports = ProductsController;
