import type { InferenceProvider } from "../types";

export type DiagnosticPhase = "detection" | "translation";
export type DiagnosticOutcome =
  | "success"
  | "unknown"
  | "abstained"
  | "mismatch"
  | "same-language"
  | "error";
export type DiagnosticConfidence = "high" | "medium" | "low";

export interface TranslationDiagnosticEvent {
  provider: InferenceProvider;
  model: string;
  phase: DiagnosticPhase;
  outcome: DiagnosticOutcome;
  inputCharacters: number;
  latencyMs: number;
  cacheHit?: boolean;
  confidence?: DiagnosticConfidence;
}

export interface TranslationDiagnosticsSnapshot {
  requestCount: number;
  totalInputCharacters: number;
  totalLatencyMs: number;
  cacheHits: number;
  byPhase: Record<DiagnosticPhase, number>;
  byOutcome: Record<DiagnosticOutcome, number>;
  byModel: Record<string, number>;
}

export interface TranslationDiagnosticsRecorder {
  record: (event: TranslationDiagnosticEvent) => void;
  snapshot: () => TranslationDiagnosticsSnapshot;
  clear: () => void;
}

const createEmptySnapshot = (): TranslationDiagnosticsSnapshot => ({
  requestCount: 0,
  totalInputCharacters: 0,
  totalLatencyMs: 0,
  cacheHits: 0,
  byPhase: { detection: 0, translation: 0 },
  byOutcome: {
    success: 0,
    unknown: 0,
    abstained: 0,
    mismatch: 0,
    "same-language": 0,
    error: 0,
  },
  byModel: {},
});

const nonNegativeInteger = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;

export const createDiagnosticsRecorder = (
  enabled = false,
): TranslationDiagnosticsRecorder => {
  let current = createEmptySnapshot();

  return {
    record(event): void {
      if (!enabled) return;

      const modelKey = `${event.provider}:${event.model || "unknown"}`;
      const inputCharacters = nonNegativeInteger(event.inputCharacters);
      const latencyMs = nonNegativeInteger(event.latencyMs);

      current = {
        ...current,
        requestCount: current.requestCount + 1,
        totalInputCharacters: current.totalInputCharacters + inputCharacters,
        totalLatencyMs: current.totalLatencyMs + latencyMs,
        cacheHits: current.cacheHits + (event.cacheHit ? 1 : 0),
        byPhase: {
          ...current.byPhase,
          [event.phase]: current.byPhase[event.phase] + 1,
        },
        byOutcome: {
          ...current.byOutcome,
          [event.outcome]: current.byOutcome[event.outcome] + 1,
        },
        byModel: {
          ...current.byModel,
          [modelKey]: (current.byModel[modelKey] ?? 0) + 1,
        },
      };
    },
    snapshot(): TranslationDiagnosticsSnapshot {
      return {
        ...current,
        byPhase: { ...current.byPhase },
        byOutcome: { ...current.byOutcome },
        byModel: { ...current.byModel },
      };
    },
    clear(): void {
      current = createEmptySnapshot();
    },
  };
};
