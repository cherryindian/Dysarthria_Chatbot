"use client";

import React, { useState, useRef } from "react";
import { BsMicFill, BsStopFill } from "react-icons/bs";
import toast from "react-hot-toast";

interface Props {
  chatId: string;
}

const VoiceRecorder = ({ chatId }: Props) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunks.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.onstop = handleStop;

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started...");
    } catch (error) {
      toast.error("Microphone access denied.");
      console.error(error);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    toast("Processing audio...");
  };

  const handleStop = async () => {
    const blob = new Blob(audioChunks.current, { type: "audio/webm" });

    const formData = new FormData();
    formData.append("audio", blob, "voice.webm");
    formData.append("chatId", chatId);

    const res = await fetch("/api/audio-evaluate", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (data.success) {
      toast.success("Audio analyzed!");
    } else {
      toast.error("Audio analysis failed.");
    }
  };

  return (
    <button
      onClick={isRecording ? stopRecording : startRecording}
      className={`p-3 rounded-full ${
        isRecording ? "bg-red-600" : "bg-blue-600"
      } text-white`}
    >
      {isRecording ? <BsStopFill size={20} /> : <BsMicFill size={20} />}
    </button>
  );
};

export default VoiceRecorder;
