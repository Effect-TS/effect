import { assert, describe, it } from "@effect/vitest"
import { Result } from "effect"
import * as FlatBuffers from "effect/encoding/FlatBuffers"
import { readFileSync } from "node:fs"

// Expected bytes were written by the official FlatBuffers Python builder;
// see fixtures/flatbuffers/README.md
type ScalarType =
  | "bool"
  | "int8"
  | "uint8"
  | "int16"
  | "uint16"
  | "int32"
  | "uint32"
  | "int64"
  | "uint64"
  | "float32"
  | "float64"
type Scalar = boolean | number | string
interface StructDef {
  readonly size: number
  readonly align: number
  readonly fields: ReadonlyArray<{ readonly type: ScalarType; readonly offset: number }>
}
type Field =
  | {
    readonly slot: number
    readonly kind: "scalar"
    readonly type: ScalarType
    readonly value: Scalar
    readonly default: Scalar
  }
  | { readonly slot: number; readonly kind: "offset"; readonly ref: string }
  | {
    readonly slot: number
    readonly kind: "struct"
    readonly struct: StructDef
    readonly value: ReadonlyArray<Scalar>
  }
type Op =
  | { readonly op: "string" | "sharedString"; readonly ref: string; readonly value: string }
  | { readonly op: "bytes"; readonly ref: string; readonly value: ReadonlyArray<number> }
  | { readonly op: "vector"; readonly ref: string; readonly type: ScalarType; readonly values: ReadonlyArray<Scalar> }
  | { readonly op: "offsets"; readonly ref: string; readonly refs: ReadonlyArray<string> }
  | {
    readonly op: "structs"
    readonly ref: string
    readonly struct: StructDef
    readonly items: ReadonlyArray<ReadonlyArray<Scalar>>
  }
  | { readonly op: "table"; readonly ref: string; readonly slots: number; readonly fields: ReadonlyArray<Field> }
interface Case {
  readonly id: string
  readonly ops: ReadonlyArray<Op>
  readonly finish: { readonly root: string; readonly identifier?: string; readonly sizePrefixed?: boolean }
  readonly forceDefaults?: boolean
  readonly initialSize?: number
  readonly bytes: string
}

const gold: { readonly cases: ReadonlyArray<Case> } = JSON.parse(
  readFileSync(new URL("../fixtures/flatbuffers/gold.json", import.meta.url), "utf8")
)

const fromHex = (hex: string) => Uint8Array.from(hex.match(/../g) ?? [], (b) => parseInt(b, 16))
const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")

const SIZE: Record<ScalarType, number> = {
  bool: 1,
  int8: 1,
  uint8: 1,
  int16: 2,
  uint16: 2,
  int32: 4,
  uint32: 4,
  int64: 8,
  uint64: 8,
  float32: 4,
  float64: 8
}

const value = (type: ScalarType, v: Scalar): boolean | number | bigint =>
  type === "int64" || type === "uint64" ? BigInt(v as string) : typeof v === "string" ? Number(v) : v

/** The value as the buffer stores it: integers wrap, float32 rounds. */
const stored = (type: ScalarType, v: Scalar): boolean | number | bigint => {
  const x = value(type, v)
  return type === "float32" ? Math.fround(x as number) : x
}

const add = (b: FlatBuffers.Builder, type: ScalarType, v: Scalar) => {
  const x = value(type, v)
  switch (type) {
    case "bool":
      return b.addBool(x as boolean)
    case "int8":
      return b.addInt8(x as number)
    case "uint8":
      return b.addUint8(x as number)
    case "int16":
      return b.addInt16(x as number)
    case "uint16":
      return b.addUint16(x as number)
    case "int32":
      return b.addInt32(x as number)
    case "uint32":
      return b.addUint32(x as number)
    case "int64":
      return b.addInt64(x as bigint)
    case "uint64":
      return b.addUint64(x as bigint)
    case "float32":
      return b.addFloat32(x as number)
    case "float64":
      return b.addFloat64(x as number)
  }
}

