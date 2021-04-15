"use strict";

const connectToDatabase = require("/opt/nodejs/db.js");
const Performer = require("./Performer");
const buildS3URL = require("/opt/nodejs/s3.js");
const handleResponse = require("/opt/nodejs/response");
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
      Performer.findById(event.pathParameters.id)
        .then((data) => {
          if (!data) {
            return callback(null, handleResponse(404, "No Performer Found"));
          }
          let img = buildS3URL(data.image_path);
          data.image_path = img;
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

      image_data = new Buffer.from(file.content, "binary");
      image_type = file.contentType;
      performerData.image_path = `performers/${image_name}-${file.filename}`;
    }

    connectToDatabase()
      .then(() => {
        console.log("performerData: ", performerData);

        Performer.findByIdAndUpdate(event.pathParameters.id, performerData, {
          useFindAndModify: false,
          new: false,
        })
          .then((data) => {
            console.log("Performer updated!");
            if (image_data && data.image_path) {
              const oldImage = {
                Bucket: process.env.aws_bucket_name,
                Key: `upload/${data.image_path}`,
              };

              const params = {
                Bucket: process.env.aws_bucket_name,
                Key: `upload/${performerData.image_path}`,
                Body: image_data,
                ContentType: image_type,
              };

              s3.deleteObject(oldImage)
                .promise()
                .then((image) => {
                  console.log("Old Image successfully deleted: ", image);

                  s3.putObject(params)
                    .promise()
                    .then((newImage) => {
                      console.log("Image successfully uploaded: ", newImage);

                      return callback(null, handleResponse(200, data));
                    })
                    .catch((err) => {
                      console.log("Error Adding image to s3: ", err);

                      return callback(null, handleResponse(422, err));
                    });
                })
                .catch((err) => {
                  console.log("Error deleting old image from s3: ", err);

                  return callback(null, handleResponse(422, err));
                });
            } else {
              console.log(
                "No Image modification required, Performer Updated successfully"
              );
              return callback(null, handleResponse(200, data));
            }
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
  });
};

const deleteData = (event, context, callback) => {
  connectToDatabase()
    .then(() => {
      Performer.findById(event.pathParameters.id)
        .then((data) => {
          if (!data) {
            return callback(null, handleResponse(404, "No Performer Found"));
          }
          if (data.image_path) {
            const params = {
              Bucket: process.env.aws_bucket_name,
              Key: `upload/${data.image_path}`,
            };

            s3.deleteObject(params)
              .promise()
              .then((image) => {
                console.log("Performer removed!");
                data.remove();

                return callback(null, handleResponse(200, data));
              })
              .catch((err) => {
                console.log("Error deleting image from s3: ", err);

                return callback(null, handleResponse(422, err));
              });
          }
        })
        .catch((err) => {
          console.error("Error finding performer", err);

          return callback(null, handleResponse(500, err));
        });
    })
    .catch((err) => {
      console.error("Could not connect to database", err);

      return callback(null, handleResponse(500, err));
    });
};
