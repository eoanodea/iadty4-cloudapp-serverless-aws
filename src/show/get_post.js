"use strict";

const connectToDatabase = require("/opt/nodejs/db.js");
const handleResponse = require("/opt/nodejs/response");
const Show = require("./Show");

exports.handler = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  switch (event.httpMethod) {
    case "GET":
      return read(event, context, callback);
    case "POST":
      return create(event, context, callback);
    default:
      return callback(null, handleResponse(400, "Bad Request"));
  }
};

function read(event, context, callback) {
  connectToDatabase()
    .then(() => {
      Show.find()
        .then((data) => {
          console.log(data);
          if (data) {
            return callback(null, handleResponse(200, data));
          }

          return callback(null, handleResponse(404, "Not Found"));
        })
        .catch((err) => {
          console.error(err);

          return callback(null, handleResponse(500, err));
        });
    })
    .catch((err) => {
      console.error("Could not connect to database", err);

      return callback(
        null,
        handleResponse(500, "Could not connect to database")
      );
    });
}

const create = (event, context, callback) => {
  console.log("incoming create!");
  console.log(event.body);
  const showData = JSON.parse(event.body);

  connectToDatabase()
    .then(() => {
      Show.create(showData)
        .then((data) => {
          console.log("New Show Created");
          return callback(null, handleResponse(201, data));
        })
        .catch((err) => {
          if (err.name === "ValidationError") {
            console.error("Error Validating!", err);

            return callback(null, handleResponse(422, err));
          } else {
            console.error(err);

            return callback(null, handleResponse(500, err));
          }
        });
    })
    .catch((err) => {
      console.error("Could not connect to database", err);

      return callback(
        null,
        handleResponse(500, "Could not connect to database")
      );
    });
};
