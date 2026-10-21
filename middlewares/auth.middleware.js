import jsonwebtoken from "jsonwebtoken"
import { SessionModel } from "../models/session.models.js"

export const userAuthMW = async (req, res, next) => {
    if(req.cookies.iprepare_access_token) {
        // console.log(req.cookies.iprepare_access_token)
        // Decoding refresh token by jwt through secret key
        let decoded_access_token = jsonwebtoken.verify(req.cookies.iprepare_access_token, process.env.JWT_SECRET_KEY)
        req.user = { _id: decoded_access_token._id }
        return next()

    } else if(req.cookies.iprepare_refresh_token) {

        // Decoding refresh token by jwt through secret key
        let decoded_refresh_token = jsonwebtoken.verify(req.cookies.iprepare_refresh_token, process.env.JWT_SECRET_KEY)
        // console.log(decoded_refresh_token)

        // Fetching user id from existing session id
        let user = await SessionModel.findById(decoded_refresh_token._id)
        let access_token = jsonwebtoken.sign({ _id: user.userId }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' })
        req.user = { _id: user._id }
        res.cookie('iprepare_access_token', access_token, { maxAge: process.env.ACCESS_TOKEN_EXPIRE_DURATION, httpOnly: true })
        next()
    } else {
        
        return res.send({ message: "Please sign in", loggedIn: false, isNotSignedIn: true })
    }
}