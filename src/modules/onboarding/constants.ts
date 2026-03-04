export const TOTAL_STEPS = 4;

export const GOALS = [
  { value: "lose_weight", label: "Perder Peso", desc: "Reduzir gordura corporal e ficar mais definido" },
  { value: "gain_muscle", label: "Ganhar Músculo", desc: "Aumentar massa muscular e força" },
  { value: "recomposition", label: "Recomposição Corporal", desc: "Perder gordura e ganhar músculo simultaneamente" },
  { value: "maintain", label: "Manter", desc: "Manter o nível de condicionamento atual" },
] as const;

export const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentário", desc: "Pouco ou nenhum exercício" },
  { value: "light", label: "Levemente Ativo", desc: "Exercício leve 1-3 dias/semana" },
  { value: "moderate", label: "Moderadamente Ativo", desc: "Exercício moderado 3-5 dias/semana" },
  { value: "active", label: "Ativo", desc: "Exercício intenso 6-7 dias/semana" },
  { value: "very_active", label: "Muito Ativo", desc: "Exercício muito intenso + trabalho físico" },
] as const;

export const STEP_TITLES = [
  "Sobre Você",
  "Seu Objetivo",
  "Nível de Atividade",
  "Saúde & Restrições",
] as const;
