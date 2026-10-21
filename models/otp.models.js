import mongoose from "mongoose";

const OTPSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: [true, "OTP has already been sent to this email"] }, 
    otp: { type: String, required: true }, 
    attemptsLeft: { type: Number, default: 4 }, 
    expiresAt: { type: Date, default: Date.now() + (2 * 60 * 1000) }
}, { timestamps: true })

// Auto-delete OTP after 2 minutes
OTPSchema.index({ createdAt: 1 }, { expireAfterSeconds: 120 })

// Middleware to delete user when OTP expires
OTPSchema.pre("remove", async function (next) {
    try {
        await User.deleteOne({ email: this.email })
        next()
    } catch (err) {
        next(err)
    }
})

export const OTPModel = mongoose.model("OTP", OTPSchema)