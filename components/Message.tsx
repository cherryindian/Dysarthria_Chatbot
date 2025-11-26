import { DocumentData } from "firebase/firestore";
import Image from "next/image";
import React from "react";

const Message = ({ message }: { message: DocumentData }) => {
  const isChatSpeak = message?.user?.name === "ChatSpeak";

  const fallbackAvatar = isChatSpeak
    ? "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Google_Gemini_logo.svg/1200px-Google_Gemini_logo.svg.png"
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(
        message?.user?.name || "User"
      )}`;

  const avatarSrc = message?.user?.avatar || fallbackAvatar;

  return (
    <div className="py-5 text-white">
      <div className="flex space-x-2.5 md:space-x-5 md:px-10">
        <div className="border border-gray-600 w-9 h-9 rounded-full overflow-hidden">
          <Image
            className="w-full h-full rounded-full object-cover"
            src={avatarSrc}
            alt="User avatar"
            width={36}
            height={36}
          />
        </div>

        <p
          className={`${
            isChatSpeak ? "bg-[#2f2f2f30]" : "bg-[#2f2f2f]"
          } px-4 py-2 rounded-lg shadow-sm text-base font-medium tracking-wide whitespace-pre-wrap`}
        >
          {message.text}
        </p>
      </div>
    </div>
  );
};

export default Message;
