import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useTrainerStudents } from "../hooks/useTrainerStudents";
import { useTrainerChat } from "../hooks/useTrainerChat";
import { Button } from "@/components/ui/button";
import { ChatRoundBold, PlainBold } from "solar-icon-set";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

export default function TrainerChatPage() {
  const { user } = useAuth();
  const { students } = useTrainerStudents(user);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const { messages, sendMessage } = useTrainerChat(user, selectedStudent);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput("");
  };

  const activeStudents = students.filter((s) => s.status === "active");
  const selectedName = students.find((s) => s.student_id === selectedStudent)?.student_name || "Aluno";

  return (
    <motion.div
      className="flex flex-col gap-4 max-w-4xl mx-auto w-full h-[calc(100vh-120px)] md:h-[calc(100vh-80px)]"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
    >
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-black text-foreground">Chat com Alunos</h1>
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-1 gap-4 min-h-0">
        {/* Student list */}
        <div className="hidden sm:flex flex-col gap-1 w-48 rounded-[20px] bg-card p-3 overflow-y-auto">
          {activeStudents.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">Nenhum aluno ativo</p>
          ) : (
            activeStudents.map((s) => (
              <button
                key={s.student_id}
                onClick={() => setSelectedStudent(s.student_id)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  selectedStudent === s.student_id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted/50 text-foreground"
                }`}
              >
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold shrink-0">
                  {s.student_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <span className="text-sm font-semibold truncate">{s.student_name || "Aluno"}</span>
              </button>
            ))
          )}
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col rounded-[20px] bg-card overflow-hidden">
          {!selectedStudent ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <ChatRoundBold size={40} color="currentColor" />
              <p className="text-sm font-medium">Selecione um aluno para conversar</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-bold text-foreground">{selectedName}</p>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.sender_id === user?.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 p-3 border-t border-border">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 rounded-xl bg-muted border-0 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <Button size="icon" onClick={handleSend} className="rounded-xl h-11 w-11">
                  <PlainBold size={18} color="currentColor" />
                </Button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
