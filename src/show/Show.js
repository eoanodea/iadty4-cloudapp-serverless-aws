const { Schema, model } = require("mongoose");

const showSchema = new Schema(
  {
    start_time: {
      type: Date,
      required: [true, "start_time field is required"],
    },
    end_time: {
      type: Date,
      required: [true, "end_time field is required"],
    },
    festival_id: {
      type: Schema.Types.ObjectId,
      ref: "Festival",
      required: [true, "festival field is required"],
    },
    festival_title: {
      type: String,
    },
    performer_id: {
      type: Schema.Types.ObjectId,
      ref: "Performer",
      required: [true, "performer field is required"],
    },
    performer_title: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = model("Show", showSchema);
