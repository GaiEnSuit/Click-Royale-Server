const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: "https://clkr-4980772.firebaseio.com"
});

module.exports = admin;
