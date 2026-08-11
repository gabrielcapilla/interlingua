import { describe, expect, it } from "bun:test";
import { createLatestRequestScheduler } from "./latestRequest";

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe("latest request scheduler", () => {
  it("runs the first request and only the newest pending value", async () => {
    const calls: string[] = [];
    let releaseFirst: (() => void) | undefined;
    const firstFinished = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const scheduler = createLatestRequestScheduler(async (value) => {
      calls.push(value);
      if (value === "first") await firstFinished;
    });

    scheduler.enqueue("first");
    await flushMicrotasks();
    scheduler.enqueue("second");
    scheduler.enqueue("third");
    releaseFirst?.();
    await flushMicrotasks();

    expect(calls).toEqual(["first", "third"]);
    scheduler.dispose();
  });

  it("leaves the rendered value at the newest request after a slow run", async () => {
    let renderedValue = "";
    let releaseFirst: (() => void) | undefined;
    const firstFinished = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const scheduler = createLatestRequestScheduler(async (value) => {
      if (value === "first") await firstFinished;
      renderedValue = value;
    });

    scheduler.enqueue("first");
    await flushMicrotasks();
    scheduler.enqueue("edited while busy");
    scheduler.enqueue("final text");
    releaseFirst?.();
    await flushMicrotasks();

    expect(renderedValue).toBe("final text");
    scheduler.dispose();
  });

  it("can clear a pending value when input is cleared", async () => {
    const calls: string[] = [];
    const scheduler = createLatestRequestScheduler(async (value) => {
      calls.push(value);
    });

    scheduler.enqueue("first");
    scheduler.enqueue("stale");
    scheduler.clearPending();
    await flushMicrotasks();

    expect(calls).toEqual(["first"]);
    scheduler.dispose();
  });
});
