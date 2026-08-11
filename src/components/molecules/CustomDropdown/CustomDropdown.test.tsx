import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { Window } from "happy-dom";

const domWindow = new Window({ url: "http://localhost" });
Object.assign(globalThis, {
  window: domWindow,
  document: domWindow.document,
  navigator: domWindow.navigator,
});
for (const name of [
  "HTMLElement",
  "Node",
  "Element",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "FocusEvent",
]) {
  Object.assign(globalThis, { [name]: domWindow[name as keyof Window] });
}

const { fireEvent, render, screen, cleanup } = await import("@testing-library/react");
const { CustomDropdown } = await import("./CustomDropdown");
const { TranslationIO } = await import("../../organisms/TranslationIO/TranslationIO");

const options = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "ca", label: "Catalan" },
];

describe("CustomDropdown", () => {
  beforeEach(() => cleanup());

  it("opens accessibly and selects an option", () => {
    const onChange = mock(() => undefined);
    render(
      <CustomDropdown
        options={options}
        value="en"
        onChange={onChange}
        aria-label="Output language"
      />,
    );

    const trigger = screen.getByRole("button", { name: "Output language" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("listbox", { name: "Output language" })).toBeTruthy();
    expect(screen.getAllByRole("option")).toHaveLength(3);

    fireEvent.click(screen.getByRole("option", { name: "Spanish" }));
    expect(onChange).toHaveBeenCalledWith("es");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("supports keyboard opening, navigation, and escape", () => {
    const onChange = mock(() => undefined);
    render(
      <CustomDropdown
        options={options}
        value="en"
        onChange={onChange}
        aria-label="Output language"
      />,
    );

    const trigger = screen.getByRole("button", { name: "Output language" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(onChange).toHaveBeenCalledWith("es");

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("does not open when disabled", () => {
    render(
      <CustomDropdown
        options={options}
        value="en"
        onChange={() => undefined}
        disabled
        aria-label="Output language"
      />,
    );

    const trigger = screen.getByRole("button", { name: "Output language" });
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});

describe("TranslationIO", () => {
  const baseProps = {
    inputText: "Hola",
    setInputText: () => undefined,
    translatedText: "Hello",
    alternativeTranslations: [],
    isTranslating: false,
    inputLanguageLabel: "Spanish",
    outputLanguageLabel: "English",
    characterCount: 4,
    wordCount: 1,
    onClearInput: () => undefined,
    isOverLimit: false,
    maxCharacters: 6400,
    onCopySuccess: () => undefined,
    onCopyError: () => undefined,
    onSelectAlternative: () => undefined,
  };

  it("announces the loading state accessibly", () => {
    render(<TranslationIO {...baseProps} isTranslating />);

    expect(screen.getByRole("status", { name: "AI is thinking" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Copy translated text" })).toBeNull();
  });

  it("renders selectable alternatives and reports copy success", async () => {
    const onCopySuccess = mock(() => undefined);
    const onSelectAlternative = mock(() => undefined);
    const writeText = mock(async () => undefined);
    Object.defineProperty(domWindow.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <TranslationIO
        {...baseProps}
        alternativeTranslations={["Hi"]}
        onCopySuccess={onCopySuccess}
        onSelectAlternative={onSelectAlternative}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Hi" }));
    expect(onSelectAlternative).toHaveBeenCalledWith("Hi");

    fireEvent.click(screen.getByRole("button", { name: "Copy translated text" }));
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith("Hello");
    expect(onCopySuccess).toHaveBeenCalledTimes(1);
  });
});

afterAll(() => domWindow.close());
