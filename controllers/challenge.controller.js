import { ChallengeModel } from "../models/challenge.models.js"
import { ExamModel } from "../models/exam.models.js"
import { QuestionModel } from "../models/question.models.js"
import { UserModel } from "../models/user.models.js"
import { shuffleArray } from "../utilities/shuffleArray.js"
import { checkChallengeStatus } from "../utilities/winInBattleMode.js"
import { queryForJoinChallengesWithExams, queryForJoinChallengesWithUsers } from "../db/queries/partsOfAggregationQuery.js"



export const getChallengeQuestions = async (req, res) => {
    try {
        const challengeData = await ChallengeModel.findById(req.query.challengeId)

        // Check if another user tries to join
        if (!(challengeData.userId.includes(req.user._id))) {
            return res.status(401).send({ message: "Unauthorized Access", success: false })
        }

        let createExamForHost
        let createExamForFriend


        let updatedChallengeExamId
        if (challengeData.examId.length == 0) {
            if (challengeData.host != req.user._id) {
                return res.status(403).send({ message: "First question should be attended by host" })
            }

            createExamForHost = await ExamModel.create({
                userId: req.user._id,
                board: challengeData.board, subject: challengeData.subject, topic: challengeData.topic,
                totalQuestions: challengeData.totalQuestions
            })

            createExamForFriend = await ExamModel.create({
                userId: challengeData.userId[1],
                board: challengeData.board, subject: challengeData.subject, topic: challengeData.topic,
                totalQuestions: challengeData.totalQuestions
            })

            updatedChallengeExamId = await ChallengeModel.findByIdAndUpdate(challengeData._id.toString(), { $set: { examId: [createExamForHost._id, createExamForFriend._id] } }, { returnDocument: 'after' })
        }
        if (challengeData.examId.length == 2) {
            if (challengeData.host == req.user._id.toString()) {
                return res.status(200).json({
                    success: true, examId: challengeData.examId[0], totalQuestions: challengeData.totalQuestions
                })
            } else {
                return res.status(200).json({
                    success: true, examId: challengeData.examId[1], totalQuestions: challengeData.totalQuestions
                })
            }
        }

        // console.log("Host: ", createExamForHost)
        // console.log("Friend: ", createExamForFriend)

        const examData = await ExamModel.findById(createExamForHost._id.toString())


        // If the exam has not been started, find questions using board, subject and topic.
        let questionData = await QuestionModel.find({
            board: examData.board, subject: examData.subject, topic: examData.topic
        }).select({ _id: 1, question: 1, options: 1 })

        // Put the questions in random order and limit the number of questions using slice.
        questionData = shuffleArray(questionData).slice(0, examData.totalQuestions)

        // Keeping the questions' id only to save into db. 
        let questionIds = questionData.map(curQuestion => curQuestion._id)

        // Save the questions' id and start time.
        let updatedExamData = await ExamModel.findByIdAndUpdate(examData._id, { $set: { questions: questionIds, startedAt: Date.now() } }, { returnDocument: 'after' })
        let updatedExamDataForFriend = await ExamModel.findByIdAndUpdate(createExamForFriend._id, { $set: { questions: questionIds, startedAt: Date.now() } }, { returnDocument: 'after' })


        if (updatedChallengeExamId.host == req.user._id) {
            return res.status(201).json({
                success: true, examId: updatedChallengeExamId.examId[0], totalQuestions: updatedChallengeExamId.totalQuestions
            })
        } else {
            return res.status(201).json({
                success: true, examId: updatedChallengeExamId.examId[1], totalQuestions: updatedChallengeExamId.totalQuestions
            })
        }
    } catch (error) {
        console.log(error)
        return res.status(501).send({ message: "Something went wrong." })
    }
}



export const createChallengeController = async (req, res) => {
    try {
        const { board, subject, topic, totalQuestions } = req.body
        if (!(totalQuestions >= 5 && totalQuestions <= 15)) {
            return res.status(400).send({ message: "Number of questions can't be less than 5 and greater than 15" })
        }
        const newChallenge = await ChallengeModel.create({ userId: [req.user._id], host: req.user._id, board, subject, topic, totalQuestions })

        return res.status(201).json({ success: true, challengeId: newChallenge._id })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: "Internal Server Error" })
    }
}



