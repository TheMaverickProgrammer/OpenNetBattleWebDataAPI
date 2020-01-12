var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;

var Users = Schema({
  username: {type: String, required: true, unique: true},  //! Limit to 60 characters
  twitter: {type: String, required: false, unique: false},
  password: {type: String, required: true},
  email: {type: String, required: true, unique: true},
  created: {type: Date, default: Date.now}, //  Timestamp
  // userId == _id
});

// The following code will execute before each user.save() call
var bcrypt = require('bcrypt-nodejs');

Users.pre('save', function(callback) {
  var user = this;

  // Break if the pass hasn't been modified
  if(!user.isModified('password')) return callback();

  // Password changed so we need to hash it before storing on database
  bcrypt.genSalt(5, function(err, salt) {
    if(err) return callback(err);

    bcrypt.hash(user.password, salt, null, function(err, hash) {
      if(err) return callback(err);
      user.password = hash;
      callback();
    });
  });
});

// Export function to create Users model class
module.exports = mongoose.model('Users', Users);
