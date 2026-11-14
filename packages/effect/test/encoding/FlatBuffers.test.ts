import { assert, describe, it } from "@effect/vitest"
import { throws } from "@effect/vitest/utils"
import { Result } from "effect"
import * as FlatBuffers from "effect/encoding/FlatBuffers"
import * as Hex from "effect/encoding/Hex"

const fromHex = (hex: string) => Result.getOrThrow(Hex.decode(hex))

// The expected bytes were written by the official FlatBuffers Python builder
// (`flatbuffers` 25.12.19 from PyPI) making the same calls as the builders below.
const MONSTER = "1c0000004d4f4e53140028001c0000001a00140010000c00080007001400000000000001200000004400000078000000" +
  "8000000000002c010000803f00000040000040400200000001000000020000000300000000000000ff000000feffffff" +
  "fdffffffffffffff00000000020000001c00000004000000f4ffffff000005001800000008000c000800060008000000" +
  "00000300040000000500000053776f7264000000050000000001020304000000030000004f726300"
const PREFIXED = "4c000000100000004142434408000c000800040008000000070000000400000028000000787878787878787878787878" +
  "7878787878787878787878787878787878787878787878787878787800000000"

// struct { a: byte; b: int; c: long }, as flatc-generated code writes it.
const addPadded = (b: FlatBuffers.Builder, a: number, x: number, y: bigint) => {
  b.prep(8, 16)
  b.addInt64(y)
  b.addInt32(x)
  b.pad(3)
  b.addInt8(a)
  return b.offset
}

const buildMonster = () => {
  const b = FlatBuffers.makeBuilder()
  const name = b.createString("Orc")
  const inventory = b.createBytes(Uint8Array.of(0, 1, 2, 3, 4))
  const weapons = [3, 5].map((damage) => {
    const sword = b.createSharedString("Sword")
    b.startTable(2)
    b.addFieldOffset(0, sword)
    b.addFieldInt16(1, damage)
    return b.endTable()
  })
  const weaponVector = b.createOffsetVector(weapons)
  b.startVector(16, 2, 8)
  addPadded(b, -1, -2, BigInt(-3))
  addPadded(b, 1, 2, BigInt(3))
  const path = b.endVector()
  b.startTable(8)
  b.prep(4, 12)
  b.addFloat32(3)
  b.addFloat32(2)
  b.addFloat32(1)
  b.addFieldStruct(0, b.offset)
  b.addFieldInt16(1, 100, 100)
  b.addFieldInt16(2, 300, 100)
  b.addFieldOffset(3, name)
  b.addFieldOffset(4, inventory)
  b.addFieldOffset(5, weaponVector)
  b.addFieldOffset(6, path)
  b.addFieldBool(7, true)
  return b.finish(b.endTable(), { identifier: "MONS" })
}

const buildPrefixed = () => {
  const b = FlatBuffers.makeBuilder({ initialSize: 1, forceDefaults: true })
  const s = b.createString("x".repeat(40))
  b.startTable(2)
  b.addFieldOffset(0, s)
  b.addFieldInt32(1, 7, 7)
  return b.finish(b.endTable(), { identifier: "ABCD", sizePrefixed: true })
}

const readMonster = (root: FlatBuffers.Table) => {
  const pos = root.struct(0, 12)
  const inventory = root.bytes(4)
  const weapons = root.vector(5, 4)
  const path = root.vector(6, 16)
  return {
    pos: pos && [pos.float32(0), pos.float32(4), pos.float32(8)],
    mana: [root.has(1), root.int16(1, 100)],
    hp: root.int16(2, 100),
    name: root.string(3),
    inventory: inventory && Array.from(inventory),
    weapons: weapons && Array.from({ length: weapons.length }, (_, i) => {
      const weapon = weapons.table(i)
      return [weapon.string(0), weapon.int16(1)]
    }),
    path: path && Array.from({ length: path.length }, (_, i) => {
      const s = path.struct(i)
      return [s.int8(0), s.int32(4), s.int64(8)]
    }),
    flag: root.bool(7)
  }
}

const usage = (f: () => unknown) =>
  throws(f, (error) => {
    assert.strictEqual(FlatBuffers.isFlatBuffersError(error) && error.kind, "Usage")
  })

