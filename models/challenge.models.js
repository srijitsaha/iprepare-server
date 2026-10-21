import mongoose from "mongoose"

const ChallengeSchema = new mongoose.Schema({
    examId: { type: [String], default: [], required: false }, 
    userId: { type: [String], default: [], required: false }, 
    winner: { type: String, required: false }, 
    host: { type: String, required: true }, 
    board: { type: String, required: true }, 
    subject: { type: String, required: true }, 
    topic: { type: String, required: true }, 
    totalQuestions: { type: Number, required: true, default: 10 }, 
}, { timestamps: true })

export const ChallengeModel = mongoose.model('challenge', ChallengeSchema)