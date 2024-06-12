import axios from "axios";
import React, { useEffect, useState } from "react";

const ChatList = () => {
  const [list, setList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    axiosGetUser();
  }, []);

  //채팅방 리스트 검색
  const axiosGetChatList = async (user) => {
    try {
      await axios
        .post("http://192.168.0.45:3001/mongo/chatRoomList", {
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
        .get("http://192.168.0.45:8000/chat/json/getUser", {
          withCredentials: true,
        })
        .then((res) => {
          console.log("getUser");
          axiosGetChatList(res.data);
        });
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  } else {
    return (
      <div>
        <h3>채팅방 목록</h3>
        <hr />
        {list.map((chatList, index) => (
          <div key={index}>
            <h3>{index + 1}</h3>
            <a href={`/chat/${chatList._id}`}>{chatList.participants[0]}</a>
          </div>
        ))}
        <br />
        <hr />
      </div>
    );
  }
};

export default ChatList;
