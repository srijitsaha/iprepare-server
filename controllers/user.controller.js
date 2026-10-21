import jsonwebtoken from "jsonwebtoken"
import { SessionModel } from "../models/session.models.js"
import { UserModel } from "../models/user.models.js"
import crypto from "node:crypto"
import { StreaksModel } from "../models/streaks.models.js"
import { ExamModel } from "../models/exam.models.js"
import { QuestionModel } from "../models/question.models.js"
import mongoose from "mongoose"
import { OTPModel } from "../models/otp.models.js"
import { sendEmailOTPForSignUp } from "../services/email.service.js"
import { ForgotPasswordModel } from "../models/forgot_password.models.js"



export const signupController = async (req, res) => {
    try {
        const { firstName, lastName, email, password, otp } = req.body
        if (!(firstName && lastName && email && password && otp)) {
            return res.status(400).send({ message: "You cannot leave any fields blank." })
        }

        // Finding OTP by email that just sent to user
        let otpData = await OTPModel.findOne({ email })

        // Check if user has not requested OTP
        if (!otpData) {
            return res.status(400).send({ success: false, message: "Please request an OTP first." })
        }

        // Check if user has entered incorrect OTP
        if (otpData.otp != otp) {
            // Decreasing OTP attempts by 1 if user has entered incorrect OTP
            otpData.attemptsLeft -= 1
            await otpData.save()

            return res.status(401).send({ success: false, message: "Incorrect OTP." })
        }

        await OTPModel.deleteOne({ email })

        // Hashing Password using built-in NodeJS module - crypto
        let hashedPassword = crypto.createHash('sha256').update(password).digest('hex')

        // Saving user data in db
        let newUser = await UserModel.create({ firstName, lastName, email, password: hashedPassword })

        // Creating a new session for user
        let newSession = await SessionModel.create({
            userId: newUser._id,
            userAgent: req.headers['user-agent'], ip: req.ip,
            expiresAt: Date.now() + Number(process.env.REFRESH_TOKEN_EXPIRE_DURATION)
        })

        // Creating new access token and refresh token with jsonwebtoken
        let access_token = jsonwebtoken.sign({ _id: newUser._id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' })
        let refresh_token = jsonwebtoken.sign({ _id: newSession._id }, process.env.JWT_SECRET_KEY, { expiresIn: '30d' })

        // Setting up access token and refresh token as cookies 
        res.cookie('iprepare_access_token', access_token, { maxAge: process.env.ACCESS_TOKEN_EXPIRE_DURATION, httpOnly: true })
        res.cookie('iprepare_refresh_token', refresh_token, { maxAge: process.env.REFRESH_TOKEN_EXPIRE_DURATION, httpOnly: true })

        // Setting up streaks
        // const streaks = await StreaksModel.create({ userId: newUser._id.toString() })

        // Sending response to user
        return res.status(201).send({ message: "User has been signed up successfully" })
    } catch (error) {
        console.log(error)
        if (error.code == 11000) {
            return res.status(403).send({ message: "Email already exists." })
        } else {
            return res.status(500).send({ message: "Some error occured." })
        }
    }
}



export const signinController = async (req, res) => {
    try {
        const { email, password } = req.body
        if (!(email && password)) {
            return res.status(400).send({ message: "Enter email and password." })
        }

        // Hashing Password using built-in NodeJS module - crypto
        let hashedPassword = crypto.createHash('sha256').update(password).digest('hex')

        // Finding user data by email in db
        let user = await UserModel.findOne({ email })

        //  If the user email does not find in db return an forbidden response
        if (!user) {
            return res.status(403).send({ message: "The email you entered is not connected to an account." })
        }

        // If the user password does not match against db return an unauthorized response
        if (user.password != hashedPassword) {
            return res.status(401).send({ message: "Incorrect Password." })
        }

        // Creating a new session for user
        let newSession = await SessionModel.create({
            userId: user._id,
            userAgent: req.headers['user-agent'], ip: req.ip,
            expiresAt: Date.now() + Number(process.env.REFRESH_TOKEN_EXPIRE_DURATION)
        })

        // Creating new access token and refresh token with jsonwebtoken
        let access_token = jsonwebtoken.sign({ _id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '30d' })
        let refresh_token = jsonwebtoken.sign({ _id: newSession._id }, process.env.JWT_SECRET_KEY, { expiresIn: '30d' })


        // Setting up streaks
        let streaks = await StreaksModel.create({ userId: user._id.toString(), points: [0] })
        streaks.days.addToSet(Date.now())
        await streaks.save()


        // Setting up access token and refresh token as cookies 
        res.cookie('iprepare_access_token', access_token, { maxAge: process.env.ACCESS_TOKEN_EXPIRE_DURATION, httpOnly: true })
        res.cookie('iprepare_refresh_token', refresh_token, { maxAge: process.env.REFRESH_TOKEN_EXPIRE_DURATION, httpOnly: true })


        // Sending response to user
        return res.status(201).send({ message: "User signed in successfully" })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ message: "Some error occured." })
    }
}



