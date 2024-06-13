import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

// const socket = io("http://192.168.0.45:3001"); // 서버 주소 확인
const socket = io("https://mapmory.co.kr"); // 서버 주소 확인

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
      const response = await axios.get(
        // "http://192.168.0.45:8000/chat/json/getUser",
        "https://mapmory.co.kr/chat/json/getUser",
        {
          withCredentials: true,
        }
      );
      console.log("getUser", response.data);
      setUserId(response.data);
      return response.data;
    } catch (error) {
      console.error(error);
    }
  };

  //어떤 방법으로든 화면이 꺼지면 채팅방 퇴장
  window.onbeforeunload = () => {
    socket.emit("leaveRoom", chat_room_id);
  };

  useEffect(() => {
    axiosGetUser().then((res) => {
      const user = res;
      console.log("getUser", res);
      socket.emit("joinChat", { room, user });
    });

    socket.on("chat message", (msg) => {
      // const user = userId;
      // console.log("chat mes", user);
      // socket.emit("is read", { room, user });
      console.log("chat message");
      setMessages((prevMessages) => [...prevMessages, msg]);
    });
    socket.on("previousMessages", (msgs) => {
      console.log("prev message");
      setMessages((prevMessages) => [...msgs, ...prevMessages]);
    });
  }, []);

  useEffect(() => {
    getAllMessages();
  }, [room]);

  // 현재 채팅방의 모든 메시지 가져오기
  const getAllMessages = async () => {
    try {
      const response = await axios.post(
        // "http://192.168.0.45:3001/mongo/getAllMessages",
        "https://mapmory.co.kr/chatting/getAllMessages",
        {
          chat_room_id: chat_room_id,
        }
      );
      console.log("getAll", response.data);
      setMessages(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  //채팅 전송
  const sendMessage = () => {
    if (input || userId === "") {
      socket.emit("chat message", {
        chatId: chat_room_id,
        senderId: userId,
        text: input,
        imageUrl: null,
        readBy: [],
      });
      setInput("");
    } else {
      alert("다시 로그인 해주세요");
    }
  };

  //타임스탬프 parse
  const parseTimeStamp = (timestamp) => {
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

  //이미지 업로드
  const axiosImageUpload = async () => {
    const formData = new FormData();

    imageList.forEach((image) => {
      console.log(image);
      formData.append("files", image);
    });

    formData.append("chatId", chat_room_id);

    const config = {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      withCredentials: true,
    };

    try {
      const response = await axios
        .post(
          // "http://192.168.0.45:8000/chat/json/addChatImage",
          "https://mapmory.co.kr/chat/json/addChatImage",
          formData,
          config
        )
        .then((res) => {
          console.log(res.data);
          res.data.forEach((imageurl) => {
            console.log("imageUrl :", imageurl);
            socket.emit("chat message", {
              chatId: chat_room_id,
              senderId: userId,
              imageUrl: imageurl,
              text: null,
              readBy: [],
            });
          });
        });
    } catch (error) {
      console.error(error);
    }
  };

  //메시지 읽음 여부
  useEffect(() => {
    const user = userId;
    socket.emit("is read", { room, user });
  }, [messages]);

  socket.on("is read", async (res) => {
    const { room, user } = res;
    console.log("front is read :", res);
    socket.emit("is read", { room, user });
  });
  return (
    <div>
      <ul>
        {messages.map((res, index) => (
          <li key={index}>
            {res.senderId}:{res.text}
            <img alt="" src={`${res.imageUrl}`}></img>...
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
      <button onClick={axiosImageUpload}>이미지 전송</button>
    </div>
  );
};

export default Chat;