const addField = (b: FlatBuffers.Builder, slot: number, type: ScalarType, v: Scalar, d: Scalar) => {
  const x = value(type, v)
  const fallback = value(type, d)
  switch (type) {
    case "bool":
      return b.addFieldBool(slot, x as boolean, fallback as boolean)
    case "int8":
      return b.addFieldInt8(slot, x as number, fallback as number)
    case "uint8":
      return b.addFieldUint8(slot, x as number, fallback as number)
    case "int16":
      return b.addFieldInt16(slot, x as number, fallback as number)
    case "uint16":
      return b.addFieldUint16(slot, x as number, fallback as number)
    case "int32":
      return b.addFieldInt32(slot, x as number, fallback as number)
    case "uint32":
      return b.addFieldUint32(slot, x as number, fallback as number)
    case "int64":
      return b.addFieldInt64(slot, x as bigint, fallback as bigint)
    case "uint64":
      return b.addFieldUint64(slot, x as bigint, fallback as bigint)
    case "float32":
      return b.addFieldFloat32(slot, x as number, fallback as number)
    case "float64":
      return b.addFieldFloat64(slot, x as number, fallback as number)
  }
}

/** Writes a struct the way flatc-generated code does: prep, then fields last to first with padding. */
const writeStruct = (b: FlatBuffers.Builder, def: StructDef, values: ReadonlyArray<Scalar>) => {
  b.prep(def.align, def.size)
  let end = def.size
  for (let i = def.fields.length - 1; i >= 0; i--) {
    const field = def.fields[i]
    b.pad(end - (field.offset + SIZE[field.type]))
    add(b, field.type, values[i])
    end = field.offset
  }
  b.pad(end)
  return b.offset
}

const build = (c: Case): Uint8Array => {
  const b = FlatBuffers.make({ initialSize: c.initialSize, forceDefaults: c.forceDefaults })
  const refs = new Map<string, FlatBuffers.Offset>()
  const ref = (name: string) => refs.get(name)!
  for (const op of c.ops) {
    switch (op.op) {
      case "string":
        refs.set(op.ref, b.createString(op.value))
        break
      case "sharedString":
        refs.set(op.ref, b.createSharedString(op.value))
        break
      case "bytes":
        refs.set(op.ref, b.createBytes(Uint8Array.from(op.value)))
        break
      case "vector": {
        const size = SIZE[op.type]
        b.startVector(size, op.values.length, size)
        for (let i = op.values.length - 1; i >= 0; i--) add(b, op.type, op.values[i])
        refs.set(op.ref, b.endVector())
        break
      }
      case "offsets":
        refs.set(op.ref, b.createOffsetVector(op.refs.map(ref)))
        break
      case "structs":
        b.startVector(op.struct.size, op.items.length, op.struct.align)
        for (let i = op.items.length - 1; i >= 0; i--) writeStruct(b, op.struct, op.items[i])
        refs.set(op.ref, b.endVector())
        break
      case "table":
        b.startTable(op.slots)
        for (const field of op.fields) {
          switch (field.kind) {
            case "scalar":
              addField(b, field.slot, field.type, field.value, field.default)
              break
            case "offset":
              b.addFieldOffset(field.slot, ref(field.ref))
              break
            case "struct":
              b.addFieldStruct(field.slot, writeStruct(b, field.struct, field.value))
              break
          }
        }
        refs.set(op.ref, b.endTable())
        break
    }
  }
  return b.finish(ref(c.finish.root), c.finish)
}

const readScalar = (
  reader: Pick<FlatBuffers.Struct, ScalarType>,
  type: ScalarType,
  at: number
): boolean | number | bigint => reader[type](at)

const readTableScalar = (table: FlatBuffers.Table, type: ScalarType, slot: number, fallback: Scalar) => {
  const d = value(type, fallback)
  switch (type) {
    case "bool":
      return table.bool(slot, d as boolean)
    case "int64":
      return table.int64(slot, d as bigint)
    case "uint64":
      return table.uint64(slot, d as bigint)
    default:
      return table[type](slot, d as number)
  }
}

const defined = <A>(a: A | undefined): A => {
  assert.isDefined(a)
  return a!
}

const checkStruct = (s: FlatBuffers.Struct, def: StructDef, values: ReadonlyArray<Scalar>) => {
  def.fields.forEach((field, i) =>
    assert.deepStrictEqual(readScalar(s, field.type, field.offset), stored(field.type, values[i]))
  )
}

