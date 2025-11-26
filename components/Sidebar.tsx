"use client";
import NewChat from "./NewChat";
import { IoHome } from "react-icons/io5";
import { MdMemory } from "react-icons/md";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase";
import ChatRow from "./ChatRow";

const Sidebar = () => {
  const { data: session } = useSession();
  const [chats, loading] = useCollection(
    session &&
      query(
        collection(db, "users", session.user?.email as string, "chats"),
        orderBy("createdAt", "asc")
      )
  );

  return (
    <div className="hidden md:flex flex-col h-screen relative p-2.5">
      <div className="flex items-center gap-1">
        {/* Home */}
        <Link
          href={"/"}
          className="border border-white/20 text-xs md:text-base p-1.5 md:p-2 rounded-md text-white/50 hover:border-white/50 hover:text-white"
        >
          <IoHome />
        </Link>

        {/* Profile/Memory Page */}
        <Link
          href={"/profile"}
          className="border border-white/20 text-xs md:text-base p-1.5 md:p-2 rounded-md text-white/50 hover:border-white/50 hover:text-white"
          title="View Profile & Progress"
        >
          <MdMemory />
        </Link>

        {/* New Chat */}
        <NewChat />
      </div>

      {session?.user ? (
        <>
          <p className="text-white mt-4 px-2 text-sm font-medium">
            Chat History
          </p>

          <div className="mt-4 overflow-y-scroll h-[80%]">
            {loading ? (
              // Loading skeleton
              <div className="flex flex-col flex-1 space-y-2 overflow-auto">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-full h-8 rounded-md shrink-0 animate-pulse bg-zinc-800"
                  />
                ))}
              </div>
            ) : chats?.docs.length ? (
              chats?.docs?.map((chat) => (
                <ChatRow key={chat?.id} id={chat?.id} />
              ))
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No Chat History</p>
              </div>
            )}
          </div>
        </>
      ) : (
        !loading && (
          <div className="text-sm font-medium text-center mt-10">
            <p>Please sign in to view history</p>
            <Link
              href={"/signin"}
              className="text-xs hover:white duration-300 mt-2 underline decoration-[1px]"
            >
              Sign In
            </Link>
          </div>
        )
      )}
    </div>
  );
};

export default Sidebar;
