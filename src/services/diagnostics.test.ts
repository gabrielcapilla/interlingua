import { describe, expect, it } from "bun:test";
import { createDiagnosticsRecorder } from "./diagnostics";

const event = {
  provider: "llamacpp" as const,
  model: "translategemma-4b.gguf",
  phase: "translation" as const,
  outcome: "success" as const,
  inputCharacters: 18,
  latencyMs: 42.4,
};

describe("translation diagnostics", () => {
  it("aggregates operational counters without retaining text", () => {
    const recorder = createDiagnosticsRecorder(true);
    recorder.record(event);
    recorder.record({
      ...event,
      phase: "detection",
      outcome: "unknown",
      inputCharacters: 4,
      latencyMs: 8,
      cacheHit: true,
    });

    const snapshot = recorder.snapshot();
    expect(snapshot.requestCount).toBe(2);
    expect(snapshot.totalInputCharacters).toBe(22);
    expect(snapshot.totalLatencyMs).toBe(50);
    expect(snapshot.cacheHits).toBe(1);
    expect(snapshot.byPhase).toEqual({ detection: 1, translation: 1 });
    expect(snapshot.byOutcome.success).toBe(1);
    expect(snapshot.byOutcome.unknown).toBe(1);
    expect(snapshot.byModel).toEqual({ "llamacpp:translategemma-4b.gguf": 2 });
    expect(JSON.stringify(snapshot)).not.toContain("source");
    expect(JSON.stringify(snapshot)).not.toContain("translated");
  });

  it("does nothing when diagnostics are disabled", () => {
    const recorder = createDiagnosticsRecorder(false);
    recorder.record(event);

    expect(recorder.snapshot().requestCount).toBe(0);
  });

  it("can clear an in-memory snapshot", () => {
    const recorder = createDiagnosticsRecorder(true);
    recorder.record(event);
    recorder.clear();

    expect(recorder.snapshot().requestCount).toBe(0);
    expect(recorder.snapshot().byModel).toEqual({});
  });
});
