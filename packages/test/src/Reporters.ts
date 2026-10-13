// Reporters turn the structured event stream into text. Failures stay
// data until here (nothing is pre-rendered in the executor).
import * as Schema from "effect/Schema"
import { SLOW_MS } from "./Coordinator.ts"
import type {
  Failure,
  Location,
  Mismatch,
  PlannedTest,
  RunFinished,
  Selection,
  SourceLine,
  TestEvent,
  TestFinished
} from "./Protocol.ts"
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

const MAX_MISMATCHES = 10

const renderMismatch = (m: Mismatch): string => {
  const at = m.path ? `${m.path}: ` : ""
  return m.reason !== undefined ? at + m.reason : `${at}expected ${m.expected}, got ${m.actual}`
}

const at = (l: Location) => `${l.file}:${l.line}:${l.column}`

/** The failing line marked with `>`, the lines before it for context, and a caret at the column. */
const renderSource = (source: ReadonlyArray<SourceLine>, location: Location): Array<string> => {
  const width = String(location.line).length
  const out = source.map((s) =>
    `${s.line === location.line ? ">" : " "} ${String(s.line).padStart(width)} | ${s.text.replace(/\t/g, "  ")}`
  )
  const failing = source.find((s) => s.line === location.line)
  if (failing) {
    const col = failing.text.slice(0, Math.max(0, location.column - 1)).replace(/\t/g, "  ").length
    out.push(`  ${" ".repeat(width)} | ${" ".repeat(col)}^`)
  }
  return out
}

const renderFailure = (f: Failure): Array<string> => {
  const out: Array<string> = []
  const [first, ...rest] = f.message.split("\n")
  if (f.label !== undefined) {
    out.push(`${f.kind}: ${f.label}`)
    out.push(`  ${first}`)
  } else out.push(`${f.kind}: ${first}`)
  for (const l of rest) out.push(`  ${l}`)
  const mismatches = f.mismatches ?? []
  for (const m of mismatches.slice(0, MAX_MISMATCHES)) {
    const [line, ...more] = renderMismatch(m).split("\n")
    out.push(`    ${line}`)
    for (const l of more) out.push(`      ${l}`)
  }
  if (mismatches.length > MAX_MISMATCHES) out.push(`    ... (+${mismatches.length - MAX_MISMATCHES} more)`)
  if (f.errorTag) out.push(`  _tag: ${f.errorTag}`)
  if (f.errorFields) out.push(`  fields: ${f.errorFields}`)
  if (f.note) out.push(`  note: ${f.note}`)
  if (f.location) {
    out.push(`  at ${at(f.location)}${f.origin ? ` (raised at ${at(f.origin)})` : ""}`)
    if (f.source) { for (const l of renderSource(f.source, f.location)) out.push(`    ${l}`) }
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

/** What ran and why, e.g. `selected 3 of 60 tests in 8 files (examples); --test "fees"`. */
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`
/** At most 3 paths; the full list is in `RunPlanned.selection` (jsonl). */
const pathsList = (paths: ReadonlyArray<string>) =>
  paths.length === 0
    ? "."
    : paths.length <= 3
    ? paths.join(", ")
    : `${paths.slice(0, 2).join(", ")}, +${paths.length - 2} more`
const selectionLine = (selection: Selection, selected: number) =>
  `selected ${selected} of ${plural(selection.tests, "test")} in ${plural(selection.files, "file")} (${
    pathsList(selection.paths)
  })${selection.filters.length ? `; ${selection.filters.join(", ")}` : ""}; ${
    selection.config !== undefined ? `config ${selection.config}` : "no config"
  }`

/** Tests that passed (or were skipped) but took longer than `SLOW_MS`; the failing ones are shown anyway. */
const slowTests = (planned: ReadonlyArray<PlannedTest>, results: ReadonlyMap<string, TestFinished>) =>
  planned.flatMap((t) => {
    const r = results.get(t.id)
    return r && r.status === "passed" && r.durationMs > SLOW_MS ? [{ test: t, result: r }] : []
  })

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`

/** Shared bookkeeping: plan order gives deterministic output regardless of scheduling. */
const collect = () => {
  let planned: Array<PlannedTest> = []
  let runSeed = 0
  let selection: Selection = { root: "", paths: [], files: 0, tests: 0, filters: [] }
  const results = new Map<string, TestFinished>()
  let finished: RunFinished | undefined
  return {
    on(e: TestEvent) {
      if (e._tag === "RunPlanned") {
        planned = [...e.tests]
        runSeed = e.runSeed
        selection = e.selection
      } else if (e._tag === "TestFinished") results.set(e.id, e)
      else if (e._tag === "RunFinished") finished = e
    },
    get planned() {
      return planned
    },
    get runSeed() {
      return runSeed
    },
    get selection() {
      return selection
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
      const lines: Array<string> = [summaryLine(s.finished, s.runSeed), selectionLine(s.selection, s.planned.length)]
      const byBail = (r: TestFinished | undefined) =>
        r?.skipReason?.startsWith("not run: ") || r?.failures[0]?.message.startsWith("interrupted by ")
      for (const t of s.planned) {
        const r = s.results.get(t.id)
        if (!r || !isBad(r) || byBail(r)) continue
        lines.push("")
        lines.push(`--- ${r.status.toUpperCase()} [${t.shortId}] ${t.id}`)
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
          lines.push(
            `FLAKY [${t.shortId}] ${t.id} passed on attempt ${r.attempt} (earlier: ${
              r.previousAttempts.map((a) => a.status).join(", ")
            })`
          )
        }
      }
      const slow = slowTests(s.planned, s.results)
      if (slow.length) {
        lines.push("")
        for (const { result, test } of slow) {
          lines.push(`SLOW [${test.shortId}] ${test.id} took ${seconds(result.durationMs)} (over ${seconds(SLOW_MS)})`)
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
        for (const t of skipped) {
          lines.push(`SKIP [${t.shortId}] ${t.id} (${s.results.get(t.id)!.skipReason ?? "skipped"})`)
        }
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
          : (r.status === "passed" && r.durationMs > SLOW_MS
            ? yellow(` ${r.durationMs}ms slow`)
            : dim(` ${r.durationMs}ms`)) +
            (r.previousAttempts.length ? yellow(` flaky, passed on attempt ${r.attempt}`) : "") +
            (r.status === "timedOut" ? red(" timed out") : "")
        out.push(`${"  ".repeat(parents.length)}${icon} ${segs.at(-1)}${extra}`)
      }
      for (const t of s.planned) {
        const r = s.results.get(t.id)!
        if (!isBad(r)) continue
        out.push("")
        out.push(red(bold(` ${r.status.toUpperCase()} `)) + " " + dim(`[${t.shortId}]`) + " " + bold(t.id))
        for (const f of r.failures) {
          for (const l of renderFailure(f)) {
            out.push(
              "  " + (l.trimStart().startsWith(">")
                ? red(l)
                : l.includes(": expected ") || l.includes(": missing") || l.includes(": unexpected")
                ? yellow(l)
                : l)
            )
          }
        }
        if (r.console.length) out.push(dim("  console:\n" + indent(bounded(r.console).join("\n"), 4)))
        out.push(dim(`  rerun: ${ctx.rerun(t, s.runSeed)}`))
      }
      out.push("")
      out.push(dim(selectionLine(s.selection, s.planned.length)))
      const line = summaryLine(s.finished, s.runSeed)
      out.push(line.startsWith("PASS") ? green(bold(line)) : red(bold(line)))
      ctx.write(out.join("\n") + "\n")
    }
  }
}
