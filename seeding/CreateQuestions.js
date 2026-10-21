import fs from 'node:fs/promises'
import { QuestionModel } from "../models/question.models.js"
import mongoose from "mongoose"

await mongoose.connect("mongodb://localhost:27017/iPrepare")


let topicName = "Drawing based inbuilt module - Turtle"

let Questions = JSON.parse(await fs.readFile(`data/questions/programming/languages/Python/Modules/${topicName}.json`, { encoding: 'utf-8' }))

let numbersOfQuestionsInsertedIntoDB = 0

for (let i = 0; i < Questions.length; i++) {
    let curElem = Questions[i]
    try {
        const newQuestions = await QuestionModel.create({
            question: curElem.question.replace(/^[0-9]+\.?\s*/, ""), options: curElem.options, answer: curElem.correct, explaination: curElem.explaination,
            board: "Python", subject: "Core Concepts", topic: topicName
        })
        numbersOfQuestionsInsertedIntoDB++
        console.log(newQuestions)
    } catch (error) {
        console.log(error)
        continue
    }
}

console.log(`${numbersOfQuestionsInsertedIntoDB} / ${Questions.length}`)

// D:\Web Development NodeJS\IPrepare\server\data\questions\programming/languages/Python/Modules/

