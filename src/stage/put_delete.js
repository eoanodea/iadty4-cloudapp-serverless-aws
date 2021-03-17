"use strict";

const connectToDatabase = require("../layers/db.js");
const Stage = require("./Stage");
const buildS3URL = require("../layers/s3.js");

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
    Stage.findById(event.pathParameters.id)
      .then((data) => {
        if (!data) {
          return callback(null, handleResponse(404, "No Stage Found"));
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
  connectToDatabase().then(() => {
    let stageData = JSON.parse(event.body);

    // if (req.file) {
    //   stageData.image_path = req.file.filename;
    // }
    console.log("stageData: ", stageData);

    Stage.findByIdAndUpdate(event.pathParameters.id, stageData, {
      useFindAndModify: false,
      new: false,
    })
      .then((data) => {
        console.log("Stage updated!");

        ////// delete the old image file/////
        // fs.unlink(`${appRoot}/views/uploads/${data.image_path}`, (err) => {
        //   if (err) throw err;
        //   console.log(`${data.image_path} was deleted`);
        // });
        ////////////////////////////

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
  });
};

const deleteData = (event, context, callback) => {
  connectToDatabase().then(() => {
    let image_path = "";
    Stage.findById(event.pathParameters.id)
      .then((data) => {
        if (!data) {
          throw new Error("Stage not available");
        }
        // image_path = data.image_path;
        return data.remove();
      })
      .then((data) => {
        console.log("Stage removed!");

        ////// delete the image file/////
        // fs.unlink(`${appRoot}/views/uploads/${image_path}`, (err) => {
        //   if (err) throw err;
        //   console.log(`${image_path} was deleted`);
        // });
        ////////////////////////////

        return callback(null, handleResponse(200, data));
      })
      .catch((err) => {
        console.error(err);

        return callback(null, handleResponse(500, err));
      });
  });
};
