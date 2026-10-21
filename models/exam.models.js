import mongoose from "mongoose";

const ExamSchema = new mongoose.Schema({
    userId: { type: String, required: true }, 
    questions: { type: [String], required: true, default: [] }, 
    totalQuestions: { type: Number, required: true }, 
    currentQuestionIndex: { type: Number, required: true, default: 0 }, 
    answers: { type: Object, required: true, default: { } }, 
    board: { type: String, required: true }, 
    subject: { type: String, required: true }, 
    topic: { type: String, required: true }, 
    score: { type: Number, required: true, default: 0 }, 
    isCompleted: { type: Boolean, required: true, default: false }, 
    completedAt: { type: Date, required: false }, 
    remarks: { type: String, required: false },
    startedAt: { type: Date, required: false }
})


export const ExamModel = mongoose.model("exam", ExamSchema)