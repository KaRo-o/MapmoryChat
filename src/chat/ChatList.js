import axios from "axios";
import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

// const socket = io("http://192.168.0.45:3001"); // 서버 주소 확인
const socket = io("https://mapmory.co.kr"); // 서버 주소 확인

const ChatList = () => {
  const [list, setList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // const [userId, setUserId] = useState("");

  useEffect(() => {
    axiosGetUser();
  }, []);

  //채팅방 리스트 가져오기
  const axiosGetChatList = async (user) => {
    try {
      await axios
        // .post("http://192.168.0.45:3001/mongo/chatRoomList", {
        .post("https://mapmory.co.kr/chat/chatRoomList", {
          userId: user,
        })
        .then((res) => {
          console.log(res, isLoading);
          setList(res.data);
        });
      setIsLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  //유저 아이디 가져오기
  const axiosGetUser = async () => {
    try {
      await axios
        // .get("http://192.168.0.45:8000/chat/json/getUser", {
        .get("https://mapmory.co.kr/chat/json/getUser", {
          withCredentials: true,
        })
        .then((res) => {
          console.log("getUser", res);
          axiosGetChatList(res.data);
        });
    } catch (error) {
      console.error(error);
    }
  };

  socket.on("get chat list", (res) => {
    // console.log("get hcat", res);
    axiosGetChatList(res);
  });

  if (isLoading) {
    return <div>Loading...</div>;
  } else {
    return (
      <div>
        <h3>채팅방 목록</h3>
        <hr />
        <table>
          {list.map((chatList, index) => (
            <tbody key={index}>
              <tr>
                <td>{index + 1}</td>
                <td>
                  <a href={`/chat/chatroom/${chatList._id}`}>
                    {chatList.participants[0]}
                  </a>
                </td>
                {chatList.lastMessage.text === null ? null : (
                  <td>{chatList.lastMessage.text}</td>
                )}
              </tr>
            </tbody>
          ))}
        </table>
        <br />
        <hr />
      </div>
    );
  }
};

export default ChatList;
