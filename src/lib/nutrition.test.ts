import { describe, it, expect } from "vitest";
import {
    calculateBMR,
    calculateCalorieTarget,
    calculateProteinTarget,
    getProteinMultiplier,
    calculateWaterTargetMl,
    calculateWaterTargetL,
    getWaterActivityMultiplier,
} from "@/lib/nutrition";

describe("calculateBMR", () => {
    it("calcula TMB masculina corretamente (Mifflin-St Jeor)", () => {
        // 10 * 70 + 6.25 * 175 - 5 * 25 + 5 = 700 + 1093.75 - 125 + 5 = 1673.75
        expect(calculateBMR("male", 70, 175, 25)).toBe(1673.75);
    });

    it("calcula TMB feminina corretamente", () => {
        // 10 * 60 + 6.25 * 165 - 5 * 30 - 161 = 600 + 1031.25 - 150 - 161 = 1320.25
        expect(calculateBMR("female", 60, 165, 30)).toBe(1320.25);
    });

    it("retorna fórmula feminina para gênero não reconhecido", () => {
        const result = calculateBMR("other", 70, 175, 25);
        // 10*70 + 6.25*175 - 5*25 - 161 = 1507.75
        expect(result).toBe(1507.75);
    });
});

describe("calculateCalorieTarget", () => {
    const bmr = 1600;

    it("aplica multiplicador sedentário e deficit para perda de peso", () => {
        const result = calculateCalorieTarget(bmr, "sedentary", "lose_weight");
        expect(result).toBe(Math.round(bmr * 1.2 - 500)); // 1920 - 500 = 1420
    });

    it("aplica multiplicador ativo e superávit para ganho muscular", () => {
        const result = calculateCalorieTarget(bmr, "active", "gain_muscle");
        expect(result).toBe(Math.round(bmr * 1.725 + 300)); // 2760 + 300 = 3060
    });

    it("mantém TDEE puro para recomposição", () => {
        const result = calculateCalorieTarget(bmr, "moderate", "recomposition");
        expect(result).toBe(Math.round(bmr * 1.55));
    });

    it("mantém TDEE para objetivo 'maintain'", () => {
        const result = calculateCalorieTarget(bmr, "moderate", "maintain");
        expect(result).toBe(Math.round(bmr * 1.55));
    });

    it("usa multiplicador padrão (moderate) para nível desconhecido", () => {
        const result = calculateCalorieTarget(bmr, "unknown_level", "maintain");
        expect(result).toBe(Math.round(bmr * 1.55));
    });
});

describe("calculateProteinTarget", () => {
    it("calcula proteína para ganho muscular (1.6g/kg)", () => {
        expect(calculateProteinTarget(80, "gain_muscle")).toBe(128);
    });

    it("calcula proteína para perda de peso (1.4g/kg)", () => {
        expect(calculateProteinTarget(70, "lose_weight")).toBe(98);
    });

    it("calcula proteína para manutenção (1.2g/kg)", () => {
        expect(calculateProteinTarget(70, "maintain")).toBe(84);
    });

    it("usa padrão 1.2g/kg para objetivo desconhecido", () => {
        expect(calculateProteinTarget(70, "unknown")).toBe(84);
    });

    it("arredonda resultado", () => {
        // 65 * 1.6 = 104
        expect(calculateProteinTarget(65, "gain_muscle")).toBe(104);
    });
});

describe("getProteinMultiplier", () => {
    it("retorna 1.6 para ganho muscular", () => {
        expect(getProteinMultiplier("gain_muscle")).toBe(1.6);
    });

    it("retorna 1.2 para objetivo desconhecido", () => {
        expect(getProteinMultiplier("random")).toBe(1.2);
    });
});

describe("calculateWaterTargetMl", () => {
    it("calcula alvo de água básico (70kg, moderado)", () => {
        // 70 * 35 * 1.0 = 2450
        expect(calculateWaterTargetMl(70, "moderate")).toBe(2450);
    });

    it("aumenta para pessoa muito ativa", () => {
        // 70 * 35 * 1.3 = 3185
        expect(calculateWaterTargetMl(70, "very_active")).toBe(3185);
    });

    it("reduz para sedentário", () => {
        // 70 * 35 * 0.9 = 2205
        expect(calculateWaterTargetMl(70, "sedentary")).toBe(2205);
    });
});

describe("calculateWaterTargetL", () => {
    it("retorna em litros arredondados (1 casa)", () => {
        expect(calculateWaterTargetL(70, "moderate")).toBe(2.5); // 2450ml = 2.5L
    });

    it("retorna em litros para pessoa ativa", () => {
        expect(calculateWaterTargetL(70, "active")).toBe(2.8); // 70*35*1.15=2817.5 → 2.8L
    });
});

describe("getWaterActivityMultiplier", () => {
    it("retorna 1.3 para muito ativo", () => {
        expect(getWaterActivityMultiplier("very_active")).toBe(1.3);
    });

    it("retorna 1.0 para nível desconhecido (padrão)", () => {
        expect(getWaterActivityMultiplier("unknown")).toBe(1.0);
    });
});
