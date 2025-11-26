import { db } from "@/firebase";
import { collection, deleteDoc, doc, orderBy, query } from "firebase/firestore";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useCollection } from "react-firebase-hooks/firestore";
import { BiSolidTrashAlt } from "react-icons/bi";
import { IoChatboxOutline } from "react-icons/io5";

const ChatRow = ({ id }: { id: string }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [active, setActive] = useState(false);

  const userEmail = session?.user?.email ?? "__none__";

  // 🔥 Fetch messages for preview
  const [messages] = useCollection(
    query(
      collection(db, "users", userEmail, "chats", id, "messages"),
      orderBy("createdAt", "asc")
    )
  );

  // 🔥 Last message preview
  const lastMessage = messages?.docs[messages.docs.length - 1]?.data();
  const chatText = lastMessage?.text || "New Chat";

  useEffect(() => {
    if (!pathname) return;
    setActive(pathname.includes(id));
  }, [pathname, id]);

  // 🔥 Fetch all chats for redirect after deletion
  const [chatsSnapshot] = useCollection(
    query(
      collection(db, "users", userEmail, "chats"),
      orderBy("createdAt", "desc")
    )
  );

  const handleRemoveChat = async () => {
    await deleteDoc(doc(db, "users", userEmail, "chats", id));

    if (active) {
      const nextChat = chatsSnapshot?.docs?.find((chat) => chat.id !== id);
      router.push(nextChat ? `/chat/${nextChat.id}` : "/");
    }
  };

  return (
    <Link
      href={`/chat/${id}`}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md mb-2 duration-300
        ${active ? "bg-white/10" : "hover:bg-white/10"}`}
    >
      <IoChatboxOutline className="text-xl" />

      <span className="flex-1 truncate text-sm font-medium tracking-wide">
        {messages ? chatText : "..."}
      </span>

      <BiSolidTrashAlt
        onClick={(e) => {
          e.preventDefault(); // prevent navigation
          handleRemoveChat();
        }}
        className="text-white/50 hover:text-red-700 duration-300"
      />
    </Link>
  );
};

export default ChatRow;
