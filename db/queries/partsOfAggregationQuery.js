export const queryForJoinChallengesWithUsers = {
  $lookup: {
    from: "users",
    let: { local_string_array_users: "$userId" }, // 1. Pass the array of strings as a variable
    pipeline: [
      {
        $match: {
          $expr: {
            // 2. Check if the foreign ObjectId ($_id) exists inside our converted array
            $in: [
              "$_id",
              {
                // 3. Map over the string array and cast every item to an ObjectId
                $map: { input: "$$local_string_array_users", as: "str", in: { $toObjectId: "$$str" } }
              }
            ]
          }
        }
      },
      // Step 2: Select only the fields you want to keep
      { // Set to 0 if you want to exclude the _id, or 1 to keep it
        $project: { _id: 0, firstName: 1, lastName: 1 }
      }
    ],
    as: "userDetails"
  }
}


export const queryForJoinChallengesWithExams = {
  $lookup: {
    from: "exams",
    let: { local_string_array_exams: "$examId" }, // 1. Pass the array of strings as a variable
    pipeline: [
      {
        $match: {
          $expr: {
            // 2. Check if the foreign ObjectId ($_id) exists inside our converted array
            $in: [
              "$_id",
              {
                // 3. Map over the string array and cast every item to an ObjectId
                $map: { input: "$$local_string_array_exams", as: "str", in: { $toObjectId: "$$str" } }
              }
            ]
          }
        }
      },
      // Step 2: Select only the fields you want to keep
      {  // Set to 0 if you want to exclude the _id, or 1 to keep it
        $project: {
          _id: 0, score: 1, startedAt: 1, completedAt: 1
        }
      }
    ],
    as: "examDetails"
  }
}