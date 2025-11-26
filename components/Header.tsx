import React from "react";
import Link from "next/link";
import { FiChevronDown, FiUserPlus } from "react-icons/fi";
import { auth } from "@/auth";
import Image from "next/image";
import SignOut from "./SignOut";

const Header = async () => {
  const session = await auth();
  return (
    <div className="flex item-center justify-between m-2.5 h-10 absolute w-full top-0 left-0 pl-2 pr-12">
      <button className="flex items-center gap-1 bg-[#2f2f2f} hover:bg-black font-semibold tracking-wide px-3 py-2 rounded-lg duration-300">
        ChatSpeak
      </button>
      {session?.user ? (
        <div>
          <Image
            src={session?.user?.image as string}
            alt="image"
            width={40}
            height={40}
            className="rounded-full"
          />
          <SignOut />
        </div>
      ) : (
        <Link
          href={"/signin"}
          className="text-sm font-semibold hover:text-white duration-300"
        >
          Sign In
        </Link>
      )}
    </div>
  );
};

export default Header;
