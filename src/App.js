import "./App.css";
import { Route, Router, Routes } from "react-router-dom";
import Chat from "./chat/Chat";
import ChatList from "./chat/ChatList";

function App() {
  return (
    <div>
      <Routes>
        <Route path="/chatList" element={<ChatList />} />
        <Route path="/chat/:chat_room_id" element={<Chat />} />
      </Routes>
      <a href="/chatList">chatList</a>
    </div>
  );
}

export default App;
