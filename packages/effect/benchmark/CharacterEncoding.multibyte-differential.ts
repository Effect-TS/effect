// Compare multibyte conversion behavior against an extracted source baseline.
import * as C from "effect/CharacterEncoding"
import * as Big5Hkscs from "effect/encoding/Big5Hkscs"
import * as Cp936 from "effect/encoding/Cp936"
import * as Cp949 from "effect/encoding/Cp949"
import * as Cp950 from "effect/encoding/Cp950"
import * as EucJp from "effect/encoding/EucJp"
import * as Gb18030 from "effect/encoding/Gb18030"
import * as Gbk from "effect/encoding/Gbk"
import * as ShiftJis from "effect/encoding/ShiftJis"
import { strict as assert } from "node:assert"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
const directory = process.env.ENCODING_BASELINE
if (!directory) throw new Error("Set ENCODING_BASELINE")
const base = (name: string) => pathToFileURL(resolve(directory, "packages/effect/src", name + ".ts")).href
const B = await import(base("CharacterEncoding"))
// The baseline snapshot still exposes a label registry; the current source uses explicit codec modules.
const BA = await import(base("encoding/All"))
const codecs = {
  shiftjis: ShiftJis.encoding,
  cp936: Cp936.encoding,
  cp949: Cp949.encoding,
  cp950: Cp950.encoding,
  gbk: Gbk.encoding,
  gb18030: Gb18030.encoding,
  eucjp: EucJp.encoding,
  big5hkscs: Big5Hkscs.encoding
} as const
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
for (const [name, current] of Object.entries(codecs)) {
  const baseline = BA.resolveUnsafe(name)
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
