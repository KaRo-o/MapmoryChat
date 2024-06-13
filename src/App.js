import "./App.css";
import { Route, Routes } from "react-router-dom";
import Chat from "./chat/Chat";
import ChatList from "./chat/ChatList";

function App() {
  return (
    <div>
      <Routes>
        <Route path="/chat/chatList" element={<ChatList />} />
        <Route path="/chat/chatroom/:chat_room_id" element={<Chat />} />
      </Routes>
      <a href="/chat/chatList">chatList</a>
    </div>
  );
}

export default App;