export const getChallengeInfoController = async (req, res) => {
    try {
        const response = await ChallengeModel.findOne({ _id: req.query.challengeId }).select({ board: 1, subject: 1, topic: 1, totalQuestions: 1, host: 1, userId: 1, winner: 1 }).lean()

        const hostInfo = await UserModel.findById(response.host.toString()).select({ firstName: 1, lastName: 1 }).lean()
        return res.status(200).json({
            board: response.board, subject: response.subject, topic: response.topic, totalQuestions: response.totalQuestions,
            hostFirstName: hostInfo.firstName, hostLastName: hostInfo.lastName, areYouAdmin: response.host == req.user._id,
            isChallengeAccepted: response.userId.length >= 2
        })
    } catch (error) {
        return res.status(500).send({ success: false, message: "Internal Server Error." })
    }
}



export const submitChallengedQuestionAnswerController = async (req, res) => {
    try {
        const challengeData = await ChallengeModel.findById(req.body.challengeId)

        if (!challengeData) {
            return res.status(400).send({ message: "Challenge ID not found", success: false })
        }

        if (!challengeData.examId.includes(req.body.examId)) {
            return res.status(401).send({ message: "The exam ID has been sent not belongs to this challenge or exam ID not exists", success: false })
        }


        const examData = await ExamModel.findById(req.body.examId)

        if (!examData) {
            return res.status(404).send({ message: "Exam not found.", success: false })
        }

        if (examData.userId != req.user._id) {
            return res.status(401).send({ message: "Unauthorized access.", success: false })
        }

        if (examData.isCompleted == true) {
            return res.status(403).send({ message: "Exam is already completed.", success: false })
        }

        if (!(req.body.questionId && req.body.answer)) {
            return res.status(403).send({ message: "Please answer the question.", success: false })
        }

        // Converting ObjectId to string (even if not needed)
        const questionId = String(req.body.questionId)
        const questionIds = examData.questions.map(String)

        // Checking if user is answering wrong question id
        if (!questionIds.includes(questionId)) {
            return res.status(400).send({ message: "You have chosen the wrong question.", success: false })
        }

        // Checking if user has already answered a question
        if (examData.answers?.[questionId]) {
            return res.status(403).send({ message: "You have already answered this question.", success: false })
        }

        // Checking if user is trying to tamper with the intregrity of questions order
        const expectedQuestionId = questionIds[examData.currentQuestionIndex]
        if (expectedQuestionId !== questionId) {
            return res.status(400).send({ message: "Please answer the current question in order.", success: false })
        }

        const actualQuestion = await QuestionModel.findById(questionId)
        if (!actualQuestion) {
            return res.status(404).send({ message: "Question not found.", success: false })
        }

        // Checking if user answered right or wrong
        const isCorrect = actualQuestion.answer == req.body.answer

        // Making update query
        const updateQuery = {
            $set: { [`answers.${questionId}`]: req.body.answer },
            $inc: { currentQuestionIndex: 1, score: isCorrect ? 1 : 0 }
        }

        // Checking the current question is the last question or not
        const isLastQuestion = examData.currentQuestionIndex + 1 >= examData.questions.length
        if (isLastQuestion) {
            updateQuery.$set.isCompleted = true,
                updateQuery.$set.completedAt = Date.now()
        }

        // Execute update query into db
        const newExamData = await ExamModel.findByIdAndUpdate(examData._id, updateQuery, { returnDocument: 'after' })

        // Find other friend's exam id in this challenge
        let otherFriendExamId = req.body.examId == challengeData.examId[0] ? challengeData.examId[1] : challengeData.examId[0]


        let otherFriendExam = await ExamModel.findById(otherFriendExamId)



        let challengeStatus = checkChallengeStatus(
            newExamData.userId == challengeData.host ? "Host" : "Friend", otherFriendExam.userId == challengeData.host ? "Host" : "Friend",
            newExamData.score, otherFriendExam.score,
            newExamData.currentQuestionIndex, otherFriendExam.currentQuestionIndex,
            challengeData.totalQuestions
        )

        // Check if the challenge result has been decided or not
        if (challengeStatus.winner != undefined || challengeStatus.winner == 0) {
            // Check if the challenge has been drawn or won / lost
            if (challengeStatus.winner == 0) {
                // Set the winner as tied
                challengeData.winner = "Tied"

                // Add points into host and friends points
                const updatedUserPoints = await UserModel.updateMany({
                    $or: [{ _id: challengeData.userId[0] }, { _id: challengeData.userId[1] }]
                }, { $inc: { points: Math.round(examData.score / challengeData.totalQuestions * 100) } })


            } else {
                // Set the user id of the winner of the challenge as challenge winner
                challengeData.winner = challengeStatus.winner == "Host" ? challengeData.userId[0] : challengeData.userId[1]
            }

            // Save the winner info into db
            await challengeData.save()

            // Mark both host and friend exams as completed
            examData.isCompleted = true
            otherFriendExam.isCompleted = true

            // Completed time
            let completedTime = Date.now()

            // Setting complete timing of both exam
            examData.completedAt = completedTime
            otherFriendExam.completedAt = completedTime

            // Save the exam info to db
            await examData.save()
            await otherFriendExam.save()


            // Add points into host and friends points
            let winnerUserIdIndex = challengeData.userId.findIndex(user => user == challengeData.winner)

            if (winnerUserIdIndex >= 0) {
                let winnerExamDetails = await ExamModel.findById(challengeData.examId[winnerUserIdIndex])
                let otherFriendExamDetails = await ExamModel.findById(challengeData.examId[winnerUserIdIndex == 0 ? 1 : 0])

                // Add points into winner points
                let allChallengesWinnerWin = await ChallengeModel.countDocuments({ winner: challengeData.winner })

                let winnerPoints = await UserModel.findByIdAndUpdate(
                    challengeData.winner, 
                    { $inc: { points: Math.round(winnerExamDetails.score / challengeData.totalQuestions * 200) + (challengeData.totalQuestions * 10) + (allChallengesWinnerWin * 10) } },
                    { returnDocument: 'after' }
                )


                // Add points into other friend 
                let otherFriendPoints = await UserModel.findByIdAndUpdate(
                    challengeData.userId[winnerUserIdIndex == 0 ? 1 : 0],
                    { $inc: { points: Math.round(otherFriendExamDetails.score / challengeData.totalQuestions * 100) } },
                    { returnDocument: 'after' }
                )

            }



            return res.status(200).send({
                correct: actualQuestion.answer,
                explaination: actualQuestion.explaination,
                isCorrect,
                isCompleted: challengeStatus.winner != undefined || challengeStatus.winner == 0,
                ...(examData.isCompleted && { board: examData.board }),
                ...(examData.isCompleted && { subject: examData.subject }),
                ...(examData.isCompleted && { topic: examData.topic }),
                ...(examData.isCompleted && { winner: challengeData.winner }),
                ...(examData.isCompleted && { winnerScore: newExamData.score }),
                ...(examData.isCompleted && { otherFriendScore: otherFriendExam.score })
            })
        }



        return res.status(200).send({
            correct: actualQuestion.answer,
            explaination: actualQuestion.explaination,
            isCorrect,
            isCompleted: isLastQuestion,
            ...(isLastQuestion && { board: examData.board }),
            ...(isLastQuestion && { subject: examData.subject }),
            ...(isLastQuestion && { topic: examData.topic })
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ message: "Something went wrong." })
    }
}



