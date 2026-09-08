import * as C from "effect/CharacterEncoding"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import type * as IconvLite from "iconv-lite"
import { strict as assert } from "node:assert"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import { performance } from "node:perf_hooks"
import { Readable } from "node:stream"

// Install benchmark-only native bindings outside the workspace:
// npm install --prefix /tmp/encoding-bench iconv@3.0.1 iconv-lite@0.7.3
// ICONV_BENCH_ROOT=/tmp/encoding-bench node packages/effect/benchmark/CharacterEncoding.ts
const require = createRequire(resolve(process.env.ICONV_BENCH_ROOT ?? "/tmp/encoding-bench", "package.json"))
const iconvPath = process.env.ICONV_LITE_PATH ?? "iconv-lite"
const iconv = require(iconvPath) as typeof IconvLite
const Native = require("iconv").Iconv
const rounds = Number(process.env.BENCH_ROUNDS ?? 5)
const duration = Number(process.env.BENCH_DURATION_MS ?? 150)
const size = Number(process.env.BENCH_SIZE ?? 65536)
const chunkSize = Number(process.env.BENCH_CHUNK_SIZE ?? 4093)
for (const value of [rounds, duration, size, chunkSize]) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error("Benchmark settings must be positive integers")
}
const median = (xs: ReadonlyArray<number>) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
let consumed = 0
const measure = async (run: () => unknown, async: boolean, milliseconds: number, inputBytes: number) => {
  const start = performance.now()
  let operations = 0
  if (async) {
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
  return operations * inputBytes / (performance.now() - start) * 1000 / 1024 / 1024
}

const nodeStream = (
  input: ReadonlyArray<Buffer>,
  converters: ReadonlyArray<NodeJS.ReadWriteStream>,
  collect = false
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const source = Readable.from(input, { objectMode: false })
    const all: Array<NodeJS.ReadableStream> = [source, ...converters]
    const fail = (error: Error) => {
      source.destroy()
      for (const converter of converters) (converter as NodeJS.ReadWriteStream & { destroy?: () => void }).destroy?.()
      reject(error)
    }
    for (const stream of all) stream.on("error", fail)
    let output: NodeJS.ReadableStream = source
    for (const converter of converters) output = output.pipe(converter)
    const chunks: Array<Buffer> = []
    output.on("data", (chunk: Buffer) => {
      consumed += chunk.length
      if (collect) chunks.push(Buffer.from(chunk))
    })
    output.on("end", () => resolve(Buffer.concat(chunks)))
  })

const compare = async (workload: string, inputBytes: number, async: boolean, runs: ReadonlyArray<() => unknown>) => {
  const providers = ["effect", "iconv-lite", "node-iconv"]
  const samples: Array<Array<number>> = [[], [], []]
  for (const run of runs) await measure(run, async, 100, inputBytes)
  for (let round = 0; round < rounds; round++) {
    for (let step = 0; step < 3; step++) {
      const index = (round + step) % 3
      samples[index].push(await measure(runs[index], async, duration, inputBytes))
    }
  }
  console.log(JSON.stringify({
    workload,
    inputBytes,
    mibPerSecond: Object.fromEntries(providers.map((name, i) => [name, median(samples[i])])),
    pairedEffectVsIconvLitePercent: median(samples[0].map((rate, i) => (rate / samples[1][i] - 1) * 100)),
    samples: Object.fromEntries(providers.map((name, i) => [name, samples[i]]))
  }))
}

console.log(JSON.stringify({
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  iconvLite: require(iconvPath + "/package.json").version,
  nodeIconv: require("iconv/package.json").version,
  rounds,
  duration,
  size,
  chunkSize
}))

for (
  const [encoding, phrase] of [
    ["utf8", "Hello λ 😀 漢字! "],
    ["utf16le", "Hello λ 😀 漢字! "],
    ["cp1251", "Привет мир! "],
    ["cp932", "こんにちは世界！ "],
    ["gb18030", "你好世界 😀 "]
  ]
) {
  const text = phrase.repeat(Math.ceil(size / Buffer.byteLength(phrase)))
  const input = iconv.encode(text, encoding)
  const encodeNative = new Native("UTF-8", encoding)
  const decodeNative = new Native(encoding, "UTF-8")
  assert.deepEqual(C.encodeUnsafe(text, encoding), Uint8Array.from(input))
  assert.deepEqual(encodeNative.convert(text), input)
  assert.equal(C.decodeUnsafe(input, encoding), text)
  assert.equal(decodeNative.convert(input).toString("utf8"), text)
  await compare(`${encoding}/encode`, Buffer.byteLength(text), false, [
    () => C.encodeUnsafe(text, encoding),
    () => iconv.encode(text, encoding),
    () => encodeNative.convert(text)
  ])
  await compare(`${encoding}/decode`, input.length, false, [
    () => C.decodeUnsafe(input, encoding),
    () => iconv.decode(input, encoding),
    () => decodeNative.convert(input).toString("utf8")
  ])

  if (encoding === "utf16le" || encoding === "gb18030") continue
  const chunks: Array<Buffer> = []
  for (let i = 0; i < input.length; i += chunkSize) chunks.push(input.subarray(i, i + chunkSize))
  const target = encoding === "utf8" ? "utf16le" : "utf8"
  const expected = iconv.encode(text, target)
  const converted = Stream.fromIterable(chunks).pipe(C.transcodeStream(encoding, target))
  const collected = await Effect.runPromise(Stream.runCollect(converted))
  assert.deepEqual(Buffer.concat(collected), expected)
  assert.deepEqual(await nodeStream(chunks, [iconv.decodeStream(encoding), iconv.encodeStream(target)], true), expected)
  assert.deepEqual(await nodeStream(chunks, [new Native(encoding, target)], true), expected)
  await compare(`${encoding}->${target}/stream`, input.length, true, [
    () =>
      Effect.runPromise(Stream.runForEach(converted, (chunk) =>
        Effect.sync(() => {
          consumed += chunk.length
        }))),
    () => nodeStream(chunks, [iconv.decodeStream(encoding), iconv.encodeStream(target)]),
    () => nodeStream(chunks, [new Native(encoding, target)])
  ])
}
if (!Number.isFinite(consumed)) throw new Error("Invalid benchmark consumption count")
