import ChatHelp from "../components/ChatHelp";
import ChatInput from "../components/ChatInput";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-2">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-5">
        <h2 className="text-xl md:text-3xl font-semibold text-white px-4">
          Let us begin training
        </h2>
      </div>
      <ChatInput id="" />
      {/* <ChatHelp /> */}
    </main>
  );
}
