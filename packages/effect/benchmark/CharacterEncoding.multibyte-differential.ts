// Compare multibyte conversion behavior against an extracted source baseline.
import * as C from "effect/CharacterEncoding"
import * as All from "effect/encoding/All"
import { strict as assert } from "node:assert"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
const directory = process.env.ENCODING_BASELINE
if (!directory) throw new Error("Set ENCODING_BASELINE")
const base = (name: string) => pathToFileURL(resolve(directory, "packages/effect/src", name + ".ts")).href
const B = await import(base("CharacterEncoding"))
const BA = await import(base("encoding/All"))
let checks = 0, seed = 123456789
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return seed
}
const check = (a: unknown, b: unknown, label: string) => {
  assert.deepEqual(a, b, label)
  checks++
}
const outcome = (f: () => unknown) => {
  try {
    return { value: f() }
  } catch {
    return { failed: true }
  }
}
for (const name of ["shiftjis", "cp936", "cp949", "cp950", "gbk", "gb18030", "eucjp", "big5hkscs"]) {
  const current = All.resolveUnsafe(name), baseline = BA.resolveUnsafe(name)
  // Every two-byte input in isolation, including undefined byte combinations.
  for (let pair = 0; pair < 65536; pair++) {
    const input = Uint8Array.of(pair >>> 8, pair & 255)
    check(C.decodeUnsafe(input, current), B.decodeUnsafe(input, baseline), name + ":pair:" + pair)
  }
  for (let offset = 0; offset < 65536; offset += 256) {
    const text = String.fromCharCode(...Array.from({ length: 256 }, (_, i) => offset + i))
    check(C.encodeUnsafe(text, current), B.encodeUnsafe(text, baseline), name + ":bmp:" + offset)
  }
  for (let i = 0; i < 1000; i++) {
    const input = Uint8Array.from({ length: 1 + random() % 64 }, () => random() >>> 24)
    const cut = random() % (input.length + 1)
    for (const fatal of [false, true]) {
      const decode = (api: typeof C, codec: C.Encoding) => {
        const decoder = api.makeDecoderUnsafe(codec, { fatal })
        return decoder.write(input.subarray(0, cut)) + decoder.write(input.subarray(cut)) + decoder.end()
      }
      check(outcome(() => decode(C, current)), outcome(() => decode(B, baseline)), name + ":random:" + i)
    }
  }
}
console.log({ checks, status: "pass" })
