import { assert, it } from "@effect/vitest"
import { Crypto, Effect } from "effect"

const make = (fraction: bigint) => Crypto.make({
  randomBytes: () => Uint8Array.of(
    Number((fraction >> 48n) & 0x1fn),
    Number((fraction >> 40n) & 0xffn),
    Number((fraction >> 32n) & 0xffn),
    Number((fraction >> 24n) & 0xffn),
    Number((fraction >> 16n) & 0xffn),
    Number((fraction >> 8n) & 0xffn),
    Number(fraction & 0xffn)
  ),
  digest: (_algorithm, data) => Effect.succeed(data)
})

it("maps adjacent 53-bit fractions to adjacent safe integers", () => {
  assert.strictEqual(make(0n).nextIntUnsafe(), Number.MIN_SAFE_INTEGER)
  assert.strictEqual(make(1n).nextIntUnsafe(), Number.MIN_SAFE_INTEGER + 1)
})
