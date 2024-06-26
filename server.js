const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const { default: axios } = require("axios");
const path = require("path");
const { io } = require("socket.io-client");

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
      "http://mapmory.co.kr",
      "https://mapmory.co.kr",
      "http://www.uaena.shop",
      "https://www.uaena.shop",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// const socket = io("https://www.uaena.shop");
const socket = io("https://mapmory.co.kr");
// const socket = io("http://192.168.0.45:3001");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "build")));

(async () => {
  try {
    const response = await axios.get(
      // "http://192.168.0.45:8000/chat/rest/json/getMongo"
      // "https://www.uaena.shop/chat/rest/json/getMongo"
      "https:mapmory.co.kr/chat/rest/json/getMongo"
    );
    console.log(
      "=======================================================",
      response.data
    );
    await mongoose.connect(response.data);
    console.log("MongoDB connected...");
  } catch (err) {
    console.error("MongoDB connection error: ", err);
  }
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
  imageUrl: String,
  timestamp: { type: Date, default: timeKR },
  readBy: [String],
});

const chatSchema = new mongoose.Schema(
  {
    participants: [String],
    lastMessage: {
      text: String,
      timestamp: Date,
    },
    unreadCount: {
      type: Object,
      of: Number,
    },
  },
  { strict: false }
);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);
const Message = mongoose.model("Message", messageSchema);
const Chat = mongoose.model("Chat", chatSchema);

