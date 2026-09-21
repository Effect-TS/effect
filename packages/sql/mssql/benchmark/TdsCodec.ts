import { TokenParser } from "#tds/tdsToken"
import { strict as assert } from "node:assert"
import { Buffer } from "node:buffer"
import { createRequire } from "node:module"
import { performance } from "node:perf_hooks"

const require = createRequire(import.meta.url)
const { Parser } = require("tedious/lib/token/token-stream-parser.js")

// Same DONEPROC workload as tedious/benchmarks/token-parser/done-token.js.
// Both drivers consume identical chunks and invoke one callback per token.
const tokenCount = Number(process.env.TOKEN_COUNT ?? 10000)
const repeats = Number(process.env.REPEATS ?? 100)
const rounds = Number(process.env.BENCH_ROUNDS ?? 7)
for (const value of [tokenCount, repeats, rounds]) {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("Benchmark counts must be positive safe integers")
}
const data = Buffer.from("FE0000E0000000000000000000".repeat(tokenCount), "hex")
const fragment = Number(process.env.FRAGMENT_BYTES ?? data.length)
if (!Number.isSafeInteger(fragment) || fragment < 1) throw new Error("FRAGMENT_BYTES must be a positive safe integer")
const chunks: Array<Buffer> = []
for (let offset = 0; offset < data.length; offset += fragment) chunks.push(data.subarray(offset, offset + fragment))

const native = async () => {
  let count = 0
  const parser = new TokenParser()
  for (let i = 0; i < repeats; i++) for (const chunk of chunks) parser.push(chunk, () => count++)
  parser.end()
  assert.equal(count, tokenCount * repeats)
}

const tedious = () =>
  new Promise<void>((resolve, reject) => {
    let count = 0
    const input = (async function*() {
      for (let i = 0; i < repeats; i++) for (const chunk of chunks) yield chunk
    })()
    const parser = new Parser(input, { token() {} }, {
      onDoneProc() {
        count++
      }
    }, { tdsVersion: "7_4" })
    parser.parser.on("error", reject)
    parser.on("end", () => {
      try {
        assert.equal(count, tokenCount * repeats)
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  })

const measure = async (run: () => Promise<void>) => {
  const start = performance.now()
  await run()
  return tokenCount * repeats * 1000 / (performance.now() - start)
}
const median = (values: ReadonlyArray<number>) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]

await native()
await tedious()
const nativeRates: Array<number> = []
const tediousRates: Array<number> = []
const deltas: Array<number> = []
for (let i = 0; i < rounds; i++) {
  let n: number
  let t: number
  if (i % 2 === 0) {
    n = await measure(native)
    t = await measure(tedious)
  } else {
    t = await measure(tedious)
    n = await measure(native)
  }
  nativeRates.push(n)
  tediousRates.push(t)
  deltas.push((n / t - 1) * 100)
}
console.log(JSON.stringify({
  workload: "doneproc",
  node: process.version,
  tokenCount,
  repeats,
  fragment,
  rounds,
  nativeTokensPerSecond: median(nativeRates),
  tediousTokensPerSecond: median(tediousRates),
  medianPairedDeltaPercent: median(deltas),
  nativeRates,
  tediousRates
}))
