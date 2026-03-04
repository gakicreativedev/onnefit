import { motion } from "framer-motion";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useTrainerStudents } from "../hooks/useTrainerStudents";
import {
  UsersGroupTwoRoundedBold,
  DumbbellBold,
  ChatRoundBold,
  ChartBold,
} from "solar-icon-set";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

export default function TrainerDashboard() {
  const { user } = useAuth();
  const { students, loading } = useTrainerStudents(user);

  const activeStudents = students.filter((s) => s.status === "active");
  const pendingStudents = students.filter((s) => s.status === "pending");

  const stats = [
    { icon: UsersGroupTwoRoundedBold, label: "Alunos Ativos", value: activeStudents.length, color: "text-primary" },
    { icon: DumbbellBold, label: "Treinos Criados", value: "—", color: "text-emerald-500" },
    { icon: ChatRoundBold, label: "Mensagens", value: "—", color: "text-blue-500" },
    { icon: ChartBold, label: "Pendentes", value: pendingStudents.length, color: "text-amber-500" },
  ];

  return (
    <motion.div
      className="flex flex-col gap-4 md:gap-6 max-w-5xl mx-auto w-full"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl md:text-3xl font-black text-foreground">
          Painel <span className="text-primary">Personal</span> 💪
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie seus alunos, treinos e acompanhe a evolução.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center gap-2 rounded-[20px] bg-card p-4 sm:p-6"
          >
            <stat.icon size={28} className={stat.color} color="currentColor" />
            <span className="text-2xl font-black text-foreground">{stat.value}</span>
            <span className="text-xs font-semibold text-muted-foreground text-center">{stat.label}</span>
          </div>
        ))}
      </motion.div>

      {/* Students List */}
      <motion.div variants={fadeUp}>
        <section className="rounded-[20px] sm:rounded-[28px] bg-card p-4 sm:p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Alunos Recentes</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
              <UsersGroupTwoRoundedBold size={40} color="currentColor" />
              <p className="text-sm font-medium">Nenhum aluno vinculado ainda</p>
              <p className="text-xs">Use a aba "Alunos" para adicionar seus primeiros alunos.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {students.slice(0, 5).map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 rounded-xl bg-muted/50 p-3"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                    {student.student_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {student.student_name || "Aluno"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {student.status === "active" ? "Ativo" : student.status === "pending" ? "Pendente" : "Inativo"}
                    </p>
                  </div>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      student.status === "active" ? "bg-emerald-500" : student.status === "pending" ? "bg-amber-500" : "bg-muted-foreground"
                    }`}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </motion.div>
    </motion.div>
  );
}
