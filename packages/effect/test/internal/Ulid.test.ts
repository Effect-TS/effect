import { assert, describe, it } from "@effect/vitest"
import * as Ulid from "effect/internal/ulid"
import * as Uuid from "effect/internal/uuid"

const randomness = () => Uint8Array.from({ length: 10 }, (_, i) => i)

describe("Ulid", () => {
  it("encodes ULID strings", () => {
    assert.strictEqual(Ulid.ulidString(0x0123456789ab, randomness()), "014D2PF2DB000G40R40M30E209")
  })

  it("accepts the minimum and maximum timestamps", () => {
    assert.strictEqual(Ulid.ulidString(0, new Uint8Array(10)), "00000000000000000000000000")
    assert.strictEqual(Ulid.ulidString(2 ** 48 - 1, new Uint8Array(10).fill(0xff)), "7ZZZZZZZZZZZZZZZZZZZZZZZZZ")
  })

  it.each([
    [-1, 0],
    [1.9, 1],
    [NaN, 0],
    [-Infinity, 0],
    [Infinity, 2 ** 48 - 1],
    [2 ** 48, 2 ** 48 - 1]
  ])("normalizes timestamp %s like UUIDv7", (timestamp, expectedTimestamp) => {
    const uuidTimestamp = Uuid.v7Bytes(timestamp, new Uint8Array(16))
      .subarray(0, 6)
      .reduce((value, byte) => value * 256 + byte, 0)

    assert.strictEqual(uuidTimestamp, expectedTimestamp)
    assert.strictEqual(Ulid.ulidString(timestamp, randomness()), Ulid.ulidString(uuidTimestamp, randomness()))
  })

  it("orders timestamps before randomness", () => {
    const earlier = Ulid.ulidString(1000, new Uint8Array(10).fill(0xff))
    const later = Ulid.ulidString(1001, new Uint8Array(10))

    assert.isTrue(earlier < later)
  })

  it("rejects randomness that is not 10 bytes", () => {
    for (const size of [0, 9, 11, 16]) {
      assert.throws(() => Ulid.ulidString(0, new Uint8Array(size)), /exactly 10 bytes/)
    }
  })
})
