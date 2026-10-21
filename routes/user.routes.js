import { Router } from "express";
import { userAuthMW } from "../middlewares/auth.middleware.js";
import { getUserInfoController, getMistakenQuestions, showBookmarkedQuestionsController, signinController, signupController, toggleBookmarkController, getUserSettingsController, modifyUserSettingsController, getUserEmailController, changeUserPasswordController, sendOtpForRegisterController, resendOtpForRegisterController, sendOtpForForgotPasswordController, verifyOtpForForgotPasswordController, forgotPasswordController, resendOtpForForgotPasswordController, signOutController } from "../controllers/user.controller.js";
import { getGoogleLoginCallbackPage, getGoogleLoginPage } from "../controllers/auth.controller.js";

const userRouter = Router()

// Sign in and sign up user
userRouter.post("/sign-up", signupController)
userRouter.post("/sign-in", signinController)


// Sign in with Google
userRouter.get("/auth/google", getGoogleLoginPage)
userRouter.get("/auth/google/callback", getGoogleLoginCallbackPage)


// Get user info (during page loading)
userRouter.get("/get-user-info", userAuthMW, getUserInfoController)


// Review mistaken questions
userRouter.get("/mistaken-questions", userAuthMW, getMistakenQuestions)


// Bookmarks
userRouter.post("/toggle-question-bookmark", userAuthMW, toggleBookmarkController)
userRouter.get("/show-bookmarked-questions", userAuthMW, showBookmarkedQuestionsController)


// Settings
userRouter.get('/get-user-settings', userAuthMW, getUserSettingsController)
userRouter.post('/modify-user-settings', userAuthMW, modifyUserSettingsController)


// User Email
userRouter.get('/get-user-email', userAuthMW, getUserEmailController)


// Change User Password
userRouter.patch('/change-user-password', userAuthMW, changeUserPasswordController)


// Send OTP to user before register for email verification
userRouter.post('/send-otp-to-user-for-register', sendOtpForRegisterController)
userRouter.post('/resend-otp-to-user-for-register', resendOtpForRegisterController)

// Send OTP to user for forgot password
userRouter.post('/send-otp-to-user-for-forgot-password', sendOtpForForgotPasswordController)
userRouter.post('/resend-otp-to-user-for-forgot-password', resendOtpForForgotPasswordController)

// Verify OTP to user for forgot password
userRouter.post('/verify-otp-to-user-for-forgot-password', verifyOtpForForgotPasswordController)

// Set new password 
userRouter.patch('/set-new-password-for-forgot-password', forgotPasswordController)

// Sign out user
userRouter.post("/sign-out", userAuthMW, signOutController)


export default userRouter