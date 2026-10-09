import * as RandomPool from "@effect/platform-node-shared/internal/randomPool"
import { assert, describe, it, vi } from "@effect/vitest"
import * as v8 from "node:v8"

const counting = () => {
  const fills: Array<number> = []
  let next = 0
  const randomBytes = RandomPool.make((bytes) => {
    fills.push(bytes.length)
    for (let i = 0; i < bytes.length; i++) bytes[i] = (next++ % 255) + 1
  })
  return { fills, randomBytes }
}

describe("RandomPool", () => {
  it("serves small requests from one native fill and returns fresh copies", () => {
    const { fills, randomBytes } = counting()
    const first = randomBytes(7)
    const second = randomBytes(7)
    assert.deepStrictEqual(fills, [4096])
    assert.deepStrictEqual(first, Uint8Array.of(1, 2, 3, 4, 5, 6, 7))
    assert.deepStrictEqual(second, Uint8Array.of(8, 9, 10, 11, 12, 13, 14))
    assert.strictEqual(first.buffer.byteLength, 7)
    first.fill(0)
    assert.deepStrictEqual(randomBytes(1), Uint8Array.of(15))
    assert.deepStrictEqual(randomBytes(0), new Uint8Array(0))
  })

  it("refills when the pool cannot satisfy a request", () => {
    const { fills, randomBytes } = counting()
    for (let i = 0; i < 16; i++) randomBytes(256)
    assert.deepStrictEqual(fills, [4096])
    randomBytes(1)
    assert.deepStrictEqual(fills, [4096, 4096])
  })

  it("fills large requests directly", () => {
    const { fills, randomBytes } = counting()
    assert.strictEqual(randomBytes(257).length, 257)
    assert.strictEqual(randomBytes(65_537).length, 65_537)
    assert.deepStrictEqual(fills, [257, 65_537])
  })

  it("discards the pool before a startup snapshot is serialized", () => {
    const callbacks: Array<() => void> = []
    const building = vi.spyOn(v8.startupSnapshot, "isBuildingSnapshot").mockReturnValue(true)
    const register = vi.spyOn(v8.startupSnapshot, "addSerializeCallback").mockImplementation((callback) => {
      callbacks.push(callback as () => void)
    })
    try {
      const { fills, randomBytes } = counting()
      randomBytes(7)
      assert.strictEqual(callbacks.length, 1)
      callbacks[0]()
      randomBytes(7)
      assert.deepStrictEqual(fills, [4096, 4096])
    } finally {
      building.mockRestore()
      register.mockRestore()
    }
  })

  it("loads when the runtime cannot report snapshot builds", () => {
    // Bun throws ERR_NOT_IMPLEMENTED from isBuildingSnapshot.
    const building = vi.spyOn(v8.startupSnapshot, "isBuildingSnapshot").mockImplementation(() => {
      throw new Error("not implemented")
    })
    try {
      const { randomBytes } = counting()
      assert.strictEqual(randomBytes(3).length, 3)
    } finally {
      building.mockRestore()
    }
  })
})
