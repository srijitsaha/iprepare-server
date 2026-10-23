import express from "express"
import cors from "cors"
import path from 'path'
import userRouter from "./routes/user.routes.js"
import mongoose from "mongoose"
import cookieParser from "cookie-parser"
import questionRouter from "./routes/question.routes.js"
import examRouter from "./routes/exam.routes.js"
import challengeRouter from "./routes/challenges.routes.js"

const app = express()
// await mongoose.connect(process.env.MONGODB_URI)


// Middlewares
// app.use(cors({
//     origin: ["http://localhost:5173"], 
//     credentials: true
// }))


app.use(cookieParser())
app.use(express.json())

app.use(express.static(path.join(import.meta.dirname, "static")))

app.get('/', (req, res) => res.sendFile(path.join(import.meta.dirname, "static", "index.html")))

app.get('/api/v1//health', (req, res) => res.status(200).json({ success: true, status: 'ok', timestamps: new Date().toISOString() }))

app.use("/api/v1/user", userRouter)
app.use("/api/v1/question", questionRouter)
app.use("/api/v1/exam", examRouter)
app.use("/api/v1/challenges", challengeRouter)


app.get(/.*/, (req, res) => {
    return res.sendFile(path.join(import.meta.dirname, 'static', "index.html"))
})

export default app

// app.listen(4000, () => console.log(`Server is listening at PORT 4000`))