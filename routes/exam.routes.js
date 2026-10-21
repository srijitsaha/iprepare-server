import { Router } from "express";
import { userAuthMW } from "../middlewares/auth.middleware.js";
import { findExamsByFiltering, getDailyStreaks, getUserReportGroupByTopic } from "../controllers/exam.controller.js";

const examRouter = Router()

examRouter.get("/daily-streaks", userAuthMW, getDailyStreaks)
examRouter.get("/topic-wise-report", userAuthMW, getUserReportGroupByTopic)
examRouter.get("/get-exams-by-filtering", userAuthMW, findExamsByFiltering)



export default examRouter