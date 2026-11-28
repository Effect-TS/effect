// Plain-JS variant of run-case.ts for the bundled cases, so no TypeScript loader is active:
// node|bun hill-climb-tools/run-case.mjs "<case name substring>" [ms]
const { cases } = await import(new URL(`../${process.env.HC_OUT ?? "tmp/hc"}/cases.js`, import.meta.url).href)
const name = process.argv[2]
const ms = Number(process.argv[3] ?? 2000)
const c = cases.find((c) => c.name.includes(name))
const inst = await c.make()
const start = performance.now()
let n = 0
while (performance.now() - start < ms) {
  const r = inst.run()
  if (r instanceof Promise) await r
  n++
}
console.log(c.name, ((performance.now() - start) * 1e6 / (n * c.operations)).toFixed(1), "ns/op")
await inst.dispose?.()
