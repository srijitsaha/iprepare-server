import mongoose from "mongoose"


const UserSchema = new mongoose.Schema({
    firstName: { type: String, required: true }, 
    lastName: { type: String, required: true }, 
    email: { type: String, required: true, unique: true }, 
    password: { type: String, required: true }, 
    bookmarks: { type: [], default: [] }, 
    institutionName: { type: String, required: false }, 
    makeSuccessVisible: { type: Boolean, required: false, default: true },
    avatar: { type: String, required: false }, 
    points: { type: Number, required: false, default: 0 }
}, { timestamps: true })

export const UserModel = mongoose.model("User", UserSchema)