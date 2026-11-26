// Checks that Hash.hash and Equal.equals, on plain values and on Exit and Cause, give the same results in two copies of effect
// on random nested values (for example a worktree of origin/main and the current checkout).
// usage: node scripts/hill-climb/reduce-basic-bundle-size/hash-parity.mjs <base effect src or dist> <current effect src or dist> [cases]
import * as NodePath from "node:path"
import { pathToFileURL } from "node:url"

const [baseDir, currentDir, casesArg] = process.argv.slice(2)
const cases = Number(casesArg ?? 2000)
const load = async (dir) => {
  const ext = dir.endsWith("src") ? ".ts" : ".js"
  const url = (name) => pathToFileURL(NodePath.resolve(dir, name + ext)).href
  return {
    Hash: await import(url("Hash")),
    Equal: await import(url("Equal")),
    Cause: await import(url("Cause")),
    Exit: await import(url("Exit"))
  }
}
const base = await load(baseDir)
const current = await load(currentDir)

let seed = 1
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const pick = (xs) => xs[Math.floor(random() * xs.length)]
const leaf = () =>
  pick([
    () => Math.floor(random() * 100),
    () => random() * 1e6,
    () => NaN,
    () => -0,
    () => BigInt(Math.floor(random() * 1e9)),
    () => "s" + Math.floor(random() * 10),
    () => random() < 0.5,
    () => null,
    () => undefined,
    () => new Date(Math.floor(random() * 1e12)),
    () => new Date(NaN),
    () => /a+b/g,
    () => new Uint8Array([1, 2, Math.floor(random() * 255)])
  ])()
const value = (depth) => {
  if (depth <= 0 || random() < 0.3) return leaf()
  const n = Math.floor(random() * 4)
  return pick([
    () => Array.from({ length: n }, () => value(depth - 1)),
    () => Object.fromEntries(Array.from({ length: n }, (_, i) => ["k" + i, value(depth - 1)])),
    () => new Map(Array.from({ length: n }, () => [value(depth - 1), value(depth - 1)])),
    () => new Set(Array.from({ length: n }, () => value(depth - 1)))
  ])()
}

let mismatches = 0
for (let i = 0; i < cases; i++) {
  const s = seed
  const a = value(4)
  const b = random() < 0.5 ? a : value(4)
  const result = (m, a, b) => [
    m.Hash.hash(a),
    m.Equal.equals(a, b),
    m.Hash.hash(m.Exit.succeed(a)),
    m.Hash.hash(m.Cause.fail(a)),
    m.Hash.hash(m.Cause.die(a)),
    m.Equal.equals(m.Exit.succeed(a), m.Exit.succeed(b)),
    m.Equal.equals(m.Cause.fail(a), m.Cause.fail(b))
  ]
  const baseResult = result(base, a, b)
  seed = s
  const a2 = value(4)
  const b2 = random() < 0.5 ? a2 : value(4)
  const currentResult = result(current, a2, b2)
  if (baseResult.some((x, j) => x !== currentResult[j])) {
    mismatches++
    if (mismatches <= 5) console.log("mismatch", i, baseResult, currentResult)
  }
}
console.log(`${cases} cases, ${mismatches} mismatches`)
process.exitCode = mismatches === 0 ? 0 : 1