export const viewChallengeResultController = async (req, res) => {
    try {
        const challengeData = await ChallengeModel.findById(req.query.challengeId)

        // Check if another user tries to join
        if (!(challengeData.userId.includes(req.user._id))) {
            return res.status(401).send({ message: "Unauthorized Access", success: false })
        }

        // * For 1st user
        let user1Result = {}


        const userData1 = await UserModel.findById(challengeData.userId[0]).select('firstName lastName institutionName')
        const examData1 = await ExamModel.findById(challengeData.examId[0]).select('totalQuestions currentQuestionIndex score completedAt startedAt')

        // Personal Info of 1st user
        user1Result.areYou = req.user._id == userData1._id.toString()
        user1Result.firstName = userData1.firstName
        user1Result.lastName = userData1.lastName
        user1Result.institutionName = userData1.institutionName


        // Challenge Info of 1st user
        user1Result.isWinner = challengeData.winner == userData1._id.toString()
        if(user1Result.isWinner) {
            let allChallengesWinnerWin = await ChallengeModel.countDocuments({ winner: userData1._id.toString() })
            user1Result.bonusPoints = allChallengesWinnerWin * 10
        }
        user1Result.totalQuestions = examData1.totalQuestions
        user1Result.score = examData1.score
        user1Result.questionsAttended = examData1.currentQuestionIndex + 1
        user1Result.completedAt = examData1.completedAt
        user1Result.startedAt = examData1.startedAt
        user1Result.host = challengeData.host == userData1._id.toString()

        // If the request is coming from user1, then exam id of user 1 has been provided
        if (user1Result.areYou) { user1Result.examId = examData1._id.toString() }


        // Total time spent by 1st user during challenge
        user1Result.totalTime = new Date(examData1.completedAt) - new Date(examData1.startedAt)



        // * For 2nd user
        let user2Result = {}


        const userData2 = await UserModel.findById(challengeData.userId[1]).select('firstName lastName institutionName')
        const examData2 = await ExamModel.findById(challengeData.examId[1]).select('totalQuestions score completedAt startedAt currentQuestionIndex')

        // Personal Info of 2nd user
        user2Result.areYou = req.user._id == userData2._id.toString()
        user2Result.firstName = userData2.firstName
        user2Result.lastName = userData2.lastName
        user2Result.institutionName = userData2.institutionName

        // Challenge info of 2nd user
        user2Result.isWinner = challengeData.winner == userData2._id.toString()
        // Calculate bonus points if 2nd user win
        if(user2Result.isWinner) {
            let allChallengesWinnerWin = await ChallengeModel.countDocuments({ winner: userData2._id.toString() })
            user2Result.bonusPoints = allChallengesWinnerWin * 10
        }

        user2Result.totalQuestions = examData2.totalQuestions
        user2Result.score = examData2.score
        user2Result.questionsAttended = examData2.currentQuestionIndex + 1
        user2Result.completedAt = examData2.completedAt
        user2Result.startedAt = examData2.startedAt
        user2Result.host = challengeData.host == userData2._id.toString()


        // If the request is coming from user2, then exam id of user 2 has been provided
        if (user2Result.areYou) { user2Result.examId = examData2._id.toString() }

        // Total time spent by 2nd user during challenge
        user2Result.totalTime = new Date(examData2.completedAt) - new Date(examData2.startedAt)

        let challengeInfo = {
            board: challengeData.board,
            subject: challengeData.subject,
            totalQuestions: challengeData.totalQuestions,
            topic: challengeData.topic,
            winner: challengeData.winner
        }

        return res.json({ user1Result, user2Result, challengeInfo })
    } catch (error) {
        console.log(error)
        return res.send({ success: false, error })
    }
}



