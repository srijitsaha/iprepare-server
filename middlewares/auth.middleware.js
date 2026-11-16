import jsonwebtoken from "jsonwebtoken"
import { SessionModel } from "../models/session.models.js"

export const userAuthMW = async (req, res, next) => {
    try {
        if (req.cookies.iprepare_access_token) {
            // console.log(req.cookies.iprepare_access_token)
            // Decoding refresh token by jwt through secret key
            let decoded_access_token = jsonwebtoken.verify(req.cookies.iprepare_access_token, process.env.JWT_SECRET_KEY)
            req.user = { _id: decoded_access_token._id }
            return next()

        } else if (req.cookies.iprepare_refresh_token) {
            // Decoding refresh token by jwt through secret key
            let decoded_refresh_token = jsonwebtoken.verify(req.cookies.iprepare_refresh_token, process.env.JWT_SECRET_KEY)
            // console.log(decoded_refresh_token)

            // Fetching user id from existing session id
            let user = await SessionModel.findById(decoded_refresh_token._id)

            // Converting session expiresAt field to a JavaScript date object
            const expiresAt = new Date(user.expiresAt); 
            // Today date object
            const today = new Date();

            // Calculating difference between session expiry date and today for checking if session has already expired
            const sessionExpiresWithin = expiresAt - today

            // Checking if session is active and session has not already expired (then generate access token else user has to be logged in again)
            if(user.isActive && sessionExpiresWithin > 0) {
                let access_token = jsonwebtoken.sign({ _id: user.userId }, process.env.JWT_SECRET_KEY, { expiresIn: '15m' })
                req.user = { _id: user._id }
                res.cookie('iprepare_access_token', access_token, { maxAge: process.env.ACCESS_TOKEN_EXPIRE_DURATION, httpOnly: true })
                next()
            } else {
                return res.send({ message: "Session expired. Please sign in again", loggedIn: false, isNotSignedIn: true })
            }
        } else {
            return res.send({ message: "Please sign in", loggedIn: false, isNotSignedIn: true })
        }
    } catch (error) {
        console.log(error.message == 'jwt expired')
        if(error.message == 'jwt expired') {
            // Decoding refresh token by jwt through secret key
            let decoded_refresh_token = jsonwebtoken.verify(req.cookies.iprepare_refresh_token, process.env.JWT_SECRET_KEY)
            // console.log(decoded_refresh_token)

            // Fetching user id from existing session id
            let user = await SessionModel.findById(decoded_refresh_token._id)

            // Converting session expiresAt field to a JavaScript date object
            const expiresAt = new Date(user.expiresAt); 
            // Today date object
            const today = new Date();

            // Calculating difference between session expiry date and today for checking if session has already expired
            const sessionExpiresWithin = expiresAt - today

            // Checking if session is active and session has not already expired (then generate access token else user has to be logged in again)
            if(user.isActive && sessionExpiresWithin > 0) {
                let access_token = jsonwebtoken.sign({ _id: user.userId }, process.env.JWT_SECRET_KEY, { expiresIn: '15m' })
                req.user = { _id: user._id }
                res.cookie('iprepare_access_token', access_token, { maxAge: process.env.ACCESS_TOKEN_EXPIRE_DURATION, httpOnly: true, secure: process.env.NODE_ENV == 'production' })
                next()
            } else {
                return res.send({ message: "Session expired. Please sign-in again.", loggedIn: false, isNotSignedIn: true })
            }
        }
        
        return res.send({ message: "Some error occured", loggedIn: false, isNotSignedIn: true })
    }
}