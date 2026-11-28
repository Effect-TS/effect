// Alternates short runs of two prebuilt case bundles (build-cases.mjs HC_OUT dirs) and
// prints the fastest and the median ns/op of each. On a machine shared with other work
// the fastest run is the one least disturbed, so `min A/B` is the steadier ratio; above 1
// means B is faster.
//   [PIN=<cpu>] node hill-climb-tools/abmin.mjs A_DIR B_DIR "case,case" [runs] [ms] [hosts]
import { spawnSync } from "node:child_process"

const [a, b, cases, runs = "9", ms = "400", hosts = "node,bun"] = process.argv.slice(2)
const runner = new URL("run-case.mjs", import.meta.url).pathname

// PIN="3" runs every process on that CPU with taskset, so other work on the machine moves less
const pin = process.env.PIN
const run = (host, dir, name) => {
  const [cmd, args] = pin ? ["taskset", ["-c", pin, host, runner, name, ms]] : [host, [runner, name, ms]]
  const out = spawnSync(cmd, args, { env: { ...process.env, HC_OUT: dir }, encoding: "utf8" }).stdout
  return Number(out.trim().split(" ").at(-2))
}
const median = (values) => values.toSorted((x, y) => x - y)[values.length >> 1]

for (const name of cases.split(",")) {
  for (const host of hosts.split(",")) {
    const as = []
    const bs = []
    for (let i = 0; i < Number(runs); i++) {
      // Swap the order every pair so neither side always runs first
      if (i % 2 === 0) {
        as.push(run(host, a, name))
        bs.push(run(host, b, name))
      } else {
        bs.push(run(host, b, name))
        as.push(run(host, a, name))
      }
    }
    const minA = Math.min(...as)
    const minB = Math.min(...bs)
    console.log(
      `${host.padEnd(5)} ${name.padEnd(18)} min A ${minA.toFixed(1).padStart(8)} B ${minB.toFixed(1).padStart(8)} ` +
        `A/B ${(minA / minB).toFixed(3)} | median A ${median(as).toFixed(1).padStart(8)} B ${
          median(bs).toFixed(1).padStart(8)
        } A/B ${(median(as) / median(bs)).toFixed(3)}`
    )
  }
}
