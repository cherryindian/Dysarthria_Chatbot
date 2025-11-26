// app/api/askQuestion/route.ts
import { NextResponse } from "next/server";
import { classifyPromptWithLLM } from "@/lib/llmClassifier";
import query from "@/lib/queryAPI";
import { adminDB } from "@/firebaseAdmin";
import admin from "firebase-admin";

interface UserMemory {
  primaryIssue?: string;
  specificSounds?: string[];
  difficultyLevel?: "beginner" | "intermediate" | "advanced";
  practiceHistory: {
    date: Date;
    words: string[];
    success: boolean;
  }[];
  lastWords?: string[];
  lastExercise?: string;
  preferences?: {
    sessionLength?: string;
    focusAreas?: string[];
  };
}

interface ProgressMetrics {
  totalSessions: number;
  successfulAttempts: number;
  challengingWords: string[];
  improvedSounds: string[];
  lastUpdated: Date;
  milestones: {
    date: Date;
    achievement: string;
  }[];
}

export async function POST(req: Request) {
  try {
    const { prompt, chatId, model, session } = await req.json();

    if (!prompt || !chatId || !session) {
      return NextResponse.json(
        { success: false, error: "Missing prompt/chatId/session" },
        { status: 400 }
      );
    }

    // Classify the prompt
    const cls = await classifyPromptWithLLM(prompt);
    if (
      cls.label === "disallowed" ||
      (cls.label === "uncertain" && cls.confidence < 0.7)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Out of scope. Ask about dysarthria practice/explanations.",
          classifier: cls,
        },
        { status: 400 }
      );
    }

    // Load user memory
    const memRef = adminDB
      .collection("users")
      .doc(session)
      .collection("profile")
      .doc("memory");

    const memSnap = await memRef.get();
    const memory: UserMemory = memSnap.exists
      ? (memSnap.data() as UserMemory)
      : {
          practiceHistory: [],
        };

    // Load progress tracker
    const progressRef = adminDB
      .collection("users")
      .doc(session)
      .collection("profile")
      .doc("progress");

    const progressSnap = await progressRef.get();
    const progress: ProgressMetrics = progressSnap.exists
      ? (progressSnap.data() as ProgressMetrics)
      : {
          totalSessions: 0,
          successfulAttempts: 0,
          challengingWords: [],
          improvedSounds: [],
          lastUpdated: new Date(),
          milestones: [],
        };

    // Build context-aware system instruction
    const systemMemory = `
USER PROFILE:
- Primary Issue: ${memory.primaryIssue || "Not yet identified"}
- Difficulty Level: ${memory.difficultyLevel || "beginner"}
- Specific Sound Challenges: ${memory.specificSounds?.join(", ") || "none identified"}
- Recent Practice Words: ${memory.lastWords?.join(", ") || "none"}
- Last Exercise Type: ${memory.lastExercise || "none"}

PROGRESS SUMMARY:
- Total Sessions: ${progress.totalSessions}
- Success Rate: ${
      progress.totalSessions > 0
        ? Math.round(
            (progress.successfulAttempts / progress.totalSessions) * 100
          )
        : 0
    }%
- Challenging Words: ${progress.challengingWords.slice(0, 5).join(", ") || "none"}
- Recently Improved: ${progress.improvedSounds.join(", ") || "building baseline"}
    `.trim();

    const systemInstruction = `
You are an adaptive dysarthria speech therapy assistant with memory of the user's journey.

${systemMemory}

INSTRUCTIONS:
1. Use the user's profile to personalize exercises and difficulty
2. If this is early interaction, ask about their specific speech challenges
3. Build on previous exercises - reference what they practiced before
4. Adjust difficulty based on success rate (if <60%, simplify; if >80%, advance)
5. Celebrate milestones and improvements you notice
6. Keep responses friendly, encouraging, and actionable
7. No markdown formatting - plain text only

When suggesting practice words:
- Start with sounds related to their primary issue
- Consider their difficulty level
- Build on words they've practiced before
- Introduce variety while maintaining focus
    `.trim();

    const fullPrompt = `${systemInstruction}\n\nUser: ${prompt}`;

    // Get AI response
    const answer = await query(fullPrompt, chatId, model);

    // Save bot message to chat
    await adminDB
      .collection("users")
      .doc(session)
      .collection("chats")
      .doc(chatId)
      .collection("messages")
      .add({
        text: answer,
        createdAt: admin.firestore.Timestamp.now(),
        user: {
          _id: "ChatSpeak",
          name: "ChatSpeak",
          avatar: `https://ui-avatars.com/api/?name=ChatSpeak`,
        },
      });

    // Extract information from conversation
    const updatedMemory: Partial<UserMemory> = { ...memory };
    const updatedProgress: Partial<ProgressMetrics> = { ...progress };

    // Detect if user is describing their problem
    const problemKeywords = [
      "problem",
      "trouble",
      "difficulty",
      "can't say",
      "struggle",
      "hard to",
    ];
    const hasProblemDescription = problemKeywords.some((kw) =>
      prompt.toLowerCase().includes(kw)
    );

    if (hasProblemDescription && !memory.primaryIssue) {
      // Extract sounds mentioned (s, r, l, th, etc.)
      const soundPattern = /\b([srlth]+)\b|\b([srlth])-sound\b/gi;
      const matches = prompt.match(soundPattern);
      if (matches) {
        updatedMemory.specificSounds = Array.from(
          new Set(matches.map((m: string) => m.toLowerCase().replace("-sound", "")))
        );
        updatedMemory.primaryIssue = `Difficulty with ${updatedMemory.specificSounds.join(", ")} sounds`;
      }
    }

    // Extract practice words from bot response
    const practiceList = extractPracticeWords(answer);

    if (practiceList.length > 0) {
      updatedMemory.lastWords = practiceList;
      updatedMemory.lastExercise = "word_drill";

      // Add to practice history
      if (!updatedMemory.practiceHistory) {
        updatedMemory.practiceHistory = [];
      }
      updatedMemory.practiceHistory.push({
        date: new Date(),
        words: practiceList,
        success: false, // Will be updated when user practices
      });

      // Keep only last 20 sessions
      if (updatedMemory.practiceHistory.length > 20) {
        updatedMemory.practiceHistory = updatedMemory.practiceHistory.slice(
          -20
        );
      }

      // Update progress
      updatedProgress.totalSessions = (progress.totalSessions || 0) + 1;
      updatedProgress.lastUpdated = new Date();

      // Check for milestones
      if (updatedProgress.totalSessions === 5) {
        updatedProgress.milestones = [
          ...(progress.milestones || []),
          {
            date: new Date(),
            achievement: "Completed 5 practice sessions",
          },
        ];
      }
    }

    // Save updated memory
    await memRef.set(updatedMemory, { merge: true });

    // Save updated progress
    await progressRef.set(updatedProgress, { merge: true });

    return NextResponse.json({
      success: true,
      answer,
      classifier: cls,
      practiceList,
      memoryUpdated: Object.keys(updatedMemory).length > 0,
    });
  } catch (err: any) {
    console.error("askQuestion error:", err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}

function extractPracticeWords(text: string): string[] {
  if (!text) return [];

  const lines = text.split(/\r?\n/);
  const candidates: string[] = [];

  for (const line of lines) {
    const cleaned = line.replace(/^[\d\.\-\)\s]+/, "").trim();

    if (cleaned.includes(",") && cleaned.split(",").length <= 12) {
      cleaned.split(",").forEach((t) => {
        const w = t.trim().toLowerCase().replace(/[^a-z']/g, "");
        if (w.length >= 2 && w.length <= 20) candidates.push(w);
      });
    } else {
      const parts = cleaned.split(/\s+/);
      if (parts.length <= 4 && parts.length >= 1) {
        for (const p of parts) {
          const w = p.trim().toLowerCase().replace(/[^a-z']/g, "");
          if (w.length >= 2 && w.length <= 20) candidates.push(w);
        }
      }
    }
  }

  return Array.from(new Set(candidates)).slice(0, 40);
}