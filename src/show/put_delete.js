"use strict";

const connectToDatabase = require("../layers/db.js");
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
  });
};

const updateData = (event, context, callback) => {
  connectToDatabase().then(() => {
    let showData = JSON.parse(event.body);

    // if (req.file) {
    //   showData.image_path = req.file.filename;
    // }
    console.log("showData: ", showData);

    Show.findByIdAndUpdate(event.pathParameters.id, showData, {
      useFindAndModify: false,
      new: false,
    })
      .then((data) => {
        console.log("Show updated!");

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
    Show.findById(event.pathParameters.id)
      .then((data) => {
        if (!data) {
          throw new Error("Show not available");
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
  });
};
