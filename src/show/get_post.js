"use strict";

const connectToDatabase = require("../../db.js");
const Show = require("./Show");
const parser = require("lambda-multipart-parser");
const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  aws_access_key_id: process.env.aws_access_key_id,
  aws_secret_access_key: process.env.aws_secret_access_key,
  aws_session_token: process.env.aws_session_token,
});

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
          //   let img = `${process.env.STATIC_FILES_URL}${data.image_path}`;
          //   data.image_path = img;
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
