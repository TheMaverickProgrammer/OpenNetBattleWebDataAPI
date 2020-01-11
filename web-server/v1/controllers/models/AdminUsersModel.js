var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;

var AdminUsers = Schema({
  username: {type: String, required: true, unique: true},  //! Limit to 60 characters
  password: {type: String, required: true},
  email: {type: String, default: null, unique: true},  //  email if provided
  created: {type: Date, default: Date.now}, //  Timestamp
  // adminID == _id
});

// Execute before each businessUser.save() call
var bcrypt = require('bcrypt-nodejs');

AdminUsers.pre('save', function(callback) {
  var adminUser = this;

  // Break if the pass hasn't been modified
  if(!adminUser.isModified('password')) return callback();

  // Password changed so we need to hash it before storing on database
  bcrypt.genSalt(5, function(err, salt) {
    if(err) return callback(err);

    bcrypt.hash(adminUser.password, salt, null, function(err, hash) {
      if(err) return callback(err);
      adminUser.password = hash;
      callback();
    });
  });
});

// Export function to create AdminUsers model class
module.exports = mongoose.model('AdminUsers', AdminUsers);
