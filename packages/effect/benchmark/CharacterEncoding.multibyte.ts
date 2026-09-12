// Before/after codec benchmarks. Snapshot the pre-optimization source with:
// git archive 4ad6253ca packages/effect/src | tar -x -C /path/to/baseline
// ENCODING_BASELINE=/path/to/baseline node packages/effect/benchmark/CharacterEncoding.multibyte.ts
import * as C from "effect/CharacterEncoding"
import * as Effect from "effect/Effect"
import * as All from "effect/encoding/All"
import * as Stream from "effect/Stream"
import { strict as assert } from "node:assert"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

const directory = process.env.ENCODING_BASELINE
if (!directory) throw new Error("Set ENCODING_BASELINE to the extracted baseline source")
const base = (name: string) => pathToFileURL(resolve(directory, "packages/effect/src", name + ".ts")).href
const B: typeof C = await import(base("CharacterEncoding"))
const BE: typeof Effect = await import(base("Effect"))
const BA: typeof All = await import(base("encoding/All"))
const BS: typeof Stream = await import(base("Stream"))
const rounds = Number(process.env.BENCH_ROUNDS ?? 5)
const duration = Number(process.env.BENCH_DURATION_MS ?? 150)
const size = Number(process.env.BENCH_SIZE ?? 65536)
const chunkSize = Number(process.env.BENCH_CHUNK_SIZE ?? 4093)
const filter = process.env.BENCH_FILTER ? new RegExp(process.env.BENCH_FILTER) : undefined
const median = (xs: ReadonlyArray<number>) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
let consumed = 0
const measure = async (run: () => unknown, asynchronous: boolean, milliseconds: number, inputBytes: number) => {
  const start = performance.now()
  let operations = 0
  if (asynchronous) {
    do {
      await run()
      operations++
    } while (performance.now() - start < milliseconds)
  } else {
    do {
      const output = run() as { length: number }
      consumed += output.length
      operations++
    } while (performance.now() - start < milliseconds)
  }
  return operations * inputBytes / (performance.now() - start) * 1000 / 1048576
}
const compare = async (
  workload: string,
  inputBytes: number,
  asynchronous: boolean,
  before: () => unknown,
  after: () => unknown
) => {
  if (filter && !filter.test(workload)) return
  const runs = [before, after]
  const samples: Array<Array<number>> = [[], []]
  for (const run of runs) await measure(run, asynchronous, 250, inputBytes)
  for (let round = 0; round < rounds; round++) {
    for (let step = 0; step < 2; step++) {
      const index = (round + step) % 2
      samples[index].push(await measure(runs[index], asynchronous, duration, inputBytes))
    }
  }
  console.log(
    JSON.stringify({
      workload,
      inputBytes,
      before: median(samples[0]),
      after: median(samples[1]),
      pairedPercent: median(samples[1].map((rate, i) => (rate / samples[0][i] - 1) * 100)),
      samples
    })
  )
}
console.log(
  JSON.stringify({
    versions: process.versions,
    platform: process.platform,
    arch: process.arch,
    nativeBuffer: "Buffer" in globalThis,
    rounds,
    duration,
    size,
    chunkSize,
    baseline: process.env.ENCODING_BASELINE_REV ?? "4ad6253ca"
  })
)

for (
  const [name, phrase] of [
    ["utf8", "Hello λ 😀 漢字! "],
    ["utf16le", "Hello λ 😀 漢字! "],
    ["cp932", "こんにちは世界！ "],
    ["cp932-ascii", "Plain ASCII text 0123456789! "],
    ["gb18030", "你好世界 😀 "],
    ["big5hkscs", "漢字中文 "]
  ]
) {
  const encoding = name === "cp932-ascii" ? "cp932" : name
  const text = phrase.repeat(Math.ceil(size / new TextEncoder().encode(phrase).length))
  const current = All.resolveUnsafe(encoding), baseline = BA.resolveUnsafe(encoding)
  const input = B.encodeUnsafe(text, baseline)
  assert.deepEqual(C.encodeUnsafe(text, current), input)
  assert.equal(C.decodeUnsafe(input, current), B.decodeUnsafe(input, baseline))
  await compare(
    name + "/encode",
    new TextEncoder().encode(text).length,
    false,
    () => B.encodeUnsafe(text, baseline),
    () => C.encodeUnsafe(text, current)
  )
  if (encoding === "utf16le") {
    const scan = (bytes: Uint8Array) => {
      let checksum = 0
      for (let i = 0; i < bytes.length; i++) checksum = (checksum + bytes[i]) >>> 0
      return { length: checksum }
    }
    await compare(
      "utf16le/encode+checksum",
      new TextEncoder().encode(text).length,
      false,
      () => scan(B.encodeUnsafe(text, baseline)),
      () => scan(C.encodeUnsafe(text, current))
    )
  }
  if (encoding !== "utf16le" && encoding !== "utf8") {
    await compare(
      name + "/decode",
      input.length,
      false,
      () => B.decodeUnsafe(input, baseline),
      () => C.decodeUnsafe(input, current)
    )
  }
}
for (
  const [from, to, phrase] of [["utf8", "utf16le", "Hello λ 😀 漢字! "], ["cp1251", "utf8", "Привет мир! "], [
    "cp932",
    "utf8",
    "こんにちは世界！ "
  ]]
) {
  const text = phrase.repeat(Math.ceil(size / new TextEncoder().encode(phrase).length))
  const bf = BA.resolveUnsafe(from), bt = BA.resolveUnsafe(to)
  const cf = All.resolveUnsafe(from), ct = All.resolveUnsafe(to)
  const input = B.encodeUnsafe(text, bf)
  const chunks: Array<Uint8Array> = []
  for (let i = 0; i < input.length; i += chunkSize) chunks.push(input.subarray(i, i + chunkSize))
  const before = BS.fromIterable(chunks).pipe(B.transcodeStream(bf, bt))
  const after = Stream.fromIterable(chunks).pipe(C.transcodeStream(cf, ct))
  const collect = (parts: ReadonlyArray<Uint8Array>) => {
    const result = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
    let offset = 0
    for (const part of parts) {
      result.set(part, offset)
      offset += part.length
    }
    return result
  }
  assert.deepEqual(
    collect(await Effect.runPromise(Stream.runCollect(after))),
    collect(await BE.runPromise(BS.runCollect(before)))
  )
  await compare(
    from + "->" + to + "/stream",
    input.length,
    true,
    () =>
      BE.runPromise(BS.runForEach(before, (chunk) =>
        BE.sync(() => {
          consumed += chunk.length
        }))),
    () =>
      Effect.runPromise(Stream.runForEach(after, (chunk) =>
        Effect.sync(() => {
          consumed += chunk.length
        })))
  )
}
assert.ok(Number.isFinite(consumed) && consumed > 0)
