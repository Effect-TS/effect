// Reporters turn the structured event stream into text. Failures stay
// data until here (nothing is pre-rendered in the executor).
import { Schema } from "effect"
import type { Failure, PlannedTest, RunFinished, TestEvent, TestFinished } from "./Protocol.ts"
import { TestEvent as TestEventSchema } from "./Protocol.ts"

export interface Reporter {
  readonly onEvent: (e: TestEvent) => void
  readonly onEnd: () => void
}

export interface ReporterContext {
  readonly write: (s: string) => void
  /** exact command to rerun one test */
  readonly rerun: (test: PlannedTest, runSeed: number) => string
}

const MAX_LINES = 20

const bounded = (lines: ReadonlyArray<string>, max = MAX_LINES) =>
  lines.length <= max ? [...lines] : [...lines.slice(0, max), `... (+${lines.length - max} more lines)`]

const indent = (s: string, n = 2) => s.split("\n").map((l) => " ".repeat(n) + l).join("\n")

const renderFailure = (f: Failure): Array<string> => {
  const out: Array<string> = []
  out.push(`${f.kind}: ${f.message}`)
  if (f.errorTag) out.push(`  _tag: ${f.errorTag}`)
  if (f.errorFields) out.push(`  fields: ${f.errorFields}`)
  if (f.location) {
    out.push(`  at ${f.location.file}:${f.location.line}:${f.location.column}`)
  }
  return out
}

const summaryLine = (r: RunFinished, runSeed: number) => {
  const bad = r.failed + r.timedOut + r.interrupted
  const parts = [
    r.failed && `${r.failed} failed`,
    r.timedOut && `${r.timedOut} timed out`,
    r.interrupted && `${r.interrupted} interrupted`,
    `${r.passed} passed`,
    r.skipped && `${r.skipped} skipped`
  ].filter(Boolean)
  return `${bad > 0 ? "FAIL" : "PASS"} ${parts.join(", ")} (${r.total}) in ${r.durationMs}ms seed=${runSeed}${
    r.bailed ? " bailed" : ""
  }${r.cancelled ? " cancelled" : ""}`
}

/** Shared bookkeeping: plan order gives deterministic output regardless of scheduling. */
const collect = () => {
  let planned: Array<PlannedTest> = []
  let runSeed = 0
  const results = new Map<string, TestFinished>()
  let finished: RunFinished | undefined
  return {
    on(e: TestEvent) {
      if (e._tag === "RunPlanned") {
        planned = [...e.tests]
        runSeed = e.runSeed
      } else if (e._tag === "TestFinished") results.set(e.id, e)
      else if (e._tag === "RunFinished") finished = e
    },
    get planned() {
      return planned
    },
    get runSeed() {
      return runSeed
    },
    results,
    get finished() {
      return finished!
    }
  }
}

const isBad = (r: TestFinished) => r.status === "failed" || r.status === "timedOut" || r.status === "interrupted"

// --- agent: compact, failures-first, deterministic, no ANSI