/** Reads every value the case wrote back from the buffer. */
const verify = (c: Case, bytes: Uint8Array) => {
  const ops = new Map(c.ops.map((op) => [op.ref, op]))
  const checkTable = (table: FlatBuffers.Table, op: Extract<Op, { op: "table" }>) => {
    for (const field of op.fields) {
      switch (field.kind) {
        case "scalar": {
          // A value equal to its default isn't written; reading it gives the default back.
          const present = c.forceDefaults === true ||
            value(field.type, field.value) !== value(field.type, field.default)
          assert.strictEqual(table.has(field.slot), present)
          assert.deepStrictEqual(
            readTableScalar(table, field.type, field.slot, field.default),
            present ? stored(field.type, field.value) : value(field.type, field.default)
          )
          break
        }
        case "struct":
          checkStruct(defined(table.struct(field.slot, field.struct.size)), field.struct, field.value)
          break
        case "offset":
          checkOffset(table, field.slot, ops.get(field.ref)!)
          break
      }
    }
  }
  const checkOffset = (table: FlatBuffers.Table, slot: number, child: Op) => {
    switch (child.op) {
      case "string":
      case "sharedString":
        assert.strictEqual(table.string(slot), child.value)
        break
      case "bytes":
        assert.deepStrictEqual(Array.from(defined(table.bytes(slot))), child.value)
        break
      case "vector": {
        const vector = defined(table.vector(slot, SIZE[child.type]))
        assert.deepStrictEqual(
          Array.from({ length: vector.length }, (_, i) => vector[child.type](i)),
          child.values.map((v) => stored(child.type, v))
        )
        break
      }
      case "structs": {
        const vector = defined(table.vector(slot, child.struct.size))
        assert.strictEqual(vector.length, child.items.length)
        child.items.forEach((item, i) => checkStruct(vector.struct(i, child.struct.size), child.struct, item))
        break
      }
      case "offsets": {
        const vector = defined(table.vector(slot, 4))
        assert.strictEqual(vector.length, child.refs.length)
        child.refs.forEach((name, i) => {
          const element = ops.get(name)!
          if (element.op === "table") checkTable(vector.table(i), element)
          else if (element.op === "string" || element.op === "sharedString") {
            assert.strictEqual(vector.string(i), element.value)
          }
        })
        break
      }
      case "table":
        checkTable(defined(table.table(slot)), child)
        break
    }
  }
  const root = ops.get(c.finish.root)! as Extract<Op, { op: "table" }>
  checkTable(FlatBuffers.root(bytes, c.finish), root)
  if (c.finish.identifier !== undefined) {
    assert.strictEqual(FlatBuffers.identifier(bytes, c.finish), c.finish.identifier)
  }
}

