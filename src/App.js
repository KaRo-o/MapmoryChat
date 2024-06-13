import "./App.css";
import { Route, Routes } from "react-router-dom";
import Chat from "./chat/Chat";
import ChatList from "./chat/ChatList";

function App() {
  return (
    <div>
      <Routes>
        <Route path="/chatting/chatlist" element={<ChatList />} />
        <Route path="/chatting/chatroom/:chat_room_id" element={<Chat />} />
      </Routes>
      <a href="/chatting/chatList">chatList</a>
    </div>
  );
}

export default App;
