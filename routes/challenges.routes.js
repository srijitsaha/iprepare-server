import { Router } from "express"
import { userAuthMW } from "../middlewares/auth.middleware.js"
import { addStreaks, getStreaksInfo } from "../controllers/streaks.controller.js"
import { createChallengeController, getChallengeInfoController, getChallengeQuestions, getChallengesByFilteringController, submitChallengedQuestionAnswerController, viewChallengeResultController } from "../controllers/challenge.controller.js"


const challengeRouter = Router()

challengeRouter.get('/get-streaks', userAuthMW, getStreaksInfo)
challengeRouter.post('/add-streaks', userAuthMW, addStreaks)


challengeRouter.post('/create-challenge', userAuthMW, createChallengeController)

challengeRouter.get('/know-about-challenge', userAuthMW, getChallengeInfoController)


challengeRouter.get('/start-challenge', userAuthMW, getChallengeQuestions)


challengeRouter.post('/submit-question', userAuthMW, submitChallengedQuestionAnswerController)


challengeRouter.get('/view-challenge-result', userAuthMW, viewChallengeResultController)


challengeRouter.get('/get-challenge-by-filtering', userAuthMW, getChallengesByFilteringController)


export default challengeRouter