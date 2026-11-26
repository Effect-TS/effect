// Times runtime hot paths in two copies of effect (for example a worktree of
// origin/main and the current checkout), interleaved over several rounds.
// usage: node scripts/hill-climb/reduce-basic-bundle-size/hot-path-bench.mjs <base effect dist> <current effect dist>
// Each cell is the median ns per operation; differences under about 10% are noise.
import * as Path from "node:path"
import { pathToFileURL } from "node:url"

const load = async (dir) => {
  const url = (name) => pathToFileURL(Path.resolve(dir, name + ".js")).href
  return {
    Effect: await import(url("Effect")),
    Context: await import(url("Context")),
    Cause: await import(url("Cause")),
    Equal: await import(url("Equal")),
    Formatter: await import(url("Formatter")),
    Predicate: await import(url("Predicate"))
  }
}

const cases = (M) => {
  const A = M.Context.Service("Bench/A")
  const B = M.Context.Service("Bench/B")
  const flat = M.Context.makeUnsafe(new Map(Array.from({ length: 16 }, (_, i) => ["Bench/" + i, i])).set(A.key, 1))
  const overlay = M.Context.add(M.Context.add(flat, B, 2), M.Context.Service("Bench/C"), 3)
  const program = M.Effect.succeed(1).pipe(M.Effect.map((n) => n + 1), M.Effect.flatMap((n) => M.Effect.succeed(n)))
  const provided = M.Effect.provideService(program, B, 2)
  const cause = M.Cause.combine(M.Cause.fail({ code: 1, tags: ["a", "b"] }), M.Cause.die(new Error("boom")))
  const causeCopy = M.Cause.combine(M.Cause.fail({ code: 1, tags: ["a", "b"] }), M.Cause.die(cause.reasons[1].defect))
  const ctxCopy = M.Context.makeUnsafe(new Map([...flat.mapUnsafe].reverse()))
  const value = { id: 1, name: "x", nested: { list: [1, 2, 3], date: new Date(0) } }
  return {
    "runSync(succeed.map.flatMap)": () => M.Effect.runSync(program),
    "runSync(provideService)": () => M.Effect.runSync(provided),
    "runFork(succeed)": () => M.Effect.runFork(program),
    "Context.get flat": () => M.Context.get(flat, A),
    "Context.get overlay": () => M.Context.get(overlay, A),
    "Equal.equals(cause)": () => M.Equal.equals(cause, causeCopy),
    "Equal.equals(context)": () => M.Equal.equals(flat, ctxCopy),
    "format(object)": () => M.Formatter.format(value),
    "String(cause)": () => String(cause),
    "Predicate.hasProperty": () => M.Predicate.hasProperty(value, "id")
  }
}

const [baseDir, currentDir] = process.argv.slice(2)
const variants = { base: cases(await load(baseDir)), current: cases(await load(currentDir)) }
const iterations = 200_000
const rounds = 7
const results = {}
let sink = 0
for (let round = 0; round < rounds; round++) {
  for (const [name, fns] of Object.entries(variants)) {
    for (const [label, fn] of Object.entries(fns)) {
      const start = process.hrtime.bigint()
      for (let i = 0; i < iterations; i++) sink += fn() ? 1 : 0
      ;((results[label] ??= {})[name] ??= []).push(Number(process.hrtime.bigint() - start) / iterations)
    }
  }
}
const median = (xs) => xs.slice().sort((a, b) => a - b)[xs.length >> 1]
console.log(`node ${process.version}, ${iterations} operations per sample, median of ${rounds} rounds (ns/op)`)
console.log(["case", "base", "current", "current/base"].join("\t"))
for (const [label, { base, current }] of Object.entries(results)) {
  const b = median(base)
  const c = median(current)
  console.log([label, b.toFixed(1), c.toFixed(1), (c / b).toFixed(2)].join("\t"))
}
if (sink === -1) console.log("unreachable")
