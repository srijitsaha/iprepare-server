import { ExamModel } from "../models/exam.models.js"
import { QuestionModel } from "../models/question.models.js"
import { UserModel } from "../models/user.models.js"
import { fillLastSevenDays } from "../utilities/fillRestStreaksData.js"
import { OpenRouter } from '@openrouter/sdk'


const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});


export const createExam = async (req, res) => {
  try {
    const newExam = await ExamModel.create({
      userId: req.user._id,
      board: req.query.board, subject: req.query.subject, topic: req.query.topic,
      totalQuestions: req.query.totalQuestions
    })

    return res.json({ examId: newExam._id, message: "Exam has been started" })
  } catch (error) {
    return res.send({ message: "Error while starting exam.", error })
  }
}



export const reviewExamAnswers = async (req, res) => {
  try {
    const examDetails = await ExamModel.findById(req.params.examId)

    let user = await UserModel.findById(req.user._id).select('bookmarks')

    // Check if the user who has given the exam or not
    if (examDetails.userId != req.user._id) {
      return res.status(401).send({ success: false, message: "Unauthorized access" })
    }

    // Check if exam has completed
    if (examDetails.isCompleted == false) {
      return res.status(200).json({ success: false, message: "Exam is progressing smoothly and has not completed yet.", isCompleted: false })
    }

    // Conerting object into array for convenience
    // let userQuestionsAnswers = Object.entries(examDetails.answers)


    let correctionAnswer = await Promise.all(examDetails.questions.map(async (curElem, index, arr) => {
      // Find the current question using question id
      let actualQuestionData = await QuestionModel.findById(curElem)
        .select({ _id: 1, question: 1, options: 1, answer: 1, explaination: 1 }).lean()         // Here lean is used to remove unnecessary information and stats of internal operations behind the scene that MongoDB did itself


      let isUserAnsweredCorrect = examDetails.answers[actualQuestionData._id.toString()] == undefined ? null : examDetails.answers[actualQuestionData._id.toString()] == actualQuestionData.answer ? true : false
      let userAnswered = examDetails.answers[actualQuestionData._id.toString()] == undefined ? null : examDetails.answers[actualQuestionData._id.toString()]

      // console.log(userAnswered, isUserAnsweredCorrect)


      return {
        ...actualQuestionData,
        userAnswered: userAnswered,
        isUserAnsweredCorrect: isUserAnsweredCorrect,
        bookmarked: user.bookmarks.includes(actualQuestionData._id)
      }
    }))

    return res.status(200).json({
      correctionAnswer,
      board: examDetails.board, subject: examDetails.subject, topic: examDetails.topic, totalQuestions: examDetails.totalQuestions,
      startedAt: examDetails.startedAt, completedAt: examDetails.completedAt, remarks: examDetails?.remarks || null, score: examDetails.score
    })
  } catch (error) {
    return res.status(500).send(error)
  }
}



export const checkExamCompleted = async (req, res) => {
  try {
    const examDetails = await ExamModel.findOne({ _id: req.params.examId })
    if (examDetails.userId != req.user._id) {
      return res.status(401).send({ success: false, message: "Unauthorized Access" })
    }
    return res.status(200).send({ success: true, isExamAlreadyCompleted: examDetails.isCompleted })
  } catch (error) {
    console.log(error)
    return res.status(500).send({ success: false, error: "Internal server error" })
  }
}



export const viewExamResult = async (req, res) => {
  try {
    const examData = await ExamModel.findOne({ _id: req.params.examId })

    // Check if the user who has given the exam or not
    if (examData.userId != req.user._id) {
      return res.status(401).send({ success: false, message: "Unauthorized Access" })
    }

    // Aggregation query that calculate difference between start time and end time.
    let timeDifference = await ExamModel.aggregate([
      {
        $project: {
          differenceInSeconds: {
            $divide: [
              { $subtract: ["$completedAt", "$startedAt"] },
              1000
            ]
          }
        }
      }
    ])



    return res.status(200).send({
      success: true,
      board: examData.board, subject: examData.subject, topic: examData.topic,
      totalQuestions: examData.totalQuestions, score: examData.score,
      startedAt: examData.startedAt, completedAt: examData.completedAt, timeTaken: timeDifference[0].differenceInSeconds,
      remarks: examData.remarks || ""
    })
  } catch (error) {
    return res.status(500).send({ success: false, message: "Internal server error" })
  }
}