export const agent = (ctx: ReporterContext): Reporter => {
  const s = collect()
  return {
    onEvent: s.on,
    onEnd() {
      const lines: Array<string> = [summaryLine(s.finished, s.runSeed)]
      const byBail = (r: TestFinished | undefined) =>
        r?.skipReason?.startsWith("not run: ") || r?.failures[0]?.message.startsWith("interrupted by ")
      for (const t of s.planned) {
        const r = s.results.get(t.id)
        if (!r || !isBad(r) || byBail(r)) continue
        lines.push("")
        lines.push(`--- ${r.status.toUpperCase()} ${t.id}`)
        lines.push(`attempt=${r.attempt}/${t.retries + 1} seed=${r.seed} duration=${r.durationMs}ms`)
        for (const f of r.failures) lines.push(...renderFailure(f))
        if (r.console.length > 0) {
          lines.push(`console:`)
          for (const l of bounded(r.console)) lines.push(indent(l, 2))
        }
        lines.push(`rerun: ${ctx.rerun(t, s.runSeed)}`)
      }
      const flaky = s.planned.filter((t) => {
        const r = s.results.get(t.id)
        return r?.status === "passed" && r.previousAttempts.length > 0
      })
      if (flaky.length) {
        lines.push("")
        for (const t of flaky) {
          const r = s.results.get(t.id)!
          lines.push(`FLAKY ${t.id} passed on attempt ${r.attempt} (earlier: ${r.previousAttempts.map((a) => a.status).join(", ")})`)
        }
      }
      const bailed = s.planned.filter((t) => byBail(s.results.get(t.id)))
      if (bailed.length) {
        const interrupted = bailed.filter((t) => s.results.get(t.id)!.status === "interrupted").length
        lines.push("")
        lines.push(
          `${s.finished.bailed ? "BAIL" : "CANCELLED"} ${interrupted} interrupted in flight, ${
            bailed.length - interrupted
          } not started (ids in --reporter jsonl)`
        )
      }
      const skipped = s.planned.filter((t) => s.results.get(t.id)?.status === "skipped" && !byBail(s.results.get(t.id)))
      if (skipped.length) {
        lines.push("")
        for (const t of skipped) lines.push(`SKIP ${t.id} (${s.results.get(t.id)!.skipReason ?? "skipped"})`)
      }
      ctx.write(lines.join("\n") + "\n")
    }
  }
}

// --- jsonl: the raw event stream, Schema-encoded, one event per line, as it happens

export const jsonl = (ctx: ReporterContext): Reporter => {
  const encode = Schema.encodeSync(TestEventSchema)
  return {
    onEvent: (e) => ctx.write(JSON.stringify(encode(e)) + "\n"),
    onEnd: () => {}
  }
}

// --- human: coloured tree

const c = (code: number) => (s: string) => `\x1b[${code}m${s}\x1b[0m`
const green = c(32), red = c(31), yellow = c(33), dim = c(2), bold = c(1)

export const human = (ctx: ReporterContext): Reporter => {
  const s = collect()
  return {
    onEvent: s.on,
    onEnd() {
      const out: Array<string> = []
      let lastPath: Array<string> = []
      for (const t of s.planned) {
        const r = s.results.get(t.id)!
        const segs = t.id.split(" > ")
        const parents = segs.slice(0, -1)
        let common = 0
        while (common < parents.length && parents[common] === lastPath[common]) common++
        for (let i = common; i < parents.length; i++) out.push(`${"  ".repeat(i)}${bold(parents[i])}`)
        lastPath = parents
        const icon = r.status === "passed"
          ? green("✓")
          : r.status === "skipped"
          ? yellow("○")
          : red("✗")
        const extra = r.status === "skipped"
          ? dim(` (${r.skipReason})`)
          : dim(` ${r.durationMs}ms`) + (r.previousAttempts.length ? yellow(` flaky, passed on attempt ${r.attempt}`) : "") +
            (r.status === "timedOut" ? red(" timed out") : "")
        out.push(`${"  ".repeat(parents.length)}${icon} ${segs.at(-1)}${extra}`)
      }
      for (const t of s.planned) {
        const r = s.results.get(t.id)!
        if (!isBad(r)) continue
        out.push("")
        out.push(red(bold(` ${r.status.toUpperCase()} `)) + " " + bold(t.id))
        for (const f of r.failures) {
          for (const l of renderFailure(f)) {
            out.push("  " + (l.trimStart().startsWith(">") ? red(l) : l.includes("→") ? yellow(l) : l))
          }
        }
        if (r.console.length) out.push(dim("  console:\n" + indent(bounded(r.console).join("\n"), 4)))
        out.push(dim(`  rerun: ${ctx.rerun(t, s.runSeed)}`))
      }
      out.push("")
      const line = summaryLine(s.finished, s.runSeed)
      out.push(line.startsWith("PASS") ? green(bold(line)) : red(bold(line)))
      ctx.write(out.join("\n") + "\n")
    }
  }
}
