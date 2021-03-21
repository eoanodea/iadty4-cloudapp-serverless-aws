"use strict";

const connectToDatabase = require("/opt/nodejs/db.js");
const Performer = require("./Performer");
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
    Performer.find()
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
    let image_data = null;
    let image_type = null;
    const image_name = Math.floor(Date.now() / 1000);

    let performerData = {
      title: parsedEvent.title,
      description: parsedEvent.description,
      contact_email: parsedEvent.contact_email,
      contact_phone: parsedEvent.contact_phone,
    };

    if (parsedEvent.files[0]) {
      const file = parsedEvent.files[0];

      // image_data = new Buffer(file.content, 'binary')
      image_data = new Buffer.from(file.content, "binary");
      image_type = file.contentType;
      performerData.image_path = `performers/${image_name}-${file.filename}`;
    }

    connectToDatabase().then(() => {
      Performer.create(performerData)
        .then((data) => {
          console.log("New Performer Created");

          const params = {
            Bucket: process.env.aws_bucket_name,
            Key: `upload/${performerData.image_path}`,
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
  });
};
