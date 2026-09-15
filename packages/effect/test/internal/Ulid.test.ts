import { assert, describe, it } from "@effect/vitest"
import * as Ulid from "effect/internal/ulid"

const randomness = () => Uint8Array.from({ length: 10 }, (_, i) => i)

describe("Ulid", () => {
  it("encodes ULID strings", () => {
    assert.strictEqual(Ulid.ulidString(0x0123456789ab, randomness()), "014D2PF2DB000G40R40M30E209")
    assert.strictEqual(Ulid.ulidString(0, new Uint8Array(10)), "00000000000000000000000000")
    assert.strictEqual(Ulid.ulidString(2 ** 48 - 1, new Uint8Array(10).fill(0xff)), "7ZZZZZZZZZZZZZZZZZZZZZZZZZ")
  })

  it("rejects randomness that is not 10 bytes", () => {
    for (const size of [0, 9, 11, 16]) {
      assert.throws(() => Ulid.ulidString(0, new Uint8Array(size)), /exactly 10 bytes/)
    }
  })
})