export const getDailyStreaks = async (req, res) => {
  try {
    const result = await ExamModel.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$startedAt"
            }
          },
          totalScore: { $sum: "$score" },
          totalNumberOfQuestions: { $sum: "$totalQuestions" }
        }
      },
      {
        $project: { _id: 0, date: "$_id", totalScore: 1, totalNumberOfQuestions: 1 }
      },
      { $sort: { date: -1 } }
    ])


    const actualDateData = fillLastSevenDays(result)

    return res.status(200).json(actualDateData)
  } catch (error) {
    console.log(error)
    return res.status(500).send({ message: "Internal Server Error" })
  }
}



export const getUserReportGroupByTopic = async (req, res) => {
  try {
    const result = await ExamModel.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: "$topic",
          totalScore: {
            $sum: "$score"
          },
          totalNumberOfQuestions: {
            $sum: "$totalQuestions"
          },
          subject: {
            $first: "$subject"
          },
          board: {
            $first: "$board"
          }
        }
      },
      {
        $project: {
          _id: 0,
          topic: "$_id",
          subject: 1,
          board: 1,
          totalScore: 1,
          totalNumberOfQuestions: 1,
          accuracy: {
            $cond: [
              { $eq: ["$totalQuestions", 0] },
              0,
              {
                $multiply: [
                  {
                    $divide: [
                      "$totalScore",
                      "$totalNumberOfQuestions"
                    ]
                  },
                  100
                ]
              }
            ]
          }
        },
      },
      {
        $sort: {
          topic: -1 // Highest scoring topics first
        }
      }
    ])

    return res.status(200).json(result)
  } catch (error) {
    console.log(error)
    return res.status(500).send({ message: "Internal Server Error." })
  }
}



export const findExamsByFiltering = async (req, res) => {
  try {
    const userId = req.user._id

    let startDate = req.query.startDate.split('T')[0]
    let endDate = new Date(req.query.endDate)
    // Adding 1 day because day is index of days array (means [0, 1, 2, ..., 30]), so day starts from zero.
    endDate = endDate.setDate(endDate.getDate() + 1)

    const examDetails = await ExamModel.find({ userId, startedAt: { $gte: new Date(startDate), $lte: new Date(endDate) } }).select({
      isCompleted: 1, totalQuestions: 1,
      board: 1, subject: 1, topic: 1, score: 1
    })

    return res.status(200).json({ success: true, examDetails })
  } catch (error) {
    console.log(error)
    return res.status(500).send({ message: "Something went wrong." })
  }
}



export const reviewExamAnswersTest = async (req, res) => {
  try {
    const examDetails = await ExamModel.findById(req.query.examId)

    let user = await UserModel.findById(req.query.userId).select('bookmarks')

    // Check if the user who has given the exam or not
    if (examDetails.userId != req.query.userId) {
      return res.status(401).send({ success: false, message: "Unauthorized access" })
    }

    // Check if exam has completed
    if (examDetails.isCompleted == false) {
      return res.status(200).json({ success: false, message: "Exam is progressing smoothly and has not completed yet.", isCompleted: false })
    }

    // Conerting object into array for convenience
    let userQuestionsAnswers = Object.entries(examDetails.answers)


    let correctionAnswer = await Promise.all(userQuestionsAnswers.map(async (curElem, index, arr) => {
      // Find the current question using question id
      let actualQuestionData = await QuestionModel.findById(curElem[0])
        .select({ _id: 1, question: 1, options: 1, answer: 1, explaination: 1 }).lean()         // Here lean is used to remove unnecessary information and stats of internal operations behind the scene that MongoDB did itself

      return { ...actualQuestionData, userAnswered: curElem[1] ? curElem[1] : null, isUserAnsweredCorrect: curElem[1] ? actualQuestionData.answer == curElem[1] : null, bookmarked: user.bookmarks.includes(actualQuestionData._id) }
    }))

    return res.status(200).json({ correctionAnswer })
  } catch (error) {
    console.log(error)
    return res.status(500).send(error)
  }
}


