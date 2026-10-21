import { decodeIdToken, generateCodeVerifier, generateState } from "arctic";
import { google } from "../auth/Google.js";
import { OAuthAccountModel } from "../models/oauth_accounts.models.js";
import { UserModel } from "../models/user.models.js";
import { SessionModel } from "../models/session.models.js";
import crypto from "crypto"
import jwt from "jsonwebtoken"



export const getGoogleLoginPage = async (req, res) => {
    if (req.user) return res.redirect("/");

    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const url = google.createAuthorizationURL(state, codeVerifier, [
        "openid", // this is called scopes, here we are giving openid, and profile
        "profile", // openid gives tokens if needed, and profile gives user information
        // we are telling google about the information that we require from user.
        "email",
    ]);

    // This is to prevent auto login account without any confirmation while users will try to log in from the second time
    url.searchParams.set("prompt", "select_account");

    const cookieConfig = {
        httpOnly: true,
        maxAge: 60 * 10 * 1000,
        sameSite: "lax", // this is such that when google redirects to our website, cookies are maintained
    };

    res.cookie("google_oauth_state", state, cookieConfig);
    res.cookie("google_code_verifier", codeVerifier, cookieConfig);

    res.redirect(url.toString());
};




//getGoogleLoginCallback
export const getGoogleLoginCallbackPage = async (req, res) => {
    const { code, state } = req.query;
    const storedState = req.cookies?.google_oauth_state;
    const storedCodeVerifier = req.cookies?.google_code_verifier;

    // Clear cookies immediately after reading them
    console.log("State ", code, state, storedCodeVerifier, storedState)

    const cookieOptions = { httpOnly: true, path: '/', sameSite: "lax" };
    res.clearCookie("google_oauth_state", cookieOptions);
    res.clearCookie("google_code_verifier", cookieOptions);

    // Validate state
    if (!code || !state || !storedState || !storedCodeVerifier || state !== storedState) {
        console.warn("Google OAuth state mismatch or missing params/cookies.");
        return res.redirect("/login?error=oauth_state_mismatch"); // Redirect to login with error
    }

    let tokens;
    try {
        tokens = await google.validateAuthorizationCode(code.toString(), storedCodeVerifier);
        console.log("Google Tokens Received:", { accessToken: !!tokens.accessToken, idToken: !!tokens.idToken() });
    } catch (error) {
        console.error("Google OAuth code validation failed:", error);
        // Differentiate between user denying access and other errors if possible
        if (error.message.includes('invalid_grant')) { // Example check
            return res.redirect("/login?error=oauth_invalid_grant");
        }
        return res.redirect("/login?error=oauth_validation_failed");
    }

    let claims;
    try {
        claims = decodeIdToken(tokens.idToken());
        const { sub: googleUserId, email, name, picture: profilePicture, email_verified } = claims;

        console.log("Google Claims:", claims);

        if (!email || !email_verified) {
            console.warn("Google OAuth: Email not provided or not verified.");
            return res.redirect("/login?error=email_not_verified");
        }

        let user;
        let session;
        const userAgent = req.headers["user-agent"];
        const ip = req.ip;

        //? Case 1: User already exists with this Google Account linked.
        const existingOAuthAccount = await OAuthAccountModel.findOne({ provider: "google", providerAccountId: googleUserId });

        if (existingOAuthAccount) {
            console.log("OAuth Case 1: Existing Google OAuth link found.");
            user = await UserModel.findById(existingOAuthAccount.userId);
            if (!user) {
                // Data inconsistency: OAuth link exists but user doesn't. Clean up?
                console.error(`Inconsistency: OAuth account ${existingOAuthAccount._id} found but user ${existingOAuthAccount.userId} missing.`);
                await OAuthAccountModel.findByIdAndDelete(existingOAuthAccount._id); // Clean up orphan OAuth entry
                return res.redirect("/login?error=account_linking_error");
            }
            // User found, proceed to login
            session = await SessionModel.create({ userId: user._id, userAgent, ip });

        } else {
            //? Case 2 or 3: Check if user exists with this email (but not linked to this Google account yet)
            user = await UserModel.findOne({ email });

            if (user) {
                console.log("OAuth Case 2: User exists with email, linking Google Account.")
                // User exists, link the Google account
                await OAuthAccountModel.create({
                    userId: user._id,
                    email: user.email, // Use email from user model for consistency
                    provider: "google",
                    providerAccountId: googleUserId
                });
                session = await SessionModel.create({ userId: user._id, userAgent, ip });

            } else {
                console.log("OAuth Case 3: New user registration via Google OAuth.");
                //? Case 3: User doesn't exist, create a new user
                const [firstName, ...lastNameParts] = (name || '').split(' ');
                const lastName = lastNameParts.join(' ');

                // Handle missing required fields (dob, gender).
                // Option 1: Make them optional in the schema for OAuth users.
                // Option 2: Redirect to a profile completion page.
                // Option 3: Use placeholders (less ideal).
                // For now, let's assume they might be optional or we use placeholders/defaults.
                // Password is required by schema: generate a secure random one (user won't use it).
                const randomPassword = crypto.randomBytes(16).toString('hex'); // Generate random password
                const hashedPassword = crypto.createHash('sha512').update(randomPassword).digest('hex');


                try {
                    user = await UserModel.create({
                        firstName: firstName,
                        lastName: lastName,
                        email: email,
                        password: hashedPassword,
                    });

                    await OAuthAccountModel.create({
                        userId: user._id,
                        email: user.email,
                        provider: "google",
                        providerAccountId: googleUserId
                    });

                    session = await SessionModel.create({ userId: user._id, userAgent, ip });

                    // TODO: Consider redirecting to a profile completion page here
                    // return res.redirect("/complete-profile");

                } catch (creationError) {
                    console.error("Error creating new user during Google OAuth:", creationError);
                    if (creationError.code === 11000) { // Duplicate email, race condition?
                        return res.redirect("/login?error=account_exists_race_condition");
                    }
                    return res.redirect("/login?error=user_creation_failed");
                }
            }
        }

        // --- Session & Token Generation (Common for all cases) ---
        if (!user || !session) {
            console.error("User or Session object missing after OAuth flow.");
            return res.redirect("/login?error=session_creation_failed");
        }

        const accessTokenPayload = { _id: user._id.toString(), email: user.email, sessionId: session._id.toString() };
        const refreshTokenPayload = { sessionId: session._id.toString() };

        const accessToken = jwt.sign(accessTokenPayload, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });
        const refreshToken = jwt.sign(refreshTokenPayload, process.env.JWT_SECRET_KEY, { expiresIn: '7d' });

        const responseCookieOptions = {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        };
        res.cookie("iprepare_access_token", accessToken, { ...responseCookieOptions, maxAge: 1 * 24 * 60 * 60 * 1000 }); // 1 day
        res.cookie("iprepare_refresh_token", refreshToken, responseCookieOptions);

        // Redirect to dashboard or appropriate page
        res.redirect("/"); // Or "/complete-profile" for new users if needed

    } catch (err) {
        // Catch errors from decoding ID token or database operations
        console.error("Error processing Google callback:", err);
        return res.redirect("/login?error=callback_processing_error");
    }
};