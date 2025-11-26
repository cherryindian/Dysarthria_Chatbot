"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { FaPlus } from "react-icons/fa";
import { useSession } from "next-auth/react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";

const NewChat = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const userEmail = session?.user ? (session?.user?.email as string) : "guest";
  const createNewChat = async () => {
    const doc = await addDoc(
      collection(db, "users", userEmail as string, "chats"),
      {
        userId: userEmail as string,
        createdAt: serverTimestamp(),
      }
    );
    router.push(`chat/${doc?.id}`);
  };
  return (
    <button
      onClick={createNewChat}
      className="flex items-center justify-center gap-2 w-full border border-white/20 text-xs md:text-base px-2 py-1 rounded-md text-white/50 hover:border-white/50 hover:text-white duration-300"
    >
      <FaPlus />
      New Chat
    </button>
  );
};

export default NewChat;