describe("FlatBuffers", () => {
  it("builds the bytes the official builder builds", () => {
    assert.isAbove(gold.cases.length, 300)
    for (const c of gold.cases) {
      assert.strictEqual(toHex(build(c)), c.bytes, c.id)
    }
  })

  it("reads every value back from the official builder's bytes", () => {
    for (const c of gold.cases) {
      verify(c, fromHex(c.bytes))
    }
  })

  it("reads absent fields as their defaults", () => {
    const b = FlatBuffers.make()
    b.startTable(4)
    const root = FlatBuffers.root(b.finish(b.endTable()))
    assert.strictEqual(root.has(0), false)
    assert.strictEqual(root.int32(0, 7), 7)
    assert.strictEqual(root.bool(1, true), true)
    assert.strictEqual(root.uint64(2, BigInt(9)), BigInt(9))
    assert.strictEqual(root.string(3), undefined)
    assert.strictEqual(root.table(3), undefined)
    assert.strictEqual(root.vector(3, 1), undefined)
    // Slots past the vtable, as written by an older schema, are absent too.
    assert.strictEqual(root.float64(100, 1.5), 1.5)
  })

  it("decode returns a failure for malformed input", () => {
    const failure = (bytes: Uint8Array, options?: FlatBuffers.Options) => {
      const result = FlatBuffers.decode(bytes, (root) => root.string(0), options)
      assert.isTrue(Result.isFailure(result))
      return Result.isFailure(result) ? result.failure.kind : undefined
    }
    assert.strictEqual(failure(new Uint8Array(2)), "OutOfBounds")
    assert.strictEqual(failure(Uint8Array.of(0xff, 0xff, 0xff, 0x7f)), "OutOfBounds")
    // A vtable of size 1.
    assert.strictEqual(failure(Uint8Array.of(8, 0, 0, 0, 1, 0, 4, 0, 4, 0, 0, 0)), "InvalidVtable")
    // A string field with an invalid UTF-8 byte.
    const b = FlatBuffers.make()
    const s = b.createString(Uint8Array.of(0xc3, 0x28))
    b.startTable(1)
    b.addFieldOffset(0, s)
    assert.strictEqual(failure(b.finish(b.endTable())), "InvalidUtf8")
    assert.strictEqual(failure(fromHex(gold.cases[1].bytes), { identifier: "NOPE" }), "Identifier")
    assert.strictEqual(failure(Uint8Array.of(0xff, 0, 0, 0, 0, 0, 0, 0), { sizePrefixed: true }), "OutOfBounds")
  })

  it("decode rethrows errors that aren't FlatBuffersErrors", () => {
    const bytes = fromHex(gold.cases[0].bytes)
    assert.throws(() =>
      FlatBuffers.decode(bytes, () => {
        throw new Error("boom")
      }), "boom")
  })

  it("only ever fails with FlatBuffersError on corrupted buffers", () => {
    // Deterministic xorshift so failures reproduce.
    let seed = 0x2f6b1d3
    const random = () => {
      seed ^= seed << 13
      seed ^= seed >>> 17
      seed ^= seed << 5
      return (seed >>> 0) / 0x100000000
    }
    let failures = 0
    for (const c of gold.cases) {
      const original = fromHex(c.bytes)
      for (let round = 0; round < 20; round++) {
        const bytes = original.slice(0, random() < 0.2 ? Math.floor(random() * original.length) : original.length)
        const flips = 1 + Math.floor(random() * 4)
        for (let i = 0; i < flips && bytes.length > 0; i++) {
          bytes[Math.floor(random() * bytes.length)] = Math.floor(random() * 256)
        }
        try {
          verify(c, bytes)
        } catch (error) {
          if (error instanceof Error && error.name === "AssertionError") continue
          assert.isTrue(FlatBuffers.isFlatBuffersError(error), `${c.id}: ${String(error)}`)
          failures++
        }
      }
    }
    assert.isAbove(failures, 0)
  })

  describe("Builder", () => {
    it("rejects nested and out-of-order calls", () => {
      const usage = (f: (b: FlatBuffers.Builder) => void) => {
        const b = FlatBuffers.make()
        try {
          f(b)
          assert.fail("expected a FlatBuffersError")
        } catch (error) {
          assert.isTrue(FlatBuffers.isFlatBuffersError(error))
          assert.strictEqual((error as FlatBuffers.FlatBuffersError).kind, "Usage")
        }
      }
      usage((b) => {
        b.startTable(1)
        b.createString("x")
      })
      usage((b) => {
        b.startTable(1)
        b.startTable(1)
      })
      usage((b) => {
        b.startVector(1, 1, 1)
        b.startTable(1)
      })
      usage((b) => b.endTable())
      usage((b) => b.endVector())
      usage((b) => {
        b.startTable(1)
        b.addFieldInt32(1, 5)
      })
      usage((b) => b.addFieldInt32(0, 5))
      usage((b) => {
        b.addInt32(1)
        const s = b.offset
        b.addInt32(2)
        b.startTable(1)
        b.addFieldStruct(0, s)
      })
      usage((b) => {
        b.startTable(0)
        b.finish(b.endTable(), { identifier: "TOOLONG" })
      })
      usage((b) => b.addOffset(100))
    })

    it("wraps integers to their width", () => {
      const b = FlatBuffers.make()
      b.startTable(3)
      b.addFieldUint8(0, 256 + 7)
      b.addFieldInt16(1, 0x18000)
      b.addFieldUint64(2, -BigInt(1))
      const root = FlatBuffers.root(b.finish(b.endTable()))
      assert.strictEqual(root.uint8(0), 7)
      assert.strictEqual(root.int16(1), -32768)
      assert.strictEqual(root.uint64(2), 2n ** 64n - 1n)
    })

    it("returns a copy, leaving the builder's buffer alone", () => {
      const b = FlatBuffers.make({ initialSize: 1 })
      b.startTable(0)
      const bytes = b.finish(b.endTable())
      assert.strictEqual(bytes.byteOffset, 0)
      assert.strictEqual(bytes.buffer.byteLength, bytes.length)
    })
  })
})
