const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const { default: axios } = require("axios");
const { io } = require("socket.io-client");
const { useNavigate } = require("react-router-dom");

const app = express();
const server = http.createServer(app);
const ioo = new Server(server, {
  cors: {
    origin: [
      "http://192.168.0.45:3000",
      "http://localhost:3000",
      "http://192.168.0.45:8000",
      "http://localhost:8000",
      "http://192.168.0.24:3000",
      "http://192.168.0.24:8000",
      "http:mapmory.co.kr",
      "https:mapmory.co.kr",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// const socket = io("http://192.168.0.45:3001");
const socket = io("https://mapmory.co.kr");

// CORS 미들웨어 설정
app.use(cors());
app.use(express.json()); // JSON 바디 파싱

app.use(express.static("public"));

(function async() {
  // axios.get("http://192.168.0.45:8000/chat/json/getMongo").then((res) => {
  axios.get("https://mapmory.co.kr/chat/json/getMongo").then((res) => {
    console.log(res.data);
    // MongoDB 연결 설정
    mongoose
      .connect(res.data, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
      .then(() => {
        console.log("MongoDB connected...");
      })
      .catch((err) => {
        console.error("MongoDB connection error: ", err);
      });
  });
})();

const timeKR = () => {
  const now = new Date();
  now.setHours(now.getHours() + 9);
  return now;
};

const messageSchema = new mongoose.Schema({
  chatId: String,
  senderId: String,
  text: String,
  imageUrl: String, // 이미지 메시지의 URL (이미지 메시지인 경우)
  timestamp: { type: Date, default: timeKR },
  readBy: [String], // 읽은 사용자 아이디
});

const chatSchema = new mongoose.Schema({
  participants: [String],
  lastMessage: {
    text: String,
    timestamp: Date,
  },
  unreadCount: {
    type: Map,
    of: Number, // 각 사용자별 읽지 않은 메시지 수
  },
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);
const Message = mongoose.model("Message", messageSchema);
const Chat = mongoose.model("Chat", chatSchema);

//socket.io-client
ioo.on("connection", (socket) => {
  // console.log("connected");

  //채팅방 만들기
  socket.on("make room", async (roomData) => {
    roomData.lastMessage = { text: null, timestamp: null };
    const newRoom = new Chat(roomData);
    try {
      console.log("make room try");
      await newRoom.save();
    } catch (error) {
      console.error(error);
    }
  });

  //채팅방 입장
  socket.on("joinChat", async (res) => {
    // console.log("join", res);
    const { room, user } = res;
    socket.join(room);
    console.log(`joined room: ${room},${user}`);

    try {
      socket.emit("is read", { room, user });
      const messages = await Message.find({ chat_room_id: room });
      socket.emit("previousMessages", messages);
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("is read", async (res) => {
    const { room, user } = res;
    console.log("back is read", res);
    try {
      const isRead = await Message.updateMany(
        { chatId: room, readBy: { $ne: user } }, // 필터에 readBy 조건 추가
        { $addToSet: { readBy: user } }
      );
    } catch (error) {
      console.error(error);
    }
  });

  // 채팅 메시지 저장
  socket.on("chat message", async (msg) => {
    const message = new Message(msg);
    // console.log(msg);
    try {
      await message.save().then(async (res) => {
        ioo.emit("chat message", res);
        // console.log(res);
        const lastMessage = await Chat.findById(res.chatId).exec();
        // console.log(lastMessage);
        let text;
        if (res.text !== null) {
          text = res.text;
        } else if (res.imageUrl !== null) {
          text = "이미지";
        }
        lastMessage.lastMessage = { text: text, timestamp: res.timestamp };
        await lastMessage.save();
        ioo.emit("get chat list", res.senderId);
      });
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("leaveRoom", (room) => {
    socket.leave(room);
    console.log(`User left room: ${room}`);
  });

  socket.on("disconnect", () => {
    // console.log("user disconnected");
  });
});

//서버 정상적으로 작동했는지 로그 확인할것
server.listen(3001, () => {
  console.log("listening on *:3001");
});

//채팅방 있는지 조회 후 없으면 채팅방 생성
app.post("/chat/findOneChatRoom", async (req, res) => {
  const { userId, opponent } = req.body;
  console.log(userId, " : ", opponent);
  try {
    const userChatRoom = await Chat.find({ participants: userId }).distinct(
      "_id"
    );
    const opponentChatRoom = await Chat.find({
      participants: opponent,
    }).distinct("_id");
    console.log(userChatRoom, " : ", opponentChatRoom);

    const userChatRoomStrings = userChatRoom.map((id) => id.toString());
    const opponentChatRoomStrings = opponentChatRoom.map((id) => id.toString());
    console.log(userChatRoomStrings, " : ", opponentChatRoomStrings);

    const chatRoom = userChatRoomStrings.filter((room) =>
      opponentChatRoomStrings.includes(room)
    );
    console.log("chatRoom : ", chatRoom);
    res.json(chatRoom[0]);
    if (chatRoom[0] === undefined) {
      console.log("채팅방 없음");
      try {
        socket.emit("make room", {
          participants: [userId, opponent],
        });
      } catch (error) {
        console.error(error);
      }
    } else {
      console.log("채팅방 존재");
    }
  } catch (error) {
    console.error(error);
  }
});

//채팅방 만들기 (채팅방 존재여부 확인하면서 한번에 처리)
app.post("/chat/makeChatRoom", async (req, res) => {
  const { userId, opponent } = req.body;
  try {
    socket.emit("make room", {
      participants: [userId, opponent],
    });
  } catch (error) {
    console.error(error);
  }
});

//현재 로그인한 유저의 채팅방 리스트 조회
app.post("/chat/chatRoomList", async (req, res) => {
  const { userId } = req.body;
  try {
    const chatRoomList = await Chat.find({ participants: userId });
    // console.log(userId, "의 채팅방 목록", chatRoomList);

    const result = chatRoomList.map((chat) => {
      const filter = chat.participants.filter(
        (participants) => participants !== userId
      );
      return {
        ...chat.toObject(),
        participants: filter,
      };
    });
    // console.log(userId, "의 채팅방 목록중 상대만 아이디만 포함 : ", result);

    res.json(result);
  } catch (error) {
    console.error(error);
  }
});

//특정채팅방 메시지 조회
app.post("/chat/getAllMessages", async (req, res) => {
  const { chat_room_id } = req.body;
  try {
    const messages = await Message.find({ chatId: chat_room_id });
    res.json(messages);
  } catch (error) {
    console.error(error);
  }
});
