import React from "react";
import { Metadata } from "next";
import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign In | ChatSpeak",
  description: "Sign in for Dysarthria AI Chatbot",
};

const SignInPage = async () => {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }
  return (
    <div className="fixed w-full h-full bg-black/80 left-0 flex items-center justify-center">
      <div className="bg-[#2f2f2f] w-96 h-96 flex flex-col items-center justify-center rounded-lg">
        <div className="px-4 text-center">
          <p className="text-3xl font-bold tracking-wide">Welcome</p>
          <p className="text-base tracking-wide mt-2 font-mediumr">
            Log in or sign up to get started with ChatSpeak
          </p>
        </div>
        <div>
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <button
              type="submit"
              className="border border-white/50 py-2 px-6 rounded-md text-base font-semibold flex items-center gap-1 hover:border-white text-white/80 hover:text-white duration-300 ease-in-out group"
            >
              Signin
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
