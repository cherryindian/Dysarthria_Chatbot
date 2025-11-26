// app/api/audio-evaluate/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@deepgram/sdk";
import query from "@/lib/queryAPI";
import { classifyPromptWithLLM } from "@/lib/llmClassifier";
import { adminDB } from "@/firebaseAdmin";
import admin from "firebase-admin";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const audioFile = form.get("audio") as File | null;
    const chatId = (form.get("chatId") as string) || "";
    const session = (form.get("session") as string) || "";
    const model = (form.get("model") as string) || "gemini-2.5-flash";
    const userNameForm = (form.get("userName") as string) || "";
    const userAvatarForm = (form.get("userAvatar") as string) || "";

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: "No audio uploaded" },
        { status: 400 }
      );
    }

    if (!chatId || !session) {
      return NextResponse.json(
        { success: false, error: "Missing chatId or session" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());

    // ==================== CLASSIFIER ANALYSIS ====================
    let classifierResult = null;
    let improvementDetected = null;

    try {
      console.log("🔬 Sending audio to Flask classifier...");
      
      // Prepare audio for Flask API (expects WAV)
      const formData = new FormData();
      const wavBlob = new Blob([buffer], { type: "audio/wav" });
      formData.append("audio", wavBlob, "audio.wav");
      formData.append("session", session);

      // Send to Flask classifier
      const classifierResponse = await fetch("http://localhost:5000/infer", {
        method: "POST",
        body: formData,
      });

      if (classifierResponse.ok) {
        classifierResult = await classifierResponse.json();
        console.log("✅ Classifier result:", {
          ensemble_prob: classifierResult.ensemble_prob,
          ensemble_pred: classifierResult.ensemble_pred,
        });

        // Save classifier result and check for improvement
        improvementDetected = await updateAssessmentHistory(
          session,
          classifierResult
        );

        if (improvementDetected?.improved) {
          console.log("🎉 IMPROVEMENT DETECTED:", improvementDetected.message);
        }
      } else {
        console.error("❌ Classifier request failed:", classifierResponse.status);
      }
    } catch (classifierError) {
      console.error("⚠️ Classifier error (non-blocking):", classifierError);
      // Continue with transcription even if classifier fails
    }

    // ==================== TRANSCRIPTION ====================
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

    const { result } = await deepgram.listen.prerecorded.transcribeFile(
      buffer,
      {
        model: "nova-2",
        smart_format: true,
      }
    );

    const transcript =
      result?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ||
      "";

    console.log("📝 TRANSCRIPT:", transcript);

    const userName = userNameForm || session.split("@")[0] || "User";
    const userAvatar =
      userAvatarForm ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}`;

    // ==================== NO TRANSCRIPT ====================
    if (!transcript) {
      await adminDB
        .collection("users")
        .doc(session)
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .add({
          text: "[non-verbal / sound detected]",
          createdAt: admin.firestore.Timestamp.now(),
          user: {
            _id: session,
            name: userName,
            avatar: userAvatar,
          },
        });

      const botText =
        "I heard a sound but couldn't recognize a word. Please try saying a target word (for example: 'sip', 'sun', 'see') so I can evaluate your pronunciation.";

      await adminDB
        .collection("users")
        .doc(session)
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .add({
          text: botText,
          createdAt: admin.firestore.Timestamp.now(),
          user: {
            _id: "ChatSpeak",
            name: "ChatSpeak",
            avatar: "https://ui-avatars.com/api/?name=ChatSpeak",
          },
        });

      return NextResponse.json({
        success: true,
        transcript: "",
        response: botText,
        classifierResult,
        improvementDetected,
      });
    }

    // ==================== CLASSIFY TRANSCRIPT ====================
    const cls = await classifyPromptWithLLM(transcript);

    if (
      cls.label === "disallowed" ||
      (cls.label === "uncertain" && cls.confidence < 0.7)
    ) {
      const botText =
        "Your question is outside the assistant's scope. Try asking about dysarthria pronunciation or speech practice.";

      await adminDB
        .collection("users")
        .doc(session)
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .add({
          text: botText,
          createdAt: admin.firestore.Timestamp.now(),
          user: {
            _id: "ChatSpeak",
            name: "ChatSpeak",
            avatar: "https://ui-avatars.com/api/?name=ChatSpeak",
          },
        });

      return NextResponse.json({
        success: false,
        transcript,
        error: "Out of scope.",
        classifier: cls,
        classifierResult,
      });
    }

    // ==================== SAVE USER MESSAGE ====================
    await adminDB
      .collection("users")
      .doc(session)
      .collection("chats")
      .doc(chatId)
      .collection("messages")
      .add({
        text: transcript,
        createdAt: admin.firestore.Timestamp.now(),
        user: {
          _id: session,
          name: userName,
          avatar: userAvatar,
        },
      });

    // ==================== LOAD MEMORY + ASSESSMENT ====================
    const memRef = adminDB
      .collection("users")
      .doc(session)
      .collection("chats")
      .doc(chatId)
      .collection("memory")
      .doc("state");

    const assessmentRef = adminDB
      .collection("users")
      .doc(session)
      .collection("profile")
      .doc("assessment");

    const [memSnap, assessmentSnap] = await Promise.all([
      memRef.get(),
      assessmentRef.get(),
    ]);

    const memory = memSnap.exists ? memSnap.data() : {};
    const assessment = assessmentSnap.exists ? assessmentSnap.data() : null;

    // ==================== BUILD ENHANCED CONTEXT ====================
    let assessmentContext = "";
    
    if (assessment?.current) {
      const currentSeverity = assessment.current.severity || "unknown";
      const currentConfidence = (assessment.current.confidence * 100).toFixed(1);
      const baselineSeverity = assessment.baseline?.severity || "unknown";

      assessmentContext = `
SEVERITY ASSESSMENT:
- Current Severity: ${currentSeverity}
- Confidence: ${currentConfidence}%
- Baseline Severity: ${baselineSeverity}
      `.trim();

      // Add improvement message if detected
      if (improvementDetected?.improved) {
        assessmentContext += `\n- 🎉 RECENT IMPROVEMENT: ${improvementDetected.message}`;
      }
    }

    const systemMemory = `
Memory: issue=${memory?.issue || "none"}; last_words=${(
      memory?.last_words || []
    ).join(", ") || "none"}; last_ex=${memory?.last_exercise || "none"}

${assessmentContext}
    `.trim();

    const systemInstruction = `
You are a dysarthria-focused speech therapy assistant with real-time severity assessment.

${systemMemory}

INSTRUCTIONS:
1. Use the severity level to adjust exercise difficulty:
   - Mild: Challenging multi-syllable words and complex phrases
   - Moderate: Simple words with target sounds, 2-3 syllable words
   - Severe: Single syllables, isolated sounds, basic articulation
2. If improvement was detected, acknowledge and celebrate it warmly
3. Provide targeted feedback based on their current assessment
4. Keep replies friendly, encouraging, and actionable
5. No markdown formatting - plain text only

${
  improvementDetected?.improved
    ? `\n⭐ IMPORTANT: The user just showed improvement! Make sure to celebrate this achievement in your response.`
    : ""
}
    `.trim();

    const fullPrompt = `${systemInstruction}\n\nUser: ${transcript}`;

    // ==================== GET AI RESPONSE ====================
    const answer = await query(fullPrompt, chatId, model);

    // ==================== SAVE BOT MESSAGE ====================
    const botMessage = {
      text: answer,
      createdAt: admin.firestore.Timestamp.now(),
      user: {
        _id: "ChatSpeak",
        name: "ChatSpeak",
        avatar: "https://ui-avatars.com/api/?name=ChatSpeak",
      },
    };

    await adminDB
      .collection("users")
      .doc(session)
      .collection("chats")
      .doc(chatId)
      .collection("messages")
      .add(botMessage);

    // ==================== RETURN RESPONSE ====================
    return NextResponse.json({
      success: true,
      transcript,
      response: answer,
      classifier: cls,
      classifierResult,
      improvementDetected,
    });
  } catch (err: any) {
    console.error("❌ Speech eval error:", err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Updates assessment history and checks for improvement
 */
async function updateAssessmentHistory(
  session: string,
  result: any
): Promise<{ improved: boolean; message: string } | null> {
  try {
    const assessmentRef = adminDB
      .collection("users")
      .doc(session)
      .collection("profile")
      .doc("assessment");

    const assessmentSnap = await assessmentRef.get();
    const currentData = assessmentSnap.exists ? assessmentSnap.data() : null;

    // Map prediction to severity
    const severity = mapPredictionToSeverity(
      result.ensemble_pred,
      result.ensemble_prob
    );

    const newEntry = {
      severity,
      confidence: result.ensemble_prob,
      timestamp: result.timestamp || new Date().toISOString(),
      audioFeatures: result.model_probs,
    };

    // Check for improvement before saving
    const improvementResult = currentData?.baseline
      ? checkImprovement(currentData.baseline, newEntry)
      : { improved: false, message: "" };

    // Update history
    const history = currentData?.history || [];
    history.push(newEntry);

    // Save to Firestore
    await assessmentRef.set(
      {
        current: newEntry,
        baseline: currentData?.baseline || newEntry, // Set baseline if first time
        history: history.slice(-50), // Keep last 50 entries
        lastUpdated: admin.firestore.Timestamp.now(),
      },
      { merge: true }
    );

    return improvementResult;
  } catch (error) {
    console.error("Error updating assessment history:", error);
    return null;
  }
}

/**
 * Maps classifier prediction to severity level
 */
function mapPredictionToSeverity(
  prediction: number,
  probability: number
): "mild" | "moderate" | "severe" {
  // prediction = 0 means no dysarthria detected
  if (prediction === 0) return "mild";

  // prediction = 1 means dysarthria detected
  // Higher probability = more severe
  if (probability >= 0.8) return "severe";
  if (probability >= 0.6) return "moderate";
  return "mild";
}

/**
 * Checks if there's improvement compared to baseline
 */
function checkImprovement(
  baseline: any,
  current: any
): { improved: boolean; message: string } {
  if (!baseline) {
    return { improved: false, message: "" };
  }

  const severityMap: { [key: string]: number } = {
    mild: 1,
    moderate: 2,
    severe: 3,
  };

  const baselineSeverity = severityMap[baseline.severity] || 2;
  const currentSeverity = severityMap[current.severity] || 2;

  // Check 1: Severity level improvement
  if (currentSeverity < baselineSeverity) {
    return {
      improved: true,
      message: `Your severity improved from ${baseline.severity} to ${current.severity}! Great progress!`,
    };
  }

  // Check 2: Confidence decrease (lower confidence = better speech)
  const confidenceDiff = baseline.confidence - current.confidence;
  
  if (confidenceDiff > 0.1) {
    // 10% improvement threshold
    return {
      improved: true,
      message: `Your speech clarity improved by ${(confidenceDiff * 100).toFixed(
        0
      )}%! Keep up the excellent work!`,
    };
  }

  // Check 3: Marginal improvement (5-10%)
  if (confidenceDiff > 0.05) {
    return {
      improved: true,
      message: `Small improvement detected! You're making steady progress.`,
    };
  }

  return { improved: false, message: "" };
}