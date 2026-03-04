import { describe, it, expect } from "vitest";
import { MEAL_TIMES, DAY_LABELS, DAY_LABELS_FULL, GOAL_LABELS, ACTIVITY_LABELS } from "@/lib/types";

describe("lib/types — constantes compartilhadas", () => {
    describe("MEAL_TIMES", () => {
        it("contém 4 refeições na ordem correta", () => {
            expect(MEAL_TIMES).toHaveLength(4);
            expect(MEAL_TIMES.map(m => m.key)).toEqual(["breakfast", "lunch", "snack", "dinner"]);
        });

        it("cada refeição tem key e label", () => {
            MEAL_TIMES.forEach(m => {
                expect(m.key).toBeTruthy();
                expect(m.label).toBeTruthy();
            });
        });
    });

    describe("DAY_LABELS", () => {
        it("contém 7 dias abreviados", () => {
            expect(DAY_LABELS).toHaveLength(7);
            expect(DAY_LABELS[0]).toBe("SEG");
            expect(DAY_LABELS[6]).toBe("DOM");
        });
    });

    describe("DAY_LABELS_FULL", () => {
        it("contém 7 dias completos (0=Domingo a 6=Sábado)", () => {
            expect(Object.keys(DAY_LABELS_FULL)).toHaveLength(7);
            expect(DAY_LABELS_FULL[0]).toBe("Domingo");
            expect(DAY_LABELS_FULL[1]).toBe("Segunda-Feira");
            expect(DAY_LABELS_FULL[6]).toBe("Sábado");
        });
    });

    describe("GOAL_LABELS", () => {
        it("cobre todos os 4 objetivos", () => {
            expect(Object.keys(GOAL_LABELS)).toHaveLength(4);
            expect(GOAL_LABELS.lose_weight).toBe("Perder Peso");
            expect(GOAL_LABELS.gain_muscle).toBe("Ganhar Músculo");
            expect(GOAL_LABELS.maintain).toBe("Manter");
            expect(GOAL_LABELS.recomposition).toBe("Recomposição");
        });
    });

    describe("ACTIVITY_LABELS", () => {
        it("cobre todos os 5 níveis", () => {
            expect(Object.keys(ACTIVITY_LABELS)).toHaveLength(5);
            expect(ACTIVITY_LABELS.sedentary).toBe("Sedentário");
            expect(ACTIVITY_LABELS.very_active).toBe("Muito Ativo");
        });
    });
});
