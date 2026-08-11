import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { gzipSync } from "node:zlib";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import App from "../src/App";

const configuredIterations = Number(process.env.INTERLINGUA_RENDER_ITERATIONS ?? 25);
const ITERATIONS = Number.isFinite(configuredIterations)
  ? Math.max(1, Math.floor(configuredIterations))
  : 25;

const percentile = (values: number[], percentage: number): number => {
  const sorted = [...values].sort((left, right) => left - right);
  if (!sorted.length) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((percentage / 100) * sorted.length) - 1,
  );
  return Math.round(sorted[Math.max(0, index)] * 100) / 100;
};

const walk = (directory: string): string[] => {
  try {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? walk(path) : [path];
    });
  } catch {
    return [];
  }
};

const measureRender = () => {
  for (let index = 0; index < 5; index += 1) {
    renderToStaticMarkup(createElement(App));
  }

  const durations: number[] = [];
  let markup = "";
  for (let index = 0; index < ITERATIONS; index += 1) {
    const started = performance.now();
    markup = renderToStaticMarkup(createElement(App));
    durations.push(performance.now() - started);
  }

  return {
    iterations: ITERATIONS,
    htmlCharacters: markup.length,
    meanMs:
      Math.round(
        (durations.reduce((sum, value) => sum + value, 0) / durations.length) * 100,
      ) / 100,
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
  };
};

const measureBundle = () => {
  const assets = walk("dist").filter((path) => /\.(?:js|css)$/.test(path));
  if (!assets.length)
    throw new Error("No built JS/CSS assets found; run bun run build first.");
  const rawBytes = assets.reduce((sum, path) => sum + statSync(path).size, 0);
  const gzipBytes = assets.reduce(
    (sum, path) => sum + gzipSync(readFileSync(path)).byteLength,
    0,
  );

  return {
    assetCount: assets.length,
    rawBytes,
    gzipBytes,
    assets: assets.map((path) => ({
      file: path.replace(/^dist[\\/]/, ""),
      rawBytes: statSync(path).size,
      gzipBytes: gzipSync(readFileSync(path)).byteLength,
    })),
  };
};

console.log(
  JSON.stringify(
    {
      status: "complete",
      render: measureRender(),
      bundle: measureBundle(),
    },
    null,
    2,
  ),
);
