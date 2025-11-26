// components/UserProfile.tsx
"use client";
import { db } from "@/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BsGraphUp } from "react-icons/bs";
import { MdMemory, MdTrendingUp } from "react-icons/md";
import { FaTrophy, FaChartLine } from "react-icons/fa";

interface UserMemory {
  primaryIssue?: string;
  specificSounds?: string[];
  difficultyLevel?: "beginner" | "intermediate" | "advanced";
  practiceHistory: {
    date: any;
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

interface ProgressTracker {
  totalSessions: number;
  successfulAttempts: number;
  challengingWords: string[];
  improvedSounds: string[];
  lastUpdated: any;
  milestones: { date: any; achievement: string }[];
}

const UserProfile = () => {
  const { data: session } = useSession();
  const [memory, setMemory] = useState<UserMemory | null>(null);
  const [progress, setProgress] = useState<ProgressTracker | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form states
  const [primaryIssue, setPrimaryIssue] = useState("");
  const [specificSounds, setSpecificSounds] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState<
    "beginner" | "intermediate" | "advanced"
  >("beginner");

  useEffect(() => {
    if (session?.user?.email) {
      loadUserData();
    }
  }, [session]);

  const loadUserData = async () => {
    if (!session?.user?.email) return;
    setLoading(true);

    try {
      const memoryDoc = await getDoc(
        doc(db, "users", session.user.email, "profile", "memory")
      );
      const progressDoc = await getDoc(
        doc(db, "users", session.user.email, "profile", "progress")
      );

      if (memoryDoc.exists()) {
        const memData = memoryDoc.data() as UserMemory;
        setMemory(memData);
        setPrimaryIssue(memData.primaryIssue || "");
        setSpecificSounds(memData.specificSounds?.join(", ") || "");
        setDifficultyLevel(memData.difficultyLevel || "beginner");
      } else {
        const defaultMemory: UserMemory = {
          practiceHistory: [],
        };
        await setDoc(
          doc(db, "users", session.user.email, "profile", "memory"),
          defaultMemory
        );
        setMemory(defaultMemory);
      }

      if (progressDoc.exists()) {
        setProgress(progressDoc.data() as ProgressTracker);
      } else {
        const defaultProgress: ProgressTracker = {
          totalSessions: 0,
          successfulAttempts: 0,
          challengingWords: [],
          improvedSounds: [],
          lastUpdated: new Date(),
          milestones: [],
        };
        await setDoc(
          doc(db, "users", session.user.email, "profile", "progress"),
          defaultProgress
        );
        setProgress(defaultProgress);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!session?.user?.email) return;

    try {
      const updatedMemory: Partial<UserMemory> = {
        primaryIssue: primaryIssue.trim() || undefined,
        specificSounds: specificSounds
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
        difficultyLevel,
      };

      await updateDoc(
        doc(db, "users", session.user.email, "profile", "memory"),
        updatedMemory
      );

      setMemory({ ...memory, ...updatedMemory } as UserMemory);
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  if (!session?.user) {
    return (
      <div className="text-center py-10">
        <p className="text-white/50">Please sign in to view your profile</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-white/5 rounded-lg"></div>
          <div className="h-48 bg-white/5 rounded-lg"></div>
          <div className="h-48 bg-white/5 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const successRate =
    progress && progress.totalSessions > 0
      ? Math.round((progress.successfulAttempts / progress.totalSessions) * 100)
      : 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-lg p-6 border border-blue-500/30">
          <div className="flex items-center gap-3 mb-2">
            <BsGraphUp className="text-2xl text-blue-400" />
            <h3 className="text-white font-semibold">Total Sessions</h3>
          </div>
          <p className="text-4xl font-bold text-white">
            {progress?.totalSessions || 0}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-lg p-6 border border-green-500/30">
          <div className="flex items-center gap-3 mb-2">
            <FaChartLine className="text-2xl text-green-400" />
            <h3 className="text-white font-semibold">Success Rate</h3>
          </div>
          <p className="text-4xl font-bold text-white">{successRate}%</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-lg p-6 border border-purple-500/30">
          <div className="flex items-center gap-3 mb-2">
            <FaTrophy className="text-2xl text-purple-400" />
            <h3 className="text-white font-semibold">Milestones</h3>
          </div>
          <p className="text-4xl font-bold text-white">
            {progress?.milestones?.length || 0}
          </p>
        </div>
      </div>

      {/* Memory Section */}
      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MdMemory className="text-2xl text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Speech Profile</h2>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
            >
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={saveProfile}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-white text-sm font-medium mb-2 block">
              Primary Speech Challenge
            </label>
            {isEditing ? (
              <input
                type="text"
                value={primaryIssue}
                onChange={(e) => setPrimaryIssue(e.target.value)}
                placeholder="e.g., Difficulty with consonants, articulation issues..."
                className="w-full bg-white/10 text-white px-4 py-2 rounded-md outline-none border border-white/20 focus:border-blue-500"
              />
            ) : (
              <p className="text-white/80 bg-white/5 px-4 py-2 rounded-md">
                {memory?.primaryIssue || "Not specified"}
              </p>
            )}
          </div>

          <div>
            <label className="text-white text-sm font-medium mb-2 block">
              Specific Sound Challenges
            </label>
            {isEditing ? (
              <input
                type="text"
                value={specificSounds}
                onChange={(e) => setSpecificSounds(e.target.value)}
                placeholder="e.g., s, r, th, l (comma separated)"
                className="w-full bg-white/10 text-white px-4 py-2 rounded-md outline-none border border-white/20 focus:border-blue-500"
              />
            ) : (
              <p className="text-white/80 bg-white/5 px-4 py-2 rounded-md">
                {memory?.specificSounds?.join(", ") || "Not specified"}
              </p>
            )}
          </div>

          <div>
            <label className="text-white text-sm font-medium mb-2 block">
              Difficulty Level
            </label>
            {isEditing ? (
              <select
                value={difficultyLevel}
                onChange={(e) =>
                  setDifficultyLevel(
                    e.target.value as "beginner" | "intermediate" | "advanced"
                  )
                }
                className="w-full bg-white/10 text-white px-4 py-2 rounded-md outline-none border border-white/20 focus:border-blue-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            ) : (
              <p className="text-white/80 bg-white/5 px-4 py-2 rounded-md capitalize">
                {memory?.difficultyLevel || "beginner"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Progress Details */}
      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        <div className="flex items-center gap-3 mb-6">
          <MdTrendingUp className="text-2xl text-green-400" />
          <h2 className="text-2xl font-bold text-white">Progress Details</h2>
        </div>

        <div className="space-y-6">
          {/* Improved Sounds */}
          <div>
            <h4 className="text-white font-semibold mb-3">
              Improved Sounds 🎉
            </h4>
            {progress?.improvedSounds && progress.improvedSounds.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {progress.improvedSounds.map((sound, idx) => (
                  <span
                    key={idx}
                    className="bg-green-600/30 border border-green-500/50 text-green-200 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {sound}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-white/50 text-sm">
                Keep practicing to see improvements!
              </p>
            )}
          </div>

          {/* Challenging Words */}
          <div>
            <h4 className="text-white font-semibold mb-3">Words to Focus On</h4>
            {progress?.challengingWords &&
            progress.challengingWords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {progress.challengingWords.map((word, idx) => (
                  <span
                    key={idx}
                    className="bg-orange-600/30 border border-orange-500/50 text-orange-200 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {word}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-white/50 text-sm">
                No challenging words identified yet
              </p>
            )}
          </div>

          {/* Milestones */}
          <div>
            <h4 className="text-white font-semibold mb-3">
              Milestones Achieved 🏆
            </h4>
            {progress?.milestones && progress.milestones.length > 0 ? (
              <div className="space-y-2">
                {progress.milestones
                  .slice(-5)
                  .reverse()
                  .map((milestone, idx) => (
                    <div
                      key={idx}
                      className="bg-white/5 p-3 rounded-md flex items-start gap-3"
                    >
                      <FaTrophy className="text-yellow-400 text-lg mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-white font-medium">
                          {milestone.achievement}
                        </p>
                        <p className="text-white/50 text-xs mt-1">
                          {milestone.date?.toDate
                            ? milestone.date.toDate().toLocaleDateString()
                            : new Date(milestone.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-white/50 text-sm">
                Complete sessions to unlock milestones!
              </p>
            )}
          </div>

          {/* Practice History */}
          <div>
            <h4 className="text-white font-semibold mb-3">Recent Practice</h4>
            {memory?.practiceHistory && memory.practiceHistory.length > 0 ? (
              <div className="space-y-2">
                {memory.practiceHistory
                  .slice(-5)
                  .reverse()
                  .map((session, idx) => (
                    <div
                      key={idx}
                      className="bg-white/5 p-3 rounded-md flex items-center justify-between"
                    >
                      <div>
                        <p className="text-white text-sm">
                          {session.words.slice(0, 5).join(", ")}
                          {session.words.length > 5 && "..."}
                        </p>
                        <p className="text-white/50 text-xs mt-1">
                          {session.date?.toDate
                            ? session.date.toDate().toLocaleDateString()
                            : new Date(session.date).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          session.success
                            ? "bg-green-600/30 text-green-300"
                            : "bg-gray-600/30 text-gray-300"
                        }`}
                      >
                        {session.success ? "✓ Success" : "In Progress"}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-white/50 text-sm">
                No practice history yet. Start a session to begin tracking!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