export const getUserInfoController = async (req, res) => {
    try {
        let userDetails = await UserModel.findById(req.user._id).select('firstName lastName points email avatar')
        if (userDetails) {
            return res.json({ 
                firstName: userDetails.firstName, lastName: userDetails.lastName, points: userDetails.points, 
                email: userDetails.email, avatar: userDetails.avatar
            })
        } else {
            return res.status(401).send({ message: "Please sign in first" })
        }
    } catch (error) {
        return res.send({ message: "Something went wrong." })
    }
}



export const getMistakenQuestions = async (req, res) => {
    try {
        // const userId = req.query._id          // For test mode
        const userId = req.user._id

        if (!req.query.board && !req.query.subject && !req.query.topic) {
            const distinctBoards = await ExamModel.find({ userId }).distinct('board')
            return res.status(200).send({ board: '', distinctBoards })
        }

        if (req.query.board && !req.query.subject && !req.query.topic) {
            const distinctSubjects = await ExamModel.find({ userId, board: req.query.board }).distinct('subject')
            return res.status(200).send({ board: req.query.board, subject: '', distinctSubjects })
        }

        if (req.query.board && req.query.subject && !req.query.topic) {
            const distinctTopics = await ExamModel.find({ userId, board: req.query.board, subject: req.query.subject }).distinct('topic')
            return res.status(200).send({ board: req.query.board, subject: req.query.subject, distinctTopics })
        }



        let allAnswers = (await ExamModel.find({ userId, board: req.query.board, subject: req.query.subject, topic: req.query.topic }).select('answers'))
            .reduce((accum, curElem) => { return { ...accum, ...curElem["answers"] } }, {})

        let allQuestionsData = await Promise.all(Object.entries(allAnswers).map(async (curElem) => {
            let question = await QuestionModel.findById(curElem[0]).lean()
            if (question.answer != curElem[1]) { return { ...question, userAnswered: curElem[1] } }
        }))

        let userMistakes = allQuestionsData.filter(e => e != null)

        return res.status(200).json(userMistakes)
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: "Some error occured" })
    }
}



export const toggleBookmarkController = async (req, res) => {
    const userId = req.user._id
    const questionId = req.body.questionId

    // Check if user has entered question id or not
    if (!questionId) { return res.status(400).send({ success: false, message: "Question ID not found." }) }

    // Finding a question by question id
    let question = await QuestionModel.findById(questionId)

    // Check if user is trying to bookmark a question which is not available
    if (!question) { return res.status(404).send({ success: false, message: "Question ID not found." }) }

    try {
        let result = await UserModel.findById(userId).select('bookmarks')
        if (result.bookmarks.includes(question._id)) {
            let data = await UserModel.findByIdAndUpdate(userId, { $pull: { bookmarks: question._id } }, { returnDocument: 'after' })

            return res.status(200).json({ success: true, bookmarks: data.bookmarks, addedToBookmark: false, message: "Removed from bookmarks" })
        } else if (!result.bookmarks.includes(question._id)) {
            let data = await UserModel.findByIdAndUpdate(userId, { $addToSet: { bookmarks: question._id } }, { returnDocument: 'after' })

            return res.status(201).json({ success: true, bookmarks: data.bookmarks, addedToBookmark: true, message: "Added to bookmarks" })
        } else if (!result) {
            return res.status(404).send({ success: false, message: "Invalid User." })
        }
    } catch (error) {
        console.log(error)
        return res.status(500).send({ message: "Internal Server Error." })
    }
}



export const showBookmarkedQuestionsController = async (req, res) => {
    try {
        const bookmarkedQuestions = await UserModel.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(req.user._id) } },
            {
                $set: {
                    bookmarkObjectIds: {
                        $map: {
                            input: "$bookmarks",
                            as: "bookmark",
                            in: {
                                $toObjectId: "$$bookmark"
                            }
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: "questions",
                    localField: "bookmarkObjectIds",
                    foreignField: "_id",
                    as: "bookmarkedQuestions"
                }
            },
            { $project: { _id: 0, bookmarkedQuestions: 1 } }
        ])

        return res.status(200).json({ questions: bookmarkedQuestions[0].bookmarkedQuestions, success: true })
    } catch (error) {
        return res.status(500).send({ message: "Internal Server Error." })
    }
}



export const getUserSettingsController = async (req, res) => {
    try {
        const userSettings = await UserModel.findById(req.user._id).select({ firstName: 1, lastName: 1, institutionName: 1, makeSuccessVisible: 1 }).lean()
        return res.status(200).json(userSettings)
    } catch (error) {
        return res.status(500).send({ success: false, message: "Internal Server Error." })
    }
}



export const modifyUserSettingsController = async (req, res) => {
    const { firstName, lastName, institutionName, makeSuccessVisible } = req.body
    try {
        if (!(firstName && lastName && institutionName)) {
            return res.status(400).send({ success: false, message: "Please fill all the field." })
        }
        const result = await UserModel.findByIdAndUpdate(req.user._id, { $set: { firstName, lastName, institutionName, makeSuccessVisible } }, { returnDocument: 'after' })
        return res.status(200).json({ success: true, message: "Data updated successfully." })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: "Some error occured." })
    }
}



export const getUserEmailController = async (req, res) => {
    try {
        const userSettings = await UserModel.findById(req.user._id).select({ email: 1 }).lean()
        return res.status(200).json({ email: userSettings.email })
    } catch (error) {
        return res.status(500).send({ success: false, message: "Internal Server Error." })
    }
}



export const changeUserPasswordController = async (req, res) => {
    const { oldPassword, newPassword } = req.body
    if (!(oldPassword && newPassword)) {
        return res.status(400).send({ success: false, message: "Please enter both old password and new password." })
    }
    try {
        const user = await UserModel.findById(req.user._id).select({ password: 1 }).lean()
        const hashedOldPassword = crypto.createHash('sha256').update(oldPassword).digest('hex')

        if (user.password != hashedOldPassword) {
            return res.status(401).send({ success: false, message: "Current password was incorrect." })
        }
        if (user.password == hashedOldPassword) {
            let newHashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex')
            const updatedUser = await UserModel.findByIdAndUpdate(req.user._id, { $set: { password: newHashedPassword } }, { returnDocument: 'after' })
            if (updatedUser.password == newHashedPassword) {
                return res.status(202).json({ success: true, message: "Password has been changed successfully." })
            } else {
                return res.status(429).json({ success: false, message: "Some error occured." })
            }
        }
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: "Internal Server Error." })
    }
}



export const sendOtpForRegisterController = async (req, res) => {
    const { email } = req.body
    try {
        if (!email) return res.status(400).json({ message: "Please provide an email address." })

        // Check if an user has already exists with this email
        const userExists = await UserModel.findOne({ email })
        if (userExists) return res.status(409).json({ message: "User already exists." })

        // If an user does not exists with this email then generate a random 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000)
        const result = await OTPModel.create({ email, otp })
        if (!result) return res.status(500).json({ message: "Failed to create OTP." })

        const hasSendOtp = await sendEmailOTPForSignUp({ email, otp })
        if (!hasSendOtp) return res.status(500).json({ message: "Failed to send OTP." })

        return res.status(202).json({ message: "OTP sent successfully." })
    } catch (error) {
        console.log(error)
        if (error.code === 11000) {
            return res.status(401).json({ success: false, message: "OTP has already been sent to this email" })
        }
        return res.status(400).send(error)
    }
}



export const resendOtpForRegisterController = async (req, res) => {
    const { email } = req.body
    try {
        const isOtpAlreadySent = await OTPModel.findOne({ email })
        if (isOtpAlreadySent) {
            return res.status(425).send({ success: false, message: "Please wait for a minute to regenerate the OTP." })
        }

        // If the OTP has benn already expired with this email, then generate a new random 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000)
        const result = await OTPModel.create({ email, otp })
        if (!result) return res.status(500).json({ message: "Failed to create OTP." })

        const hasSendOtp = await sendEmailOTPForSignUp({ email, otp })
        if (!hasSendOtp) return res.status(500).json({ message: "Failed to send OTP." })

        return res.status(202).json({ message: "OTP sent successfully." })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ message: "Internal Server Error." })
    }
}



// Forgot Password Controllers
export const sendOtpForForgotPasswordController = async (req, res) => {
    const { email } = req.body
    try {
        if (!email) return res.status(400).json({ success: false, message: "Please provide an email address." })

        // Check if an user has already exists with this email
        const userExists = await UserModel.findOne({ email })
        if (!userExists) return res.status(409).json({ success: false, message: "No user found." })

        // If an user does not exists with this email then generate a random 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000)
        const result = await OTPModel.create({ email, otp })
        if (!result) return res.status(500).json({ success: false, message: "Failed to create OTP." })
        
        const hasSendOtp = await sendEmailOTPForSignUp({ email, otp })
        if (!hasSendOtp) return res.status(500).json({ success: false, message: "Failed to send OTP." })

        return res.status(202).json({ success: true, message: "OTP sent successfully." })
    } catch (error) {
        // console.log(error)
        if (error.code === 11000) {
            return res.status(401).json({ success: false, message: "OTP has already been sent to this email" })
        }
        return res.status(400).send(error)
    }
}



export const resendOtpForForgotPasswordController = async (req, res) => {
    const { email } = req.body
    try {
        const isOtpAlreadySent = await OTPModel.findOne({ email })
        if (isOtpAlreadySent) {
            return res.status(425).send({ success: false, message: "Please wait for a minute to regenerate the OTP." })
        }

        const userExists = await UserModel.findOne({ email })
        if (!userExists) return res.status(409).json({ message: "No user found." })

        // If the OTP has benn already expired with this email, then generate a new random 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000)
        const result = await OTPModel.create({ email, otp })
        if (!result) return res.status(500).json({ message: "Failed to create OTP." })

        const hasSendOtp = await sendEmailOTPForSignUp({ email, otp })
        if (!hasSendOtp) return res.status(500).json({ message: "Failed to send OTP." })

        return res.status(202).json({ message: "OTP sent successfully." })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ message: "Internal Server Error." })
    }
}



export const verifyOtpForForgotPasswordController = async (req, res) => {
    try {
        const { email, otp } = req.body
        if (!(email && otp)) {
            return res.status(400).send({ message: "You cannot leave any fields blank.", success: false })
        }

        // Finding OTP by email that just sent to user
        let otpData = await OTPModel.findOne({ email })

        // Check if user has not requested OTP
        if (!otpData) {
            return res.status(400).send({ success: false, message: "Please request an OTP first." })
        }

        // Check if user has entered incorrect OTP
        if (otpData.otp != otp) {
            // Decreasing OTP attempts by 1 if user has entered incorrect OTP
            otpData.attemptsLeft -= 1
            await otpData.save()


            return res.status(401).send({ success: false, message: "Incorrect OTP." })
        }
 
        // Delete OTP after successfully verified
        await OTPModel.deleteOne({ _id: otpData._id })

        // Create a forgot password token
        const newForgotPasswordToken = await ForgotPasswordModel.create({ email })
        if(newForgotPasswordToken) {
            return res.status(201).json({ forgotPasswordToken: newForgotPasswordToken._id, success: true, message: "OTP has been verified successfully." })
        }

        return res.status(400).send({ message: "Some Error Occured", success: false })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ message: "Some Error Occured", success: false })
    }
}



export const forgotPasswordController = async (req, res) => {
    try {
        const { email, forgotPasswordToken, password } = req.body
        if(!(email && forgotPasswordToken && password)) {
            return res.status(400).send({ message: "You cannot leave any fields blank.", success: false })
        }

        // 
        const forgotPasswordInfo = await ForgotPasswordModel.findByIdAndDelete(forgotPasswordToken)
        
        if(forgotPasswordInfo.email != email) {
            return res.status(401).send({ message: "Unauthorized access.", success: false })
        }

        // Hashing Password using built-in NodeJS module - crypto
        let newHashedPassword = crypto.createHash('sha256').update(password).digest('hex')

        // Changing user password into db
        let updatedUserPassword = await UserModel.findOneAndUpdate({ email }, { $set: { password: newHashedPassword } }, { returnDocument: 'after' })

        // If password has been updated, then send success message to user.
        if(updatedUserPassword) {

	        // Delete Forgot Password token if Password has been set successfully
            await ForgotPasswordModel.deleteMany({ email })

            return res.status(202).json({ message: "Password has been set successfully.", success: true })
        }

        return res.status(400).send({ message: "Password has not been set.", success: false })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: "Some error occured." })
    }
}



export const signOutController = async (req, res) => {
    try {
        let decoded_refresh_token = jsonwebtoken.verify(req.cookies.iprepare_refresh_token, process.env.JWT_SECRET_KEY)

        // Fetching and deleting user id from existing session id
        let userSession = await SessionModel.findByIdAndDelete(decoded_refresh_token._id)


        if(userSession) {
            // Clear cookies such as access token and refresh token
            res.clearCookie('iprepare_refresh_token')
            res.clearCookie('iprepare_access_token')
        }

        return res.status(200).send({ success: true, message: "You have been signed out successfully." })
    } catch (error) {
        return res.send({ success: true, message: "Some error occured." })
    }
}