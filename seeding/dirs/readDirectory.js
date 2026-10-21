import fs from 'node:fs/promises';
import path from 'node:path';
import { cwd } from 'node:process';
import { QuestionModel } from "../../models/question.models.js"
import mongoose from "mongoose"


await mongoose.connect("mongodb://localhost:27017/iPrepare")


const files = await fs.readdir("data/questions/programming/languages/CSS/Core Concepts")
console.log(files)

for (let i = 0; i < files.length; i++) {
    let filePath = path.join("data/questions/programming/languages/CSS/Core Concepts", files[i])
    let fileData = await fs.readFile(filePath, { encoding: "utf-8" })

    
    console.log(`--------   ${filePath.replace('.json', '')} ----------\n\n`)
    fileData = JSON.parse(fileData)
    
    let successful = 0
    let failed = 0
    let failedList = []
    let questionsNumber = 0

    for (let data of fileData) {
        try {
            let createdQuestion = await QuestionModel.create({ ...data, answer: data.correct, board: "CSS", subject: "Core Concepts", topic: files[i].replace('.json', '') })
            successful += 1
            questionsNumber += 1
        } catch (error) {
            failedList.push(questionsNumber)
            questionsNumber += 1
            failed += 1
            continue
        }
    }

    console.log(`Total = ${fileData.length}, ${successful} = successful, ${failed} = failed`)
    console.log("Failed : ", failedList)
}