import mongoose from "mongoose"

const OAuthAccountSchema = new mongoose.Schema({
  userId: { type: String, required: true }, 
  provider: { type: String }, 
  providerAccountId: { type: String }, 
  email: { type: String }, 
}, { timestamps: true })

export const OAuthAccountModel = mongoose.model("OAuthAccount", OAuthAccountSchema)