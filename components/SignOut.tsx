import React from "react";
import { signOut } from "@/auth";
const SignOut = () => {
  return (
    <form
      action={async () => {
        "use server";
        await signOut();
      }}
    >
      <button
        type="submit"
        className="text-sm underline text-gray-200 hover:text-white duration-300"
      >
        Sign Out
      </button>
    </form>
  );
};

export default SignOut;
