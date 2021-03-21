"use strict";

const connectToDatabase = require("/opt/nodejs/db.js");
const handleResponse = require("/opt/nodejs/response");
const Show = require("./Show");

exports.handler = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  switch (event.httpMethod) {
    case "GET":
      return readData(event, context, callback);
    case "PUT":
      return updateData(event, context, callback);
    case "DELETE":
      return deleteData(event, context, callback);
    default:
      return callback(null, handleResponse(400, "Bad Request"));
  }
};

const readData = (event, context, callback) => {
  connectToDatabase()
    .then(() => {
      Show.findById(event.pathParameters.id)
        .then((data) => {
          if (!data) {
            return callback(null, handleResponse(404, "No Show Found"));
          }

          return callback(null, handleResponse(200, data));
        })
        .catch((err) => {
          console.error(err);

          return callback(null, handleResponse(500, err));
        });
    })
    .catch((err) => {
      console.error("Could not connect to database", err);

      return callback(null, handleResponse(500, err));
    });
};

const updateData = (event, context, callback) => {
  let buff = Buffer.from(event.body, "base64");
  let eventBodyStr = buff.toString("UTF-8");
  let eventBody = JSON.parse(eventBodyStr);

  let showData = eventBody;

  connectToDatabase()
    .then(() => {
      Show.findByIdAndUpdate(event.pathParameters.id, showData, {
        useFindAndModify: false,
        new: false,
      })
        .then((data) => {
          console.log("Show updated!");

          return callback(null, handleResponse(200, data));
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

      return callback(null, handleResponse(500, err));
    });
};

const deleteData = (event, context, callback) => {
  connectToDatabase()
    .then(() => {
      Show.findById(event.pathParameters.id)
        .then((data) => {
          if (!data) {
            return callback(null, handleResponse(404, "No Festival Found"));
          }

          return data.remove();
        })
        .then((data) => {
          console.log("Show removed!");

          return callback(null, handleResponse(200, data));
        })
        .catch((err) => {
          console.error(err);

          return callback(null, handleResponse(500, err));
        });
    })
    .catch((err) => {
      console.error("Could not connect to database", err);

      return callback(null, handleResponse(500, err));
    });
};
