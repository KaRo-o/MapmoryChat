import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

const socket = io("http://192.168.0.45:3001"); // 서버 주소 확인

const Chat = () => {
  const { chat_room_id } = useParams();
  const [userId, setUserId] = useState();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [room, setRoom] = useState(chat_room_id);
  const [imageList, setImageList] = useState([]);

  //유저 아이디 가져오기
  const axiosGetUser = async () => {
    try {
      await axios
        .get("http://192.168.0.45:8000/chat/json/getUser", {
          withCredentials: true,
        })
        .then((res) => {
          console.log("getUser");
          setUserId(res.data);
        });
    } catch (error) {
      console.error(error);
    }
  };

  //어떤 방법으로든 화면이 꺼지면 채팅방 퇴장
  window.onbeforeunload = () => {
    socket.emit("leaveRoom", chat_room_id);
  };

  useEffect(() => {
    axiosGetUser();
    socket.emit("joinChat", room);
    socket.on("chat message", (msg) => {
      console.log("chat message");
      setMessages((prevMessages) => [...prevMessages, msg]);
    });
    socket.on("previousMessages", (msgs) => {
      console.log("prev message");
      setMessages((prevMessages) => [...msgs, ...prevMessages]);
    });
  }, [room]);

  useEffect(() => {
    getAllMessages();
  }, [room]);

  // 현재 채팅방의 모든 메시지 가져오기
  const getAllMessages = async () => {
    try {
      await axios
        .post("http://192.168.0.45:3001/mongo/getAllMessages", {
          chat_room_id: chat_room_id,
        })
        .then((res) => {
          console.log("getAll");
          console.log(typeof res.data.timestamp);
          console.log(res.data);
          setMessages(res.data);
        });
    } catch (error) {
      console.error(error);
    }
    // getAllMessages();
  };

  //채팅 전송
  const sendMessage = () => {
    if (input || userId !== "") {
      socket.emit("chat message", {
        chatId: chat_room_id,
        senderId: userId,
        text: input,
      });
      setInput("");
    } else {
      alert("다시 로그인 해주세요");
    }
  };

  //타임스탬프 parse
  const parseTimeStamp = (timestamp) => {
    // console.log(typeof timestamp);
    const t = timestamp.indexOf("T");
    const dot = timestamp.lastIndexOf(":");
    const parseTime = timestamp.substring(t + 1, dot);
    let hr = parseTime.split(":")[0];
    let min = parseTime.split(":")[1];

    if (hr < 12) {
      if (hr < 1) {
        hr = 12;
      }
      return "오전" + hr + ":" + min;
    } else {
      if (hr > 12) {
        hr -= 12;
      }
      return "오후" + hr + ":" + min;
    }
  };

  //Enter 눌렀을때 채팅 전송
  const pressEnter = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  //이미지 인풋시 리스트에 추가
  const onChangeImageInput = (e) => {
    setImageList([...imageList, ...e.target.files]);
  };

  return (
    <div>
      <ul>
        {messages.map((res, index) => (
          <li key={index}>
            {res.senderId}:{res.text}...
            {parseTimeStamp(res.timestamp)}
          </li>
        ))}
      </ul>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={pressEnter}
      />
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={onChangeImageInput}
      />
    </div>
  );
};

export default Chat;