ioo.on("connection", (socket) => {
  console.log("connected");

  //채팅방 만들기
  socket.on("make room", async (roomData, callback) => {
    roomData.lastMessage = { text: null, timestamp: null };
    const newRoom = new Chat(roomData);
    try {
      console.log("make room try");
      const result = await newRoom.save();
      console.log(result.id);
      callback(result.id);
    } catch (error) {
      console.error(error);
    }
  });

  //채팅방 입장
  socket.on("joinChat", async (res) => {
    const { room, userId } = res;
    socket.join(room);
    console.log(`joined room: ${room},${userId}`);

    try {
      const count = await countUnreadMessages(userId, room);
      console.log("unreadcount", count);
      const readCount = await Chat.updateOne(
        { _id: room },
        { $set: { [`unreadCount.${userId}`]: count } }
      );
      console.log(readCount);
      socket.emit("is read", { room, userId });
      const messages = await Message.find({ chatId: room });
      socket.emit("previousMessages", messages);
    } catch (error) {
      console.error(error);
    }
  });

  //사용자가 채팅방에 접속해 있을경우 현재 존재하는 채팅들의 읽은사람 리스트에서 사용자를 추가
  socket.on("is read", async (res) => {
    const { room, user } = res;
    try {
      await Message.updateMany(
        { chatId: room, readBy: { $ne: user } },
        { $addToSet: { readBy: user } }
      );
    } catch (error) {
      console.error(error);
    }
  });

  // 채팅 메시지 저장
  socket.on("chat message", async (msg) => {
    const message = new Message(msg);
    try {
      await message.save().then(async (res) => {
        const lastMessage = await Chat.findById(res.chatId).exec();
        let text;
        if (res.text !== null) {
          text = res.text;
        } else if (res.imageUrl !== null) {
          text = "이미지";
        }
        lastMessage.lastMessage = { text, timestamp: res.timestamp };
        await lastMessage.save();
        ioo.emit("chat message", res); // 메시지 이벤트 트리거
        ioo.emit("get chat list", res.senderId); // 전체 채팅 리스트 갱신
        ioo.emit("getAllUnreadCount");
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
    console.log("user disconnected");
  });
});

//서버 정상적으로 작동했는지 로그 확인할것
server.listen(3001, () => {
  console.log("listening on *:3001");
});

//채팅방 있는지 조회 후 없으면 채팅방 생성
app.post("/chatting/findOneChatRoom", async (req, res) => {
  const { userId, opponent, nickname, profileImageName } = req.body;
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

    if (chatRoom[0] === undefined) {
      console.log("채팅방 없음");
      try {
        console.log("makeroom emit");

        socket.emit(
          "make room",
          { participants: [userId, opponent] },
          (result) => {
            let queryParam = result + "/" + nickname + "/" + profileImageName;
            console.log("result: ", queryParam);
            res.json(queryParam);
          }
        );
      } catch (error) {
        console.error(error);
      }
    } else {
      console.log("채팅방 존재");
      let queryParam = chatRoom[0] + "/" + nickname + "/" + profileImageName;
      res.json(queryParam);
    }
  } catch (error) {
    console.error(error);
  }
});

//채팅방 만들기 (채팅방 존재여부 확인하면서 한번에 처리)
app.post("/chatting/makeChatRoom", async (req, res) => {
  const { userId, opponent } = req.body;
  try {
    const result = socket.emit("make room", {
      participants: [userId, opponent],
    });
    return result;
  } catch (error) {
    console.error(error);
  }
});

//현재 로그인한 유저의 채팅방 리스트 조회
app.post("/chatting/chatRoomList", async (req, res) => {
  const { userId } = req.body;
  try {
    // 채팅방을 마지막 메시지의 타임스탬프를 기준으로 내림차순 정렬하여 가져옴
    const chatRoomList = await Chat.find({ participants: userId }).sort({
      "lastMessage.timestamp": -1,
    });

    const result = await Promise.all(
      chatRoomList.map(async (chat) => {
        // 안읽은 메시지 개수 설정
        const count = await countUnreadMessages(userId, chat._id);
        const filter = chat.participants.filter(
          (participant) => participant !== userId
        );
        return {
          ...chat.toObject(),
          participants: filter,
          unreadCount: { [userId]: count },
        };
      })
    );
    res.json(result);
  } catch (error) {
    console.error(error);
  }
});

//특정채팅방 메시지 조회
app.post("/chatting/getAllMessages", async (req, res) => {
  const { chat_room_id } = req.body;
  try {
    const messages = await Message.find({ chatId: chat_room_id });
    res.json(messages);
  } catch (error) {
    console.error(error);
  }
});

// build index get
app.get("/chatting", (req, res) => {
  console.log(res.sendFile(path.join(__dirname, "build", "index.html")));
});

// 안읽은 메시지 개수세기
async function countUnreadMessages(userId, chatId) {
  try {
    const unreadMessagesCount = await Message.countDocuments({
      chatId: chatId,
      readBy: { $ne: userId },
    });

    return unreadMessagesCount;
  } catch (error) {
    console.error("Error counting unread messages:", error);
    throw error;
  }
}

// 상대방 아이디 설정용
app.post("/chatting/getOpponent", async (req, res) => {
  const { chat_room_id, userId } = req.body;
  const chat = await Chat.findById(chat_room_id);

  const opponentId = chat.participants.find(
    (participant) => participant !== userId
  );

  res.json(opponentId);
});

app.post("/chatting/removeChatRoom", async (req, res) => {
  try {
    const { chat_room_id } = req.body;
    await Chat.deleteOne({ _id: chat_room_id });
    await Message.deleteMany({ chatId: chat_room_id });

    res
      .status(200)
      .json({ success: true, message: "Chat room deleted successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete chat room" });
  }
});

//읽지않은 메시지의 전체개수 세기 (floating button에 추가해줄 기능)
async function countAllUnreadMessages(userId) {
  try {
    const allUnreadMessageCount = await Message.countDocuments({
      readBy: { $ne: userId },
    });

    return allUnreadMessageCount;
  } catch (error) {
    console.error(error);
  }
}

app.post("/chatting/countAllUnreadMessges", async (req, res) => {
  const { userId } = req.body;
  const result = await countAllUnreadMessages(userId);
  console.log(result);
  res.json(result);
});
