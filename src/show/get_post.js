"use strict";

const connectToDatabase = require("../layers/db.js");
const Show = require("./Show");
const parser = require("lambda-multipart-parser");

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

function handleResponse(statusCode, json) {
  return {
    statusCode,
    body: JSON.stringify(json),
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
      "Access-Control-Allow-Credentials": true,
      "Content-Type": "application/json",
    },
  };
}

function read(event, context, callback) {
  connectToDatabase().then(() => {
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
  });
}

const create = (event, context, callback) => {
  parser.parse(event).then((parsedEvent) => {
    let showData = parsedEvent;

    connectToDatabase().then(() => {
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
    });
  });
};
