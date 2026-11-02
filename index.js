import mongoose from 'mongoose';
import { Server } from 'socket.io';
import http from 'node:http';
import jsonwebtoken from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { ChallengeModel } from "./models/challenge.models.js";
import { UserModel } from './models/user.models.js';
import app from './app.js';


await mongoose.connect(process.env.MONGODB_URI)


const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', credentials: true }
})



io.use((socket, next) => {
  cookieParser()(socket.request, {}, (err) => {
    if (err) return next(err)

    // verify token (e.g. jwt.verify(token, ...)) and attach user info
    const iprepare_access_token = jsonwebtoken.verify(socket.request.cookies.iprepare_access_token, process.env.JWT_SECRET_KEY)

    if (!iprepare_access_token) {
      return next(new Error('Authentication error'))
    }

    socket.user = { userId: iprepare_access_token._id }  // replace with decoded user data
    next()
  })
})



let socketIdMap = new Map()
let userIdMap = new Map()


io.on('connection', (socket) => {
  socketIdMap.set(socket.user.userId, socket.id)
  userIdMap.set(socket.id, socket.user.userId)


  console.log('Client connected:', socket.id)

  socket.on('accept-challenge', async (data) => {

    const result = await ChallengeModel.findByIdAndUpdate(data.challengeId, { $push: { userId: userIdMap.get(socket.id) } }, { returnDocument: 'after' })
    const { firstName, lastName } = await UserModel.findById(userIdMap.get(socket.id))

    // console.log(userIdMap.get(socket.id), result)
    io.to(socketIdMap.get(result.host)).emit('challenge-accepted', { firstName, lastName })
  })


  socket.on('start-challenge', async (data) => {
    const challengeData = await ChallengeModel.findById(data.challengeId);
    if (challengeData.host == socket.user.userId) {
      io.to(socketIdMap.get(challengeData.userId[1])).emit('challenge-start', { data: "REFRESH_PAGE" });
    };
  });


  socket.on('send-answer', async (data) => {
    const challengeData = await ChallengeModel.findById(data.challengeId).select({ userId: 1 });
    let userIdArr = challengeData.userId.filter(curElem => curElem != socket.user.userId).map(user => socketIdMap.get(user));

    // console.log(data)

    io.to(userIdArr[0]).emit('receive-answer', data);
  });


  socket.on('complete-challenge', async (data) => {
    // Finding user id from challenge id
    const challengeData = await ChallengeModel.findById(data.challengeId).select('userId')
    if(!challengeData.userId.includes(socket.user.userId)) {
      return io.to(socket.id).emit('error' , {
        message: "Unauthorized access."
      })
    }

    // Finding opponent id that belongs to the challenge 
    let opponentId = challengeData.userId[0] == socket.user.userId ? challengeData.userId[1]: challengeData.userId[0]

    // Get the corresponding socket id from opponent id
    let opponentSocketId = socketIdMap.get(opponentId)

    // Send opponent saying that the challenge has been completed
    io.to(opponentSocketId).emit('challenge-completed', { ...data })
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    socketIdMap.delete(socket.user.userId);
    userIdMap.delete(socket.id);
  });
});

const PORT = process.env.PORT || 80;


server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});