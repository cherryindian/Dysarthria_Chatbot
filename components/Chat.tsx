"use client";
import React from "react";
import { useSession } from "next-auth/react";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase";
import { BsArrowDownCircle } from "react-icons/bs";
import Message from "./Message";

const Chat = ({ id }: { id: string }) => {
  const { data: session } = useSession();

  // ❗ SAFE FIRESTORE REFS (don't break hooks)
  const userEmail = session?.user?.email ?? "__none__"; // placeholder path
  const messagesRef = collection(
    db,
    "users",
    userEmail,
    "chats",
    id,
    "messages"
  );

  // ❗ Only run query if email is REAL, else pass undefined
  const messagesQuery = session?.user?.email
    ? query(messagesRef, orderBy("createdAt", "asc"))
    : null;

  const [messages] = useCollection(messagesQuery);

  // ❗ Rendering logic BELOW hooks
  if (!session?.user?.email) {
    return <div>Please sign in</div>;
  }

  return (
    <div>
      {messages?.empty && (
        <div className="flex flex-col items-center gap-2 py-5">
          <p>Type a prompt below to get started!</p>
          <BsArrowDownCircle className="text-xl text-green-300 animate-bounce" />
        </div>
      )}

      {messages?.docs?.map((msg, i) => (
        <Message key={i} message={msg.data()} />
      ))}
    </div>
  );
};

export default Chat;
