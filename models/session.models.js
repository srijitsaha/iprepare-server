import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema({
    userId: { type: String, required: true }, 
    expiresAt: { type: Date, required: false }, 
    userAgent: { type: String, required: true }, 
    ip: { type: String, required: true }
},  { timestamps: true })

export const SessionModel = mongoose.model("session", SessionSchema)