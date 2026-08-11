import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { Window } from "happy-dom";
import { act, type FC } from "react";

const domWindow = new Window({ url: "http://localhost" });
const domGlobalNames = [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "Node",
  "Element",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "IS_REACT_ACT_ENVIRONMENT",
] as const;
const previousDomGlobals = new Map(
  domGlobalNames.map((name) => [name, (globalThis as Record<string, unknown>)[name]]),
);
Object.assign(globalThis, {
  window: domWindow,
  document: domWindow.document,
  navigator: domWindow.navigator,
  IS_REACT_ACT_ENVIRONMENT: true,
});
for (const name of [
  "HTMLElement",
  "Node",
  "Element",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
]) {
  Object.assign(globalThis, { [name]: domWindow[name as keyof Window] });
}

const { createRoot } = await import("react-dom/client");
const { default: useTranslation } = await import("./useTranslation");

const originalFetch = globalThis.fetch;
const mountedRoots: Array<ReturnType<typeof createRoot>> = [];

interface HarnessProps {
  text: string;
}

const Harness: FC<HarnessProps> = ({ text }) => {
  const state = useTranslation({
    selectedModel: "ollama:translategemma:4b",
    inputLanguage: "es",
    outputLanguage: "en",
    mode: "translate",
  });

  return (
    <div>
      <button type="button" onClick={() => void state.translateText(text)}>
        translate
      </button>
      <button type="button" onClick={state.cancelTranslation}>
        cancel
      </button>
      <output data-testid="translation">{state.translatedText}</output>
      <output data-testid="status">{state.isTranslating ? "busy" : "idle"}</output>
      <output data-testid="progress">
        {state.translationProgress
          ? `${state.translationProgress.completedChunks}/${state.translationProgress.totalChunks}`
          : "none"}
      </output>
    </div>
  );
};

const renderHarness = (text: string): HTMLDivElement => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push(root);
  act(() => root.render(<Harness text={text} />));
  return container;
};

const findButton = (container: HTMLDivElement, label: string): HTMLButtonElement => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === label,
  );
  if (!button) throw new Error(`Missing ${label} button`);
  return button;
};

const getOutput = (container: HTMLDivElement, testId: string): string =>
  container.querySelector(`[data-testid="${testId}"]`)?.textContent ?? "";

const jsonResponse = (content: string): Response =>
  new Response(
    JSON.stringify({ done: true, message: { role: "assistant", content } }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );

const sourceFromPrompt = (body: string): string =>
  body.match(/<source_text>\n([\s\S]*?)\n<\/source_text>/)?.[1] ?? "";

describe("useTranslation chunk orchestration", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  afterEach(() => {
    act(() => {
      for (const root of mountedRoots) root.unmount();
    });
    mountedRoots.length = 0;
    globalThis.fetch = originalFetch;
  });

  it("translates multiple chunks sequentially and commits them in order", async () => {
    const calls: string[] = [];
    globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        messages: Array<{ content: string }>;
      };
      const content = body.messages[0]?.content ?? "";
      if (content.includes("identifying the language")) return jsonResponse("es");
      calls.push(sourceFromPrompt(content));
      return jsonResponse(`chunk-${calls.length}`);
    }) as unknown as typeof fetch;

    const source = Array.from({ length: 260 }, () => "El gato duerme en la casa.").join(
      " ",
    );
    const container = renderHarness(source);

    await act(async () => {
      findButton(container, "translate").click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(calls.length).toBeGreaterThan(1);
    expect(calls.every((chunk) => chunk.length > 0)).toBe(true);
    expect(getOutput(container, "translation")).toBe(
      calls.map((_, index) => `chunk-${index + 1}`).join(" "),
    );
    expect(getOutput(container, "status")).toBe("idle");
    expect(getOutput(container, "progress")).toBe("none");
  });

  it("translates both paragraphs when the combined source fits the budget", async () => {
    const calls: string[] = [];
    globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        messages: Array<{ content: string }>;
      };
      const content = body.messages[0]?.content ?? "";
      if (content.includes("identifying the language")) return jsonResponse("es");
      calls.push(sourceFromPrompt(content));
      return jsonResponse(`paragraph-${calls.length}`);
    }) as unknown as typeof fetch;

    const container = renderHarness(
      "El primer párrafo conserva todos los detalles.\n\nEl segundo párrafo también debe traducirse.",
    );
    await act(async () => {
      findButton(container, "translate").click();
      await Promise.resolve();
    });

    expect(calls).toEqual([
      "El primer párrafo conserva todos los detalles.",
      "El segundo párrafo también debe traducirse.",
    ]);
    expect(getOutput(container, "translation")).toBe("paragraph-1\n\nparagraph-2");
  });

  it("cancels an in-flight chunk request without surfacing a translation error", async () => {
    globalThis.fetch = mock(
      async (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    ) as unknown as typeof fetch;

    const container = renderHarness("El gato duerme en la casa.");
    await act(async () => {
      findButton(container, "translate").click();
      await Promise.resolve();
    });
    expect(getOutput(container, "status")).toBe("busy");

    await act(async () => {
      findButton(container, "cancel").click();
      await Promise.resolve();
    });

    expect(getOutput(container, "status")).toBe("idle");
    expect(getOutput(container, "translation")).toBe("");
  });
});

afterAll(() => {
  for (const name of domGlobalNames) {
    const value = previousDomGlobals.get(name);
    if (value === undefined) {
      Reflect.deleteProperty(globalThis, name);
    } else {
      Object.assign(globalThis, { [name]: value });
    }
  }
  domWindow.close();
});
