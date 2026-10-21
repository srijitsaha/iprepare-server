db.exams.aggregate([
    { $match: { userId: "6a4b3617cdfebe81c8ee94e3" } },
    {
      $group: {
        _id: "$topic",
        totalScore: { $sum: "$score" }, 
        totalNumberOfQuestions: { $sum: "$totalQuestions" }, 
        subject: { $first: "$subject" },
        board: { $first: "$board" },
      }
    },
    {
      $project: {
        _id: 0,
        topic: "$_id",
        totalScore: 1,
        totalNumberOfQuestions: 1, 
        subject: 1,
        board: 1
      }
    },
    {
      $sort: {
        topic: -1 // Highest scoring topics first
      }
    }
]);




// Aggregate with group by topic and calculate the percentage of total score and total questions of a particular topic
db.exams.aggregate([
  {
    $match: {
      userId: "6a4b3617cdfebe81c8ee94e3"
    }
  },
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


db.exams.aggregate([
  {   $match: { userId, isCompleted: true, completedAt: { $exists: true, $ne: null }}   },

  // Convert completedAt into YYYY-MM-DD
  {
      $project: {
          day: {
              $dateToString: {  format: "%Y-%m-%d", date: "$completedAt" }
          }
      }
  },

  // Remove duplicate exams on the same day
  { $group: { _id: "$day" } },
  { $sort: {  _id: -1  } }
]);

// Generate last 7 days
const last7Days = [];
const today = new Date();

for (let i = 0; i < 7; i++) {
  const d = new Date(today);
  d.setDate(today.getDate() - i);

  last7Days.push(
      d.toISOString().split("T")[0]
  );
}

const completedDays = new Set(streak.map(d => d._id));

const result = last7Days.reverse().map(day => ({
  date: day,
  completed: completedDays.has(day)
}))