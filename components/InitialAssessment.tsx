"use client";
import { db } from "@/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useSession } from "next-auth/react";
import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { BsMicFill, BsStopFill } from "react-icons/bs";
import { FaCheckCircle } from "react-icons/fa";

interface AssessmentResult {
  severity: "mild" | "moderate" | "severe";
  confidence: number;
  timestamp: string;
  audioFeatures?: any;
}

interface Props {
  onComplete: () => void;
}

const InitialAssessment = ({ onComplete }: Props) => {
  const { data: session } = useSession();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasAssessment, setHasAssessment] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const assessmentPrompts = [
    "Please say: 'The sun shines brightly'",
    "Please say: 'She sells seashells'",
    "Please say: 'Peter Piper picked peppers'",
  ];

  /* -----------------------------------------------------------
     Load Existing Assessment if Exists
  ----------------------------------------------------------- */
  useEffect(() => {
    checkExistingAssessment();
  }, [session]);

  const checkExistingAssessment = async () => {
    if (!session?.user?.email) return;

    try {
      const assessmentDoc = await getDoc(
        doc(db, "users", session.user.email, "profile", "assessment")
      );

      if (assessmentDoc.exists()) {
        setHasAssessment(true);
      }
    } catch (error) {
      console.error("Error checking assessment:", error);
    }
  };

  /* -----------------------------------------------------------
     Recording Handlers
  ----------------------------------------------------------- */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunks.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunks.current.push(e.data);
      };

      mediaRecorder.onstop = handleStop;
      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording... Speak clearly!");
    } catch (error) {
      toast.error("Microphone access denied");
      console.error(error);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  /* -----------------------------------------------------------
     Send Audio to Backend (WebM only)
  ----------------------------------------------------------- */
  const handleStop = async () => {
    setIsProcessing(true);

    const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "assessment.webm");
      formData.append("session", session?.user?.email || "");
      formData.append("promptIndex", currentStep.toString());

      const response = await fetch("http://localhost:5000/infer", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.error) {
        toast.error("Assessment failed. Please try again.");
        setIsProcessing(false);
        return;
      }

      const severity = mapPredictionToSeverity(
        result.ensemble_pred,
        result.ensemble_prob
      );

      const assessmentResult: AssessmentResult = {
        severity,
        confidence: result.ensemble_prob,
        timestamp: result.timestamp,
        audioFeatures: {
          rf_prob: result.model_probs.rf,
          xgb_prob: result.model_probs.xgb,
          lgbm_prob: result.model_probs.lgbm,
        },
      };

      await saveAssessmentResult(assessmentResult);

      if (currentStep < assessmentPrompts.length - 1) {
        setCurrentStep(currentStep + 1);
        toast.success("Step complete! Continue...");
      } else {
        toast.success("Assessment complete!");
        setHasAssessment(true);
        setTimeout(() => onComplete(), 1500);
      }
    } catch (error) {
      toast.error("Error processing audio");
      console.error("Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  /* -----------------------------------------------------------
     Helpers
  ----------------------------------------------------------- */
  const mapPredictionToSeverity = (
    prediction: number,
    probability: number
  ): "mild" | "moderate" | "severe" => {
    if (prediction === 0) return "mild";

    if (probability >= 0.8) return "severe";
    if (probability >= 0.6) return "moderate";
    return "mild";
  };

  const saveAssessmentResult = async (result: AssessmentResult) => {
    if (!session?.user?.email) return;

    try {
      const assessmentRef = doc(
        db,
        "users",
        session.user.email,
        "profile",
        "assessment"
      );

      const existingDoc = await getDoc(assessmentRef);
      const history = existingDoc.exists()
        ? existingDoc.data().history || []
        : [];

      await setDoc(
        assessmentRef,
        {
          current: result,
          baseline: existingDoc.exists() ? existingDoc.data().baseline : result,
          history: [...history, result],
          lastUpdated: new Date(),
        },
        { merge: true }
      );

      const memoryRef = doc(
        db,
        "users",
        session.user.email,
        "profile",
        "memory"
      );

      await setDoc(
        memoryRef,
        {
          severityLevel: result.severity,
          severityConfidence: result.confidence,
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error saving assessment:", error);
      throw error;
    }
  };

  /* -----------------------------------------------------------
     UI
  ----------------------------------------------------------- */
  if (hasAssessment) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">
          Assessment Complete!
        </h2>
        <p className="text-white/70">
          You can now start your practice sessions.
        </p>
        <button
          onClick={onComplete}
          className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold"
        >
          Continue to Chat
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-white/5 rounded-lg p-8 border border-white/10">
        <h2 className="text-3xl font-bold text-white mb-4 text-center">
          Initial Speech Assessment
        </h2>

        <p className="text-white/70 text-center mb-8">
          We'll analyze your speech to personalize your practice sessions.
          <br />
          Step {currentStep + 1} of {assessmentPrompts.length}
        </p>

        <div className="w-full bg-white/10 rounded-full h-2 mb-8">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((currentStep + 1) / assessmentPrompts.length) * 100}%`,
            }}
          />
        </div>

        <div className="bg-blue-600/20 border border-blue-500/50 rounded-lg p-6 mb-8">
          <p className="text-2xl text-white text-center font-semibold">
            {assessmentPrompts[currentStep]}
          </p>
        </div>

        {/* Recording controls */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`p-6 rounded-full transition-all ${
              isRecording
                ? "bg-red-600 hover:bg-red-700 animate-pulse"
                : "bg-blue-600 hover:bg-blue-700"
            } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isRecording ? (
              <BsStopFill className="text-4xl text-white" />
            ) : (
              <BsMicFill className="text-4xl text-white" />
            )}
          </button>

          <p className="text-white/70 text-center">
            {isProcessing
              ? "Analyzing your speech..."
              : isRecording
              ? "Recording... Click to stop"
              : "Click to start recording"}
          </p>
        </div>

        <div className="mt-8 bg-white/5 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-2">Tips:</h3>
          <ul className="text-white/70 text-sm space-y-1 list-disc list-inside">
            <li>Speak at a comfortable pace</li>
            <li>Find a quiet environment</li>
            <li>Speak clearly into your microphone</li>
            <li>Record for 3–5 seconds</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InitialAssessment;
