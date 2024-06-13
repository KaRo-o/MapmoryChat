import "./App.css";
import { Route, Routes } from "react-router-dom";
import Chat from "./chat/Chat";
import ChatList from "./chat/ChatList";

// const path = require("path");
// const express = require("express");
// const app = express();

// app.use(express.static(path.join(__dirname, "build")));

function App() {
  return (
    <div>
      <Routes>
        <Route path="/chatting/chatlist" element={<ChatList />} />
        <Route path="/chatting/chatroom/:chat_room_id" element={<Chat />} />
        <Route path="chatting/chatlist" element={<ChatList />} />
        <Route path="chatting/chatroom/:chat_room_id" element={<Chat />} />
        <Route path="/chatlist" element={<ChatList />} />
        <Route path="/chatroom/:chat_room_id" element={<Chat />} />
        <Route path="chatlist" element={<ChatList />} />
        <Route path="chatroom/:chat_room_id" element={<Chat />} />
      </Routes>
      <a href="/chatting/chatList">chatList</a>
    </div>
  );
}

export default App;
