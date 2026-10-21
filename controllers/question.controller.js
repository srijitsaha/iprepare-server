import { ExamModel } from "../models/exam.models.js"
import { QuestionModel } from "../models/question.models.js"
import { shuffleArray } from "../utilities/shuffleArray.js"

export const getQuestions = async (req, res) => {
  try {
    const examData = await ExamModel.findById(req.body.examId)

    // Check that particular exam was attended by the creator
    if (examData.userId != req.user._id) {
      return res.status(401).send({ message: "Unauthorized access.", success: false })
    }

    // Check that the exam was finished or not
    if (examData.isCompleted == true) {
      return res.status(403).send({ message: "Exam is already completed.", success: false })
    }

    // Check that the particular exam is already started.
    // If the exam started, then we do not need to create any questions again.
    if (examData.startedAt) {
      if (examData.currentQuestionIndex >= examData.questions.length) {
        return res.status(403).send({ message: "Exam is already completed.", success: false })
      }

      let questionId = examData.questions[examData.currentQuestionIndex]
      let questionData = await QuestionModel.findById(questionId)

      if (!questionData) {
        return res.status(404).send({ message: "Question not found.", success: false })
      }

      return res.status(201).json({
        _id: questionData._id, question: questionData.question, options: questionData.options,
        totalQuestions: examData.questions.length, currentQuestionIndex: examData.currentQuestionIndex,
        score: examData.score
      })
    }

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

    return res.status(201).json({
      _id: questionData[0]._id, question: questionData[0].question, options: questionData[0].options,
      totalQuestions: questionData.length, currentQuestionIndex: 0, score: 0
    })
  } catch (error) {
    console.log(error)
    return res.status(501).send({ message: "Something went wrong." })
  }
}




export const getQuestionsForChallenges = async (req, res) => {
  try {
    const examData = await ExamModel.findById(req.body.examId)

    // Check that particular exam was attended by the creator
    if (examData.userId != req.user._id) {
      return res.status(401).send({ message: "Unauthorized access.", success: false })
    }

    // Check that the exam was finished or not
    if (examData.isCompleted == true) {
      return res.status(403).send({ message: "Exam is already completed.", success: false })
    }

    // Check that the particular exam is already started.
    // If the exam started, then we do not need to create any questions again.
    if (examData.startedAt) {
      if (examData.currentQuestionIndex >= examData.questions.length) {
        return res.status(403).send({ message: "Exam is already completed.", success: false })
      }

      let questionId = examData.questions[examData.currentQuestionIndex]
      let questionData = await QuestionModel.findById(questionId)

      if (!questionData) {
        return res.status(404).send({ message: "Question not found.", success: false })
      }

      return res.status(201).json({
        _id: questionData._id, question: questionData.question, options: questionData.options,
        totalQuestions: examData.questions.length, currentQuestionIndex: examData.currentQuestionIndex,
        score: examData.score
      })
    }

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

    return res.status(201).json({
      _id: questionData[0]._id, question: questionData[0].question, options: questionData[0].options,
      totalQuestions: questionData.length, currentQuestionIndex: 0, score: 0
    })
  } catch (error) {
    console.log(error)
    return res.status(501).send({ message: "Something went wrong." })
  }
}




export const submitQuestionAnswer = async (req, res) => {
  try {
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




export const completeExam = async (req, res) => {
  try {
    const examData = await ExamModel.findById(req.body.examId)

    // Check that particular exam was attended by the user
    if (examData.userId != req.user._id) {
      return res.status(401).send({ message: "Unauthorized access.", success: false })
    }

    // Check that the exam was finished or not
    if (examData.isCompleted == true) {
      return res.status(403).send({ message: "Exam is already completed.", success: false })
    }

    // Update that exam has been completed into db
    const updatedExamData = await ExamModel.findByIdAndUpdate(req.body.examId, { $set: { isCompleted: true, completedAt: Date.now() } }, { returnDocument: 'after' })
    return res.status(201).json({
      isExamCompleted: updatedExamData.isCompleted,
      topic: updatedExamData.topic, board: updatedExamData.board, subject: updatedExamData.subject,
      success: true
    })
  } catch (error) {
    return res.send({ message: "Something went wrong.", success: false })
  }
}