import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useTrainerStudents } from "../hooks/useTrainerStudents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UsersGroupTwoRoundedBold, AddCircleBold, CloseCircleBold } from "solar-icon-set";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

export default function TrainerStudentsPage() {
  const { user } = useAuth();
  const { students, loading, inviteStudentByUsername, removeStudent } = useTrainerStudents(user);
  const [showAdd, setShowAdd] = useState(false);
  const [username, setUsername] = useState("");
  const [sending, setSending] = useState(false);

  const handleAdd = async () => {
    if (!username.trim()) return;
    setSending(true);
    const { error, data } = await inviteStudentByUsername(username.trim());
    setSending(false);

    if (error) {
      toast.error(error);
    } else {
      toast.success(`Convite enviado para ${data?.name || username}`);
      setShowAdd(false);
      setUsername("");
    }
  };

  const handleRemove = async (studentId: string, name: string) => {
    await removeStudent(studentId);
    toast.success(`${name || "Aluno"} removido`);
  };

  return (
    <motion.div
      className="flex flex-col gap-4 md:gap-6 max-w-3xl mx-auto w-full"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
    >
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Meus Alunos</h1>
          <p className="text-sm text-muted-foreground">{students.length} aluno(s) vinculados</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="rounded-xl gap-2">
          <AddCircleBold size={18} color="currentColor" />
          Adicionar
        </Button>
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-col gap-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
            <UsersGroupTwoRoundedBold size={48} color="currentColor" />
            <p className="text-base font-semibold">Nenhum aluno vinculado</p>
            <p className="text-sm">Adicione alunos para começar a gerenciar treinos e dietas.</p>
          </div>
        ) : (
          students.map((student) => (
            <div key={student.id} className="flex items-center gap-3 rounded-[16px] bg-card p-4">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {student.student_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {student.student_name || "Aluno"}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{student.status}</p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  student.status === "active"
                    ? "bg-emerald-500/20 text-emerald-500"
                    : student.status === "pending"
                    ? "bg-amber-500/20 text-amber-500"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {student.status === "active" ? "Ativo" : student.status === "pending" ? "Pendente" : "Inativo"}
              </span>
              <button
                onClick={() => handleRemove(student.student_id, student.student_name)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <CloseCircleBold size={20} color="currentColor" />
              </button>
            </div>
          ))
        )}
      </motion.div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Aluno</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Digite o @ do aluno para enviar um convite de vinculação.
            </p>
            <Input
              placeholder="@usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={!username.trim() || sending}>
              {sending ? "Buscando..." : "Enviar Convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
