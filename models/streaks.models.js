import mongoose from "mongoose";

const StreaksSchema = new mongoose.Schema({
    userId: { type: String, required: true }, 
    days: { 
        type: [ Date ], 
        required: false, 
        default: []
    }, 
    points: { type: [ Number ], required: true, default: [0] }
}, { timestamps: true })


export const StreaksModel = mongoose.model("streak", StreaksSchema)