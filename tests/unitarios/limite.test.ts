import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dentroDoLimite } from "@/lib/server/limite";

// O módulo guarda estado em um Map de nível de módulo; por isso cada teste
// usa um IP próprio, para não interferir nos demais.

describe("dentroDoLimite", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite até 20 requisições por minuto e bloqueia a 21ª", () => {
    const ip = "10.0.0.1";
    for (let i = 0; i < 20; i++) {
      expect(dentroDoLimite(ip)).toBe(true);
    }
    expect(dentroDoLimite(ip)).toBe(false);
  });

  it("reabre a janela depois de 60 segundos", () => {
    const ip = "10.0.0.2";
    for (let i = 0; i < 21; i++) {
      dentroDoLimite(ip);
    }
    expect(dentroDoLimite(ip)).toBe(false);

    vi.advanceTimersByTime(60_000);

    expect(dentroDoLimite(ip)).toBe(true);
  });

  it("conta cada IP separadamente", () => {
    const ipSaturado = "10.0.0.3";
    for (let i = 0; i < 21; i++) {
      dentroDoLimite(ipSaturado);
    }
    expect(dentroDoLimite(ipSaturado)).toBe(false);
    expect(dentroDoLimite("10.0.0.4")).toBe(true);
  });
});
