"use strict";

const connectToDatabase = require("/opt/nodejs/db.js");
const handleResponse = require("/opt/nodejs/response");
const Stage = require("./Stage");
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

function read(event, context, callback) {
  connectToDatabase()
    .then(() => {
      Stage.find()
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

      return callback(null, handleResponse(500, err));
    });
}

const create = (event, context, callback) => {
  parser
    .parse(event)
    .then((parsedEvent) => {
      let image_data = null;
      let image_type = null;
      const image_name = Math.floor(Date.now() / 1000);

      let stageData = {
        title: parsedEvent.title,
        description: parsedEvent.description,
        location: parsedEvent.location,
        festival_id: parsedEvent.festival_id,
      };

      if (parsedEvent.files[0]) {
        const file = parsedEvent.files[0];

        // image_data = new Buffer(file.content, 'binary')
        image_data = new Buffer.from(file.content, "binary");
        image_type = file.contentType;
        stageData.image_path = `stages/${image_name}-${file.filename}`;
      }

      connectToDatabase().then(() => {
        Stage.create(stageData)
          .then((data) => {
            console.log("New Stage Created");

            const params = {
              Bucket: process.env.aws_bucket_name,
              Key: `upload/${stageData.image_path}`,
              Body: image_data,
              ContentType: image_type,
            };

            s3.putObject(params)
              .promise()
              .then((image) => {
                console.log("Image successfully uploaded: ", image);

                return callback(null, handleResponse(201, data));
              })
              .catch((err) => {
                console.log("Error Adding image to s3: ", err);

                return callback(null, handleResponse(422, err));
              });
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
    })
    .catch((err) => {
      console.error("Could not connect to database", err);

      return callback(null, handleResponse(500, err));
    });
};
