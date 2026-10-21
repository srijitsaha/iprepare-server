import mongoose from "mongoose"

const QuestionSchema = new mongoose.Schema({
    question: { type: String, required: true, unique: true }, 
    options: { type: [], required: true }, 
    answer: { type: String, required: true }, 
    explaination: { type: String, required: true }, 
    board: { type: String, required: true }, 
    subject: { type: String, required: true }, 
    topic: { type: String, required: true }
})

export const QuestionModel = mongoose.model("question", QuestionSchema)