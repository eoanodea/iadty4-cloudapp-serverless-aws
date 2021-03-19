"use strict";

const connectToDatabase = require("../layers/db.js");
const Festival = require("./Festival");
const buildS3URL = require("../layers/s3.js");
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
const readData = (event, context, callback) => {
  connectToDatabase().then(() => {
    Festival.findById(event.pathParameters.id)
      .then((data) => {
        if (!data) {
          return callback(null, handleResponse(404, "No Festival Found"));
        }
        let img = buildS3URL(data.image_path);
        data.image_path = img;
        return callback(null, handleResponse(200, data));
      })
      .catch((err) => {
        console.error(err);

        return callback(null, handleResponse(500, err));
      });
  });
};

const updateData = (event, context, callback) => {
  parser.parse(event).then((parsedEvent) => {
    let image_data = null;
    let image_type = null;
    const image_name = Math.floor(Date.now() / 1000);

    let festivalData = {
      title: parsedEvent.title,
      description: parsedEvent.description,
      city: parsedEvent.city,
      start_date: parsedEvent.start_date,
      end_date: parsedEvent.end_date,
    };

    if (parsedEvent.files[0]) {
      const file = parsedEvent.files[0];

      // image_data = new Buffer(file.content, 'binary')
      image_data = new Buffer.from(file.content, "binary");
      image_type = file.contentType;
      festivalData.image_path = `festivals/${image_name}-${file.filename}`;
    }

    connectToDatabase().then(() => {
      // let festivalData = JSON.parse(event.body);

      // if (req.file) {
      //   festivalData.image_path = req.file.filename;
      // }
      console.log("festivalData: ", festivalData);

      Festival.findByIdAndUpdate(event.pathParameters.id, festivalData, {
        useFindAndModify: false,
        new: false,
      })
        .then((data) => {
          console.log("Festival updated!");
          if (image_data && data.image_path) {
            const oldImage = {
              Bucket: process.env.aws_bucket_name,
              Key: `upload/${data.image_path}`,
            };

            const params = {
              Bucket: process.env.aws_bucket_name,
              Key: `upload/${festivalData.image_path}`,
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
          }
          ////// delete the old image file/////
          // fs.unlink(`${appRoot}/views/uploads/${data.image_path}`, (err) => {
          //   if (err) throw err;
          //   console.log(`${data.image_path} was deleted`);
          // });
          ////////////////////////////

          // return callback(null, handleResponse(200, data));
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

const deleteData = (event, context, callback) => {
  connectToDatabase().then(() => {
    // let image_path = "";
    Festival.findById(event.pathParameters.id)
      .then((data) => {
        if (!data) {
          throw new Error("Festival not available");
        }
        if (data.image_path) {
          const params = {
            Bucket: process.env.aws_bucket_name,
            Key: `upload/${data.image_path}`,
          };

          s3.deleteObject(params)
            .promise()
            .then((image) => {
              console.log("Festival removed!");
              data.remove();

              return callback(null, handleResponse(200, data));
            })
            .catch((err) => {
              console.log("Error deleting image from s3: ", err);

              return callback(null, handleResponse(422, err));
            });
        }
        // image_path = data.image_path;
        return data.remove();
      })
      // .then((data) => {
      //   console.log("Festival removed!");

      //   ////// delete the image file/////
      //   // fs.unlink(`${appRoot}/views/uploads/${image_path}`, (err) => {
      //   //   if (err) throw err;
      //   //   console.log(`${image_path} was deleted`);
      //   // });
      //   ////////////////////////////

      //   return callback(null, handleResponse(200, data));
      // })
      .catch((err) => {
        console.error("Error finding festival", err);

        return callback(null, handleResponse(500, err));
      });
  });
};
