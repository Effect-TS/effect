/**
 * Bundle entry shared by every host. It only uses APIs available in browsers,
 * Node.js and Bun, and exposes the runner on `globalThis.__hostperf`.
 */
import { cases } from "./cases.ts"
import { measure, type Settings, timerResolutionMs } from "./harness.ts"

const runtime = (): string => {
  const g = globalThis as any
  if (g.Bun !== undefined) return `Bun ${g.Bun.version}`
  if (g.process?.versions?.node !== undefined) return `Node.js ${g.process.version}`
  return g.navigator?.userAgent ?? "unknown"
}

const run = async (options: { readonly case: string; readonly settings: Settings }) => {
  const benchCase = cases.find((c) => c.name === options.case)
  if (benchCase === undefined) throw new Error(`Unknown case ${options.case}`)
  return {
    operations: benchCase.operations,
    runtime: runtime(),
    timerResolutionMs: timerResolutionMs(),
    result: await measure(benchCase, options.settings)
  }
}
;(globalThis as any).__hostperf = { cases: cases.map((c) => c.name), run }
