// app/chat/[id]/page.tsx
"use client";
import Chat from "@/components/Chat";
import ChatInput from "@/components/ChatInput";
import InitialAssessment from "@/components/InitialAssessment";
import { db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useSession } from "next-auth/react";
import { use, useEffect, useState } from "react";

interface Props {
  params: Promise<{ id: string }>;
}

const ChatPage = ({ params }: Props) => {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const { data: session } = useSession();
  const [needsAssessment, setNeedsAssessment] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAssessmentStatus();
  }, [session]);

  const checkAssessmentStatus = async () => {
    if (!session?.user?.email) {
      setIsLoading(false);
      return;
    }

    try {
      const assessmentDoc = await getDoc(
        doc(db, "users", session.user.email, "profile", "assessment")
      );

      setNeedsAssessment(!assessmentDoc.exists());
    } catch (error) {
      console.error("Error checking assessment:", error);
      setNeedsAssessment(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (needsAssessment) {
    return (
      <div className="flex flex-col justify-center h-full p-5">
        <InitialAssessment onComplete={() => setNeedsAssessment(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center h-[100%] p-5 overflow-hidden">
      <div className="flex-1 overflow-y-scroll pt-10">
        <Chat id={id} />
      </div>
      <ChatInput id={id} />
    </div>
  );
};

export default ChatPage;
