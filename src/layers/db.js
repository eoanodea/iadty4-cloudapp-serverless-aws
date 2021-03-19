const mongoose = require("mongoose");
let isConnected;

module.exports = connectToDatabase = () => {
  if (isConnected) {
    console.log("Using exisiting database connection");

    return Promise.resolve();
  }

  console.log("Establishing new database connection");
  return mongoose
    .connect(process.env.DB_ATLAS_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferCommands: false,
      bufferMaxEntries: 0,
    })
    .then((db) => {
      console.log("New database connection established");
      isConnected = db.connections[0].readyState;
    })
    .catch((err) => {
      console.log("Error connecting to database", err);
      isConnected = null;
      Promise.reject();
    });
};
