import { describe, it, expect } from "vitest";
import { getLevel } from "@/modules/gamification/hooks/useXP";

describe("getLevel", () => {
    it("retorna nível 1 para 0 XP", () => {
        const result = getLevel(0);
        expect(result.level).toBe(1);
        expect(result.totalXP).toBe(0);
        expect(result.progress).toBe(0);
        expect(result.currentThreshold).toBe(0);
        expect(result.nextThreshold).toBe(100);
    });

    it("retorna nível 1 com progresso de 50% para 50 XP", () => {
        const result = getLevel(50);
        expect(result.level).toBe(1);
        expect(result.progress).toBe(50);
    });

    it("retorna nível 2 para 100 XP", () => {
        const result = getLevel(100);
        expect(result.level).toBe(2);
        expect(result.currentThreshold).toBe(100);
        expect(result.nextThreshold).toBe(250);
    });

    it("retorna nível 3 para 250 XP", () => {
        const result = getLevel(250);
        expect(result.level).toBe(3);
        expect(result.currentThreshold).toBe(250);
        expect(result.nextThreshold).toBe(500);
    });

    it("calcula progresso parcial corretamente", () => {
        // 375 XP: level 3 (threshold 250, next 500)
        // progress = (375 - 250) / (500 - 250) * 100 = 50%
        const result = getLevel(375);
        expect(result.level).toBe(3);
        expect(result.progress).toBe(50);
    });

    it("retorna nível máximo (11) para XP muito alto", () => {
        const result = getLevel(6000);
        expect(result.level).toBe(11);
    });

    it("progresso nunca excede 100", () => {
        const result = getLevel(99999);
        expect(result.progress).toBeLessThanOrEqual(100);
    });

    it("retorna progresso 0 exatamente no threshold", () => {
        const result = getLevel(500);
        expect(result.level).toBe(4);
        expect(result.progress).toBe(0);
    });

    it("nível escala progressivamente", () => {
        const levels = [0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4600, 6000];
        levels.forEach((xp, i) => {
            const result = getLevel(xp);
            expect(result.level).toBe(i + 1);
        });
    });

    it("XP entre thresholds pertence ao nível correto", () => {
        expect(getLevel(99).level).toBe(1);
        expect(getLevel(100).level).toBe(2);
        expect(getLevel(249).level).toBe(2);
        expect(getLevel(250).level).toBe(3);
    });
});
