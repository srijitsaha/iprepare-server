import fs from 'node:fs/promises'
import { QuestionModel } from '../models/question.models.js';
import mongoose from 'mongoose';

await mongoose.connect("mongodb://localhost:27017/iPrepare")

let dirPath = "data/questions/programming/languages/HTML/Core Concepts/"

let topics = await fs.readdir(dirPath)

let numberOfError = 0

topics.forEach(async fileName => {
    let questionsFileData = JSON.parse(await fs.readFile(`${dirPath}${fileName}`, { encoding: 'utf-8' }))
    // console.log(questionsFileData)
    let questionIdArr = await Promise.all(questionsFileData.map(async (curElem) => {
        try {
            let question = await QuestionModel.create({
                question: curElem.question, options: curElem.options, answer: curElem.correct, explaination: curElem.explaination,
                board: "HTML", subject: "Core Concepts", topic: fileName.replace(".json", "")
            })
            
            return question._id
        } catch (error) {
            numberOfError += 1
            return error
        }
        
    }))
    console.log(questionIdArr)
});


console.log(numberOfError)
console.log("End")