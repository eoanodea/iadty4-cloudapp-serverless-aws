const { Schema, model } = require("mongoose");

const stageSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "title field is required"],
    },
    description: {
      type: String,
      required: [true, "description field is required"],
    },
    location: {
      type: String,
      required: [true, "location field is required"],
    },
    festival_id: {
      type: Schema.Types.ObjectId,
      ref: "Festival",
      required: [true, "festival field is required"],
    },
    festival_title: {
      type: String,
    },
    image_path: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = model("Stage", stageSchema);
