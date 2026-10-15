import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "Question text is required"],
    },
    options: {
      type: [String],
      default: ["", ""],
    },
    activeTill: {
      date: { type: String, default: "" },
      time: { type: String, default: "" },
    },
    timer: {
      type: Number,
      default: 30,
    },
    source: {
      type: String,
      default: "",
    },
    correctAnswer: {
      type: String,
      default: "",
    },
    answers: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        selectedOption: { type: String, required: true },
        submittedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { _id: true }
);

const contestSubmissionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: { type: String, default: "" },
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    answers: { type: Object, default: {} },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const contestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Contest name is required"],
      trim: true,
    },
    image: {
      type: String,
      default: "",
    },
    activeTill: {
      date: { type: String, default: "" },
      time: { type: String, default: "" },
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["ongoing", "archived"],
      default: "ongoing",
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    organizationName: {
      type: String,
      default: "",
      trim: true,
    },
    organizationType: {
      type: String,
      default: "college",
      trim: true,
    },
    questions: [questionSchema],
    submissions: [contestSubmissionSchema],
  },
  { timestamps: true }
);

const Contest = mongoose.models.Contest || mongoose.model("Contest", contestSchema);
export default Contest;
