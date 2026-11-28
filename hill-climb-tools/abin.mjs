// In-process A/B: loads two case bundles (build-cases.mjs HC_OUT dirs) into one
// process and alternates short slices of each, so both see the same machine load
// at a fine grain. Prints the median and fastest slice of each side; A/B above 1
// means B is faster.
//   node|bun hill-climb-tools/abin.mjs A_DIR B_DIR "case,case" [slices] [ms]
const [a, b, names, slices = "40", ms = "50"] = process.argv.slice(2)
const load = async (dir) => (await import(new URL(`../${dir}/cases.js`, import.meta.url).href)).cases
const [casesA, casesB] = await Promise.all([load(a), load(b)])
const slice = async (inst, c, budget) => {
  const start = performance.now()
  let n = 0
  while (performance.now() - start < budget) {
    const r = inst.run()
    if (r instanceof Promise) await r
    n++
  }
  return ((performance.now() - start) * 1e6) / (n * c.operations)
}
const median = (values) => values.toSorted((x, y) => x - y)[values.length >> 1]
for (const name of names.split(",")) {
  const ca = casesA.find((c) => c.name.includes(name))
  const cb = casesB.find((c) => c.name.includes(name))
  const [ia, ib] = [await ca.make(), await cb.make()]
  // Warm both sides before measuring
  await slice(ia, ca, 300)
  await slice(ib, cb, 300)
  const as = []
  const bs = []
  for (let i = 0; i < Number(slices); i++) {
    if (i % 2 === 0) {
      as.push(await slice(ia, ca, Number(ms)))
      bs.push(await slice(ib, cb, Number(ms)))
    } else {
      bs.push(await slice(ib, cb, Number(ms)))
      as.push(await slice(ia, ca, Number(ms)))
    }
  }
  await ia.dispose?.()
  await ib.dispose?.()
  const [ma, mb] = [median(as), median(bs)]
  const [na, nb] = [Math.min(...as), Math.min(...bs)]
  console.log(
    `${(typeof Bun === "undefined" ? "node" : "bun").padEnd(5)} ${ca.name.slice(0, 24).padEnd(24)} median A ${ma.toFixed(1).padStart(8)} B ${mb.toFixed(1).padStart(8)} A/B ${(ma / mb).toFixed(3)} | min A/B ${(na / nb).toFixed(3)}`
  )
}
