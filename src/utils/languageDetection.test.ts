import { describe, expect, it } from "bun:test";
import {
  detectMixedLanguageSignal,
  detectStrongLanguageSignal,
} from "./languageDetection";

describe("strong language signals", () => {
  it("distinguishes the Catalan and Spanish regression sentences", () => {
    expect(detectStrongLanguageSignal("El gat dorm al sofà.")).toBe("ca");
    expect(detectStrongLanguageSignal("El gato duerme en el sofá.")).toBe("es");
  });

  it("recognizes a clear English sentence the model can misclassify", () => {
    expect(detectStrongLanguageSignal("I do not want you to change the date.")).toBe(
      "en",
    );
    expect(detectStrongLanguageSignal("The date is not final.")).toBe("en");
  });

  it("abstains when the text has no strong language evidence", () => {
    expect(detectStrongLanguageSignal("12345")).toBeNull();
    expect(detectStrongLanguageSignal("Hola")).toBeNull();
  });

  it("flags a balanced code-switched sentence as mixed", () => {
    expect(detectMixedLanguageSignal("El gato is on the sofa.")).toBe(true);
    expect(detectMixedLanguageSignal("El gato duerme en el sofá.")).toBe(false);
  });
});
