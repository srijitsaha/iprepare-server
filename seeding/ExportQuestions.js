import fs from 'node:fs/promises'
import { QuestionModel } from "../models/question.models.js"
import mongoose from "mongoose"

await mongoose.connect("mongodb://localhost:27017/iPrepare")

const topics = [
    'Behaviour of Perfect Gas & Kinetic Theory',
    'Gravitation',
    'Kinematics',
    'Laws of Motion',
    'Motion of System of Particles & Rigid Body',
    'Oscillations & Waves',
    'Physical World & Measurement',
    'Properties of Bulk Matter',
    'Thermodynamics',
    'Work, Energy and Power'
]


const outputDir = "data/questions/WBCHSE/Class 11/Physics"
await fs.mkdir(outputDir, { recursive: true })

for (let i = 0; i < topics.length; i++) {
    const questions = await QuestionModel.find({ board: "WBCHSE Class 11", subject: "Physics", topic: topics[i] }).lean()
    const exportedQuestions = questions.map(({ question, options, answer, explaination }) => ({
        question,
        options,
        correct: answer,
        explaination
    }))
    await fs.writeFile(`${outputDir}/${topics[i]}.json`, JSON.stringify(exportedQuestions, null, 4))
    console.log(`File wrote successfully ${topics[i]}`)
}