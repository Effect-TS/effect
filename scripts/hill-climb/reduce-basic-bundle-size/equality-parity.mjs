// Checks that Equal.equals on Context and Cause, the [Equal.symbol] methods called directly, and Cause hashes
// give the same results in two copies of effect, on random contexts and causes built from a small value pool
// (shared and copied objects, functions, maps, NaN, dates), including reordered entries.
// usage: node scripts/hill-climb/reduce-basic-bundle-size/equality-parity.mjs <base effect dist> <current effect dist>
import { pathToFileURL } from "node:url"
import * as Path from "node:path"
const load = async (dir) => {
  const u = (n) => pathToFileURL(Path.resolve(dir, n + ".js")).href
  return { Equal: await import(u("Equal")), Context: await import(u("Context")), Cause: await import(u("Cause")), Hash: await import(u("Hash")) }
}
const run = (M) => {
  const fn = () => 1
  const svc = { a: 1, f: fn }
  const values = [1, "x", { n: 1 }, { n: 2 }, [1, 2], svc, { ...svc }, { a: 1, f: () => 1 }, new Map([[1, { x: 1 }]]), NaN, undefined, null, new Date(0)]
  const ctx = (pairs) => M.Context.makeUnsafe(new Map(pairs))
  const out = []
  let seed = 7
  const rnd = (n) => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n
  for (let i = 0; i < 3000; i++) {
    const n = rnd(3), m = rnd(2) ? n : rnd(3)
    const left = Array.from({ length: n }, (_, j) => ["k" + rnd(2), values[rnd(4) === 0 ? rnd(values.length) : rnd(3)]])
    const right = rnd(4) === 0 ? left.slice().reverse() : Array.from({ length: m }, (_, j) => ["k" + rnd(2), values[rnd(4) === 0 ? rnd(values.length) : rnd(3)]])
    const l = ctx(left), r = ctx(right)
    out.push(M.Equal.equals(l, r), l[M.Equal.symbol](r), M.Equal.equals([l], [r]))
    const reasons = (xs) => M.Cause.fromReasons(xs.map(([k, v]) => k === "k0" ? M.Cause.makeFailReason(v) : M.Cause.makeDieReason(v)))
    const cl = reasons(left), cr = reasons(right)
    out.push(M.Equal.equals(cl, cr), cl[M.Equal.symbol](cr), M.Hash.hash(cl) === M.Hash.hash(cr))
  }
  return out
}
const [base, cur] = [await load(process.argv[2]), await load(process.argv[3])]
const a = run(base), b = run(cur)
let mismatches = 0
for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) mismatches++
console.log(a.length + " comparisons, " + mismatches + " mismatches, " + a.filter(Boolean).length + " true")