export const askDoubtAboutAQuestionToAI = async (req, res) => {
  let systemPrompt = `
  Act as an expert coding tutor, and help me understand the question which I have given wrong answer. 
  Also, I have some doubt regarding this question. I can ask you few questions if needed about the question to clear my doubt.
  Programming language, subject and topic will also be mentioned. Answer in English only.
  `


  const { questionId, examId } = req.body
  if (!questionId || !examId) {
      return res.status(401).send({ success: false, message: "Question ID or exam ID doesn't exist" })
    }

    const examData = await ExamModel.findById(examId)
    if (examData.userId != req.user._id) {
      return res.status(401).send({ success: false, message: "The exam does not belong to this user." })
    }
    
    if (!examData.answers[questionId]) {
      return res.status(401).send({ success: false, message: "The question does not belong to this exam." })
    }
    
    const questionData = await QuestionModel.findById(questionId)
    if (questionData.answer == examData.answers[questionId]) {
      return res.status(403).send({ success: false, message: "You have answered it correct. So, you don't need to clear doubt for the question." })
    }
    
    let userPrompt = `I am preparing for ${examData.board} - ${examData.subject}. I am currently studying this topic - ${examData.topic}.
    Recently I have joined a quiz and I made a mistake for this question - ${questionData.question}. I am answered ${examData.answers[questionId]} instead of ${questionData.answer}.
    Explain me how is this answer wrong and guide me for further preparation.`
    
    
    if (req.body.message.length == 0) {
      userPrompt += "\n"
      userPrompt += req.body.message
    }
    
    try {
      const result = await openrouter.chat.send({
        chatRequest: {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          model: "nvidia/nemotron-3.5-super-vl:free",
          stream: false,
        },
      })

      return res.status(200).send({ success: true, message: result.choices[0].message.content.trim(), via: "OpenRouter Nemotron" })
    } catch (error) {

      // If OpenRouter requests fail because of invalid API key, syntax error due to modifying rules of SDK, daily limit exhausted or any other reasons then automatically switch to NVIDIA free API with fetch request.
      if (error.statusCode <= 429 && error.statusCode >= 400) {
        try {
          console.log("Switching to Nvidia ", systemPrompt, userPrompt)
          const nvidiaResult = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST", 
            headers: {
              'Content-Type': "application/json",
              'Accept': "application/json",
              'Authorization': `Bearer ${process.env.NVDIA_API_KEY}`
            },
            body: JSON.stringify({
              "model": "nvidia/nemotron-3.5-bolt-e4b",
              "messages": [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              "temperature": 1,
              "top_p": 0.95,
              "max_tokens": 1024,
              "seed": 42,
              "stream": false,
              "parallel_tool_calls": true
            })
          })
          
          let nvidiaData = await nvidiaResult.json()
          return res.status(200).send({ success: true, message: nvidiaData.choices[0].message.content.trim(), via: "Nvidia Nemotron" })
        } catch (error) {
          console.log(error)
          return res.status(500).send({ success: false, message: error.statusCode == 429 ? "Try again tomorrow." : "Internal server error.", via: "Nvidia Nemotron" })
        }
      }
    return res.status(500).send({ success: false, message: error.statusCode == 429 ? "Try again tomorrow." : "Internal server error.", via: "OpenRouter Nemotron" })
  }
}