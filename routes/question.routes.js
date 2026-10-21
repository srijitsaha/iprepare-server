import { Router } from "express";
import { userAuthMW } from "../middlewares/auth.middleware.js"
import { checkExamCompleted, createExam, reviewExamAnswers, reviewExamAnswersTest, viewExamResult } from "../controllers/exam.controller.js";
import { completeExam, getQuestions, submitQuestionAnswer } from "../controllers/question.controller.js";

const questionRouter = Router()

questionRouter.get('/start-exam', userAuthMW, createExam)
questionRouter.post('/get-questions', userAuthMW, getQuestions)
questionRouter.post('/submit-question', userAuthMW, submitQuestionAnswer)
questionRouter.post('/complete-exam', userAuthMW, completeExam)
questionRouter.get('/view-exam-result/:examId', userAuthMW, viewExamResult)
questionRouter.get('/review-exam-answers/:examId', userAuthMW, reviewExamAnswers)
questionRouter.get('/check-exam-completed/:examId', userAuthMW, checkExamCompleted)


export default questionRouter