import { describe, expect, it } from "bun:test";
import {
  createLanguageMismatchError,
  createSameLanguageError,
} from "./translationErrors";

describe("translation errors", () => {
  it("names both sides of a high-confidence language mismatch", () => {
    expect(
      createLanguageMismatchError("es", "en", { en: "English", es: "Spanish" }),
    ).toBe(
      "The text appears to be English, but Spanish is selected as the input language. Please select English or choose Auto-Detect.",
    );
  });

  it("explains why the target must differ from the source", () => {
    expect(createSameLanguageError("Spanish")).toBe(
      "Source and target are both Spanish. Please choose a different target language.",
    );
  });
});
