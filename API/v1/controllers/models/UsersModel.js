var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;

var Users = Schema({
  username: {type: String, required: true, unique: true},  //! Limit to 60 characters
  twitter: String,
  password: {type: String, required: true},
  email: {type: String, required: true, unique: true},
  created: {type: Date, default: Date.now}, //  Timestamp
  // userId == _id
});

// Execute before each businessUser.save() call
var bcrypt = require('bcrypt-nodejs');

BusinessUsers.pre('save', function(callback) {
  var businessUser = this;

  // Break if the pass hasn't been modified
  if(!businessUser.isModified('password')) return callback();

  // Password changed so we need to hash it before storing on database
  bcrypt.genSalt(5, function(err, salt) {
    if(err) return callback(err);

    bcrypt.hash(businessUser.password, salt, null, function(err, hash) {
      if(err) return callback(err);
      businessUser.password = hash;
      callback();
    });
  });
});

// Export function to create Users model class
module.exports = mongoose.model('Users', Users);
