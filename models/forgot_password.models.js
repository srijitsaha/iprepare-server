import mongoose from "mongoose"

const ForgotPasswordSchema = new mongoose.Schema({
    email: { type: String, required: true }
}, { timestamps: true })


// Auto-delete OTP after 2 minutes
ForgotPasswordSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 })


export const ForgotPasswordModel = mongoose.model('forgot_password', ForgotPasswordSchema)