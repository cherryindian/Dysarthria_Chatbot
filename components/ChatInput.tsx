"use client";
import { db } from "@/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useState, useRef } from "react";
import toast from "react-hot-toast";
import { ImArrowUp2 } from "react-icons/im";
import { TbMicrophoneFilled } from "react-icons/tb";

export default function ChatInput({ id }: { id: string }) {
  const [prompt, setPrompt] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const model = "gemini-2.5-flash";

  // 🎤 START RECORDING
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);
      recorderRef.current = mediaRecorder;
      audioChunks.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunks.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });

        const formData = new FormData();
        formData.append("audio", audioBlob);
        formData.append("chatId", id);
        formData.append("session", session?.user?.email || "");
        formData.append("model", model);

        // ✅ send user name + avatar so API can use Google avatar
        formData.append("userName", session?.user?.name || "");
        formData.append("userAvatar", session?.user?.image || "");

        const toastId = toast.loading("Analyzing audio...");

        try {
          const res = await fetch("/api/audio-evaluate", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          toast.dismiss(toastId);

          if (data?.success) {
            toast.success("Audio analyzed!");
          } else {
            toast.error(data?.error || "Audio evaluation failed!");
          }
        } catch (err) {
          toast.dismiss(toastId);
          toast.error("Error sending audio.");
          console.error(err);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.error("Microphone access denied.");
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  // 💬 Send text message (unchanged)
  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!prompt) return;

    const input = prompt.trim();

    const message = {
      text: input,
      createdAt: serverTimestamp(),
      user: {
        _id: session?.user?.email || "unknown",
        name: session?.user?.name || "Anonymous",
        avatar:
          session?.user?.image ||
          `https://ui-avatars.com/api/?name=${
            session?.user?.name || "Anonymous"
          }`,
      },
    };

    try {
      let chatDocumentId = id;

      if (!id) {
        const docRef = await addDoc(
          collection(db, "users", session!.user!.email!, "chats"),
          { userId: session!.user!.email!, createdAt: serverTimestamp() }
        );

        chatDocumentId = docRef.id;
        router.push(`/chat/${chatDocumentId}`);
      }

      await addDoc(
        collection(
          db,
          "users",
          session!.user!.email!,
          "chats",
          chatDocumentId,
          "messages"
        ),
        message
      );

      setPrompt("");

      const loadingToast = toast.loading("Generating response...");

      const res = await fetch("/api/askQuestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: input,
          chatId: chatDocumentId,
          model,
          session: session?.user?.email,
        }),
      });

      const data = await res.json();
      toast.dismiss(loadingToast);

      if (data?.success) toast.success("Response generated!");
      else toast.error(data?.error || "Failed to generate response.");
    } catch (error) {
      toast.error("Failed to send message.");
      console.error(error);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center max-w-3xl mx-auto pt-3 px-4">
      <form
        onSubmit={sendMessage}
        className="bg-white/10 rounded-full flex items-center px-4 py-2.5 w-full"
      >
        {/* 🎤 Paperclip toggles audio recording */}
        <button
          type="button"
          onClick={toggleRecording}
          className="text-white transition duration-200"
        >
          <TbMicrophoneFilled
            className={`text-xl ${
              isRecording
                ? "text-red-500 animate-pulse"
                : "text-white hover:text-gray-300"
            }`}
          />
        </button>

        <input
          type="text"
          placeholder="Type your question..."
          onChange={(e) => setPrompt(e.target.value)}
          value={prompt}
          className="bg-transparent w-full text-white placeholder:text-grey-400 font-medium tracking-wide px-4 outline-none"
        />

        <button
          type="submit"
          disabled={!prompt}
          className="p-2.5 rounded-full text-black bg-white disabled:bg-white/30"
        >
          <ImArrowUp2 />
        </button>
      </form>
    </div>
  );
}