describe("FlatBuffers", () => {
  it("builds the bytes the official builder builds", () => {
    assert.strictEqual(Hex.encode(buildMonster()), MONSTER)
    assert.strictEqual(Hex.encode(buildPrefixed()), PREFIXED)
  })

  it("reads the official builder's bytes", () => {
    const monster = fromHex(MONSTER)
    assert.strictEqual(FlatBuffers.identifier(monster), "MONS")
    assert.deepStrictEqual(readMonster(FlatBuffers.root(monster, { identifier: "MONS" })), {
      pos: [1, 2, 3],
      mana: [false, 100],
      hp: 300,
      name: "Orc",
      inventory: [0, 1, 2, 3, 4],
      weapons: [["Sword", 3], ["Sword", 5]],
      path: [[1, 2, BigInt(3)], [-1, -2, BigInt(-3)]],
      flag: true
    })

    const prefixed = fromHex(PREFIXED)
    assert.strictEqual(FlatBuffers.identifier(prefixed, { sizePrefixed: true }), "ABCD")
    const root = FlatBuffers.root(prefixed, { identifier: "ABCD", sizePrefixed: true })
    assert.strictEqual(root.string(0), "x".repeat(40))
    assert.isTrue(root.has(1))
    assert.strictEqual(root.int32(1), 7)
  })

  it("reads absent fields as their defaults", () => {
    const b = FlatBuffers.makeBuilder()
    b.startTable(1)
    const root = FlatBuffers.root(b.finish(b.endTable()))
    assert.strictEqual(root.int32(0, 7), 7)
    assert.strictEqual(root.string(0), undefined)
    assert.strictEqual(root.table(0), undefined)
    assert.strictEqual(root.vector(0, 1), undefined)
    // Slots past the vtable, as written by an older schema, are absent too.
    assert.strictEqual(root.float64(100, 1.5), 1.5)
  })

  it("decode returns a failure for malformed input", () => {
    const failure = (bytes: Uint8Array, options?: Parameters<typeof FlatBuffers.decode>[2]) => {
      const result = FlatBuffers.decode(bytes, (root) => root.string(0), options)
      return Result.isFailure(result) ? result.failure.kind : undefined
    }
    assert.strictEqual(failure(new Uint8Array(2)), "OutOfBounds")
    assert.strictEqual(failure(Uint8Array.of(0xff, 0xff, 0xff, 0x7f)), "OutOfBounds")
    // A vtable of size 1.
    assert.strictEqual(failure(Uint8Array.of(8, 0, 0, 0, 1, 0, 4, 0, 4, 0, 0, 0)), "InvalidVtable")
    // A string field with an invalid UTF-8 byte.
    const b = FlatBuffers.makeBuilder()
    const s = b.createString(Uint8Array.of(0xc3, 0x28))
    b.startTable(1)
    b.addFieldOffset(0, s)
    assert.strictEqual(failure(b.finish(b.endTable())), "InvalidUtf8")
    assert.strictEqual(failure(fromHex(MONSTER), { identifier: "NOPE" }), "Identifier")
    assert.strictEqual(failure(Uint8Array.of(0xff, 0, 0, 0, 0, 0, 0, 0), { sizePrefixed: true }), "OutOfBounds")
  })

  it("decode rethrows errors that aren't FlatBuffersErrors", () => {
    assert.throws(() =>
      FlatBuffers.decode(fromHex(MONSTER), () => {
        throw new Error("boom")
      }), "boom")
  })

  it("only fails with FlatBuffersError on truncated or corrupted buffers", () => {
    const monster = fromHex(MONSTER)
    for (let i = 0; i < monster.length; i++) {
      // Only the last byte, the NUL after "Orc", is not needed to read the buffer.
      if (i < monster.length - 1) {
        assert.isTrue(Result.isFailure(FlatBuffers.decode(monster.subarray(0, i), readMonster)), `truncated at ${i}`)
      }
      const corrupted = monster.slice()
      corrupted[i] ^= 0xff
      // decode rethrows anything that isn't a FlatBuffersError.
      FlatBuffers.decode(corrupted, readMonster)
    }
  })

  it("fails tables nested deeper than maxDepth", () => {
    const b = FlatBuffers.makeBuilder()
    let table = 0
    for (let i = 0; i < 65; i++) {
      b.startTable(1)
      b.addFieldOffset(0, table)
      table = b.endTable()
    }
    const bytes = b.finish(table)
    const depth = (t: FlatBuffers.Table): number => {
      const child = t.table(0)
      return child === undefined ? 1 : 1 + depth(child)
    }
    const result = FlatBuffers.decode(bytes, depth)
    assert.isTrue(Result.isFailure(result) && result.failure.kind === "Limit")
    assert.deepStrictEqual(FlatBuffers.decode(bytes, depth, { maxDepth: 65 }), Result.succeed(65))
  })

  it("throws for reads that don't match the shape asked for, even inside decode", () => {
    const monster = fromHex(MONSTER)
    const root = FlatBuffers.root(monster)
    usage(() => FlatBuffers.decode(monster, (root) => root.vector(4, 1)!.int32(0)))
    usage(() => root.vector(4, 0))
    usage(() => root.struct(0, 12)!.float32(12))
    usage(() => root.struct(0, 12)!.float32(-4))
    usage(() => root.struct(0, 12)!.float32(NaN))
    usage(() => root.int32(-1))
    usage(() => root.has(0.5))
    usage(() => FlatBuffers.decode(monster, (root) => root.has(0), { identifier: "TOOLONG" }))
  })

  it("keeps UTF-8 strings and identifiers intact, byte order mark included", () => {
    const b = FlatBuffers.makeBuilder()
    const s = b.createString("\ufeffhello")
    b.startTable(1)
    b.addFieldOffset(0, s)
    const bytes = b.finish(b.endTable(), { identifier: "\ufeffA" })
    assert.strictEqual(FlatBuffers.root(bytes).string(0), "\ufeffhello")
    assert.strictEqual(FlatBuffers.identifier(bytes), "\ufeffA")
  })

  it("forceDefaults writes scalar defaults but leaves absent references absent", () => {
    const b = FlatBuffers.makeBuilder({ forceDefaults: true })
    b.startTable(2)
    b.addFieldOffset(0, 0)
    b.addFieldInt32(1, 0)
    const root = FlatBuffers.root(b.finish(b.endTable()))
    assert.isFalse(root.has(0))
    assert.strictEqual(root.string(0), undefined)
    assert.isTrue(root.has(1))
  })

  it("Builder rejects misuse", () => {
    const builder = (f: (b: FlatBuffers.Builder) => void) => usage(() => f(FlatBuffers.makeBuilder()))
    builder((b) => {
      b.startTable(1)
      b.createString("x")
    })
    builder((b) => {
      b.startTable(1)
      b.startTable(1)
    })
    builder((b) => {
      b.startVector(1, 1, 1)
      b.startTable(1)
    })
    builder((b) => b.endTable())
    builder((b) => b.endVector())
    builder((b) => {
      b.startTable(1)
      b.addFieldInt32(1, 5)
    })
    builder((b) => b.addFieldInt32(0, 5))
    builder((b) => {
      b.addInt32(1)
      const s = b.offset
      b.addInt32(2)
      b.startTable(1)
      b.addFieldStruct(0, s)
    })
    builder((b) => {
      b.startTable(0)
      b.finish(b.endTable(), { identifier: "TOOLONG" })
    })
    builder((b) => b.addOffset(100))
    builder((b) => b.startTable(32766))
    builder((b) => {
      // 64 KiB of inline data is more than a vtable entry can address.
      b.startTable(1)
      b.pad(0x10000)
      b.addFieldInt32(0, 1)
      b.endTable()
    })
    builder((b) => {
      b.startTable(0)
      const table = b.endTable()
      b.finish(table)
      b.finish(table)
    })
    builder((b) => b.startVector(1, 1, 3))
    builder((b) => b.startVector(1, 1, 1.5))
    builder((b) => b.startVector(1, -1, 1))
    builder((b) => b.startVector(1, 0.5, 1))
    builder((b) => {
      b.startTable(1)
      b.addFieldInt32(0.5, 111)
    })
  })
})