export const getChallengesByFilteringController = async (req, res) => {
    try {
        const { host, board, subject, topic, winner, sortBy, sortType } = req.query
        const allowedKeys = ['host', 'board', 'subject', 'topic', 'winner', 'sortBy', 'sortType']

        if (board && subject && topic) {
            // const matchedChallenges = await ChallengeModel.find({
            //     board, subject, topic, userId: { $in: req.user._id },
            //     ...(host && { host: host == "You" ? req.user._id : { $ne: req.user._id } }),
            //     ...(winner && { winner: winner == "You" ? req.user._id : winner == "Tied" ? "Tied" : { $ne: req.user._id } }),
            // })

            const matchedChallenges = await ChallengeModel.aggregate([
                {
                    $match: {
                        board, subject, userId: { $in: [req.user._id] },
                        ...(host && { host: host == "You" ? req.user._id : { $ne: req.user._id } }),
                        ...(winner && { winner: winner == "You" ? req.user._id : { $ne: req.user._id } }),
                    }
                },
                // Step 2: SORT NEXT (1 for ascending, -1 for descending)
                ...(sortBy ? [{ $sort: { [sortBy]: sortType == "Descending" ? -1 : 1 } }] : []),

                { ...queryForJoinChallengesWithUsers },
                { ...queryForJoinChallengesWithExams }
            ])
            return res.json({ success: true, matchedChallenges })
        }

        if (board && subject) {
            const topicList = await ChallengeModel.distinct('topic', { board, subject, userId: { $in: req.user._id } })

            // const matchedChallenges = await ChallengeModel.find({
            //     board, subject, userId: { $in: req.user._id },
            //     ...(host && { host: host == "You" ? req.user._id : { $ne: req.user._id } }),
            //     ...(winner && { winner: winner == "You" ? req.user._id : { $ne: req.user._id } }),
            // }).sort({ ...(sortBy && { [sortBy]: sortType == "Descending" ? -1 : 1 }) })

            const matchedChallenges = await ChallengeModel.aggregate([
                {
                    $match: {
                        board, subject, userId: { $in: [req.user._id] },
                        ...(host && { host: host == "You" ? req.user._id : { $ne: req.user._id } }),
                        ...(winner && { winner: winner == "You" ? req.user._id : { $ne: req.user._id } }),
                    }
                },
                // Step 2: SORT NEXT (1 for ascending, -1 for descending)
                ...(sortBy ? [{ $sort: { [sortBy]: sortType == "Descending" ? -1 : 1 } }] : []),

                { ...queryForJoinChallengesWithUsers },
                { ...queryForJoinChallengesWithExams }
            ])
            return res.json({ success: true, matchedChallenges, topicList })
        }

        if (board) {
            const subjectList = await ChallengeModel.distinct('subject', { board, userId: { $in: req.user._id } })

            // const matchedChallenges = await ChallengeModel.find({
            //     board, userId: { $in: req.user._id },
            //     ...(host && { host: host == "You" ? req.user._id : { $ne: req.user._id } }),
            //     ...(winner && { winner: winner == "You" ? req.user._id : { $ne: req.user._id } }),
            // })

            const matchedChallenges = await ChallengeModel.aggregate([
                {
                    $match: {
                        board, userId: { $in: [req.user._id] },
                        ...(host && { host: host == "You" ? req.user._id : { $ne: req.user._id } }),
                        ...(winner && { winner: winner == "You" ? req.user._id : { $ne: req.user._id } }),
                    }
                },
                // Step 2: SORT NEXT (1 for ascending, -1 for descending)
                ...(sortBy ? [{ $sort: { [sortBy]: sortType == "Descending" ? -1 : 1 } }] : []),

                { ...queryForJoinChallengesWithUsers },
                { ...queryForJoinChallengesWithExams }

            ])
            return res.json({ success: true, matchedChallenges, subjectList })
        }

        if (!board) {
            const boardList = await ChallengeModel.distinct('board', { userId: { $in: req.user._id } })

            // const matchedChallenges = await ChallengeModel.find({ userId: { $in: req.user._id }, 
            //     ...(host && { host: host == "You" ? req.user._id: { $ne: req.user._id } }), 
            //     ...(winner && { winner: winner == "You" ? req.user._id: { $ne: req.user._id } }), 
            // })


            const matchedChallenges = await ChallengeModel.aggregate([
                {
                    $match: {
                        userId: { $in: [req.user._id] },
                        ...(host && { host: host == "You" ? req.user._id : { $ne: req.user._id } }),
                        ...(winner && { winner: winner == "You" ? req.user._id : { $ne: req.user._id } }),
                    }
                },
                // Step 2: SORT NEXT (1 for ascending, -1 for descending)
                ...(sortBy ? [{ $sort: { [sortBy]: sortType == "Descending" ? -1 : 1 } }] : []),

                { ...queryForJoinChallengesWithUsers },
                { ...queryForJoinChallengesWithExams }

            ])
            return res.json({ success: true, matchedChallenges, boardList })
        }

    } catch (error) {
        return res.send({ success: false })
    }
}