import mongoose from "mongoose"
import { UserModel } from "../models/user.models.js"
await mongoose.connect("mongodb://localhost:27017/iPrepare")

const bookmarkedQuestions = await UserModel.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId("6a4b3617cdfebe81c8ee94e3")
      }
    },
    {
      $set: {
        bookmarkObjectIds: {
          $map: {
            input: "$bookmarks",
            as: "bookmark",
            in: {
              $toObjectId: "$$bookmark"
            }
          }
        }
      }
    },
    {
      $lookup: {
        from: "questions",
        localField: "bookmarkObjectIds",
        foreignField: "_id",
        as: "bookmarkedQuestions"
      }
    },
    { $project: {  _id: 0,  bookmarkedQuestions: 1  } }
])

console.log(bookmarkedQuestions[0].bookmarkedQuestions)