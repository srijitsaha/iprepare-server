import { ExamModel } from "../models/exam.models.js"
import { StreaksModel } from "../models/streaks.models.js"


export const addStreaks = async (req, res) => {
    try {
        const data = await StreaksModel.findOne({ userId: req.user._id })
    } catch (error) {
        return res.status(500).send({ message: "Internal Server Error" })
    }
}


export const getStreaksInfo = async (req, res) => {
    try {
        // const userId = req.query._id              // Test mode
        const userId = req.user._id                // With user authentication

        const streak = await ExamModel.aggregate([
            { $match: { userId, isCompleted: true, completedAt: { $exists: true, $ne: null } } },
            { $project: { day: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt", timezone: "Asia/Kolkata" } } } },
            { $group: { _id: "$day" } },
            { $sort: { _id: -1 } }
        ])

        // Generate last 7 days
        const last7Days = []
        const today = new Date()

        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);

            const day = d.toLocaleDateString("en-CA", {
                timeZone: "Asia/Kolkata"
              });
            last7Days.push(
                day
            )
        }

        const completedDays = new Set(streak.map(d => d._id));

        const result = last7Days.reverse().map(day => ({
            date: day,
            completed: completedDays.has(day)
        }));

        return res.status(200).send(result)
    } catch (error) {
        return res.status(500).send({ message: "Internal Server Error" })
    }
}


