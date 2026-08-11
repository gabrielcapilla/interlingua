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
    translationProgress: null,
    onCancelTranslation: () => undefined,
    onCopySuccess: () => undefined,
    onCopyError: () => undefined,
    onSelectAlternative: () => undefined,
  };

  it("shows accessible progress while translating", () => {
    render(
      <TranslationIO
        {...baseProps}
        isTranslating
        translationProgress={{ completedChunks: 0, totalChunks: 1 }}
      />,
    );

    expect(
      screen.getByRole("progressbar", { name: "Translation in progress" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel translation" })).toBeTruthy();
    expect(
      screen
        .getByRole("textbox", { name: "Translated text" })
        .getAttribute("placeholder"),
    ).toBe("");
    expect(screen.queryByRole("button", { name: "Copy translated text" })).toBeNull();
  });

  it("shows chunk progress and allows cancellation", () => {
    const onCancelTranslation = mock(() => undefined);
    render(
      <TranslationIO
        {...baseProps}
        isTranslating
        translationProgress={{ completedChunks: 1, totalChunks: 3 }}
        onCancelTranslation={onCancelTranslation}
      />,
    );

    expect(
      screen.getByRole("progressbar", { name: "Translation in progress" }),
    ).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("33");
    fireEvent.click(screen.getByRole("button", { name: "Cancel translation" }));
    expect(onCancelTranslation).toHaveBeenCalledTimes(1);
  });

  it("uses an indeterminate progress bar for a single streamed chunk", () => {
    render(
      <TranslationIO
        {...baseProps}
        isTranslating
        translationProgress={{ completedChunks: 0, totalChunks: 1 }}
      />,
    );

    const progressBar = screen.getByRole("progressbar", {
      name: "Translation in progress",
    });
    expect(progressBar.getAttribute("aria-valuenow")).toBeNull();
    expect(screen.queryByText(/Translating chunk/)).toBeNull();
  });

  it("keeps the streamed output scrolled to the newest text", () => {
    const { rerender } = render(
      <TranslationIO
        {...baseProps}
        isTranslating
        translatedText="First line"
        translationProgress={{ completedChunks: 0, totalChunks: 1 }}
      />,
    );
    const output = screen.getByRole("textbox", {
      name: "Translated text",
    }) as HTMLTextAreaElement;
    Object.defineProperty(output, "scrollHeight", { configurable: true, value: 480 });
    output.scrollTop = 0;

    rerender(
      <TranslationIO
        {...baseProps}
        isTranslating
        translatedText="First line\nSecond line"
        translationProgress={{ completedChunks: 0, totalChunks: 1 }}
      />,
    );

    expect(output.scrollTop).toBe(480);
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
