import * as BloomFilter from "effect/BloomFilter"
import { pipe } from "effect/Function"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

const values = (count: number, prefix = "value"): Array<string> => {
  const out: Array<string> = []
  for (let i = 0; i < count; i++) {
    out.push(`${prefix}-${i}`)
  }
  return out
}

const mulberry32 = (seed: number): () => number => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe("BloomFilter", () => {
  describe("make", () => {
    it("creates an empty filter with the default false positive rate", () => {
      const filter = BloomFilter.make<string>({ expectedItems: 1_000 })

      expect(filter.expectedItems).toBe(1_000)
      expect(filter.falsePositiveRate).toBe(0.01)
      expect(filter.bits % 32).toBe(0)
      expect(filter.hashes).toBeGreaterThanOrEqual(1)
      expect(BloomFilter.isEmpty(filter)).toBe(true)
      expect(BloomFilter.saturation(filter)).toBe(0)
      expect(BloomFilter.estimatedFalsePositiveRate(filter)).toBe(0)
    })

    it("respects a custom false positive rate", () => {
      const filter = BloomFilter.make<string>({
        expectedItems: 1_000,
        falsePositiveRate: 0.001
      })

      expect(filter.falsePositiveRate).toBe(0.001)
      expect(filter.hashes).toBeGreaterThanOrEqual(1)
    })

    it("rejects invalid expectedItems", () => {
      for (const expectedItems of [0, -1, 1.5, Number.NaN, Infinity, 2 ** 32]) {
        expect(() => BloomFilter.make({ expectedItems })).toThrow(RangeError)
      }
    })

    it("rejects invalid falsePositiveRate", () => {
      for (const falsePositiveRate of [0, 1, -0.1, 1.1, Number.NaN, Infinity]) {
        expect(() =>
          BloomFilter.make({
            expectedItems: 1_000,
            falsePositiveRate
          })
        ).toThrow(RangeError)
      }
    })

    it("rejects pathological sizing", () => {
      expect(() =>
        BloomFilter.make({
          expectedItems: 1_000,
          falsePositiveRate: 1e-30
        })
      ).toThrow(RangeError)

      expect(() =>
        BloomFilter.make({
          expectedItems: 1_000_000_000,
          falsePositiveRate: 0.001
        })
      ).toThrow(RangeError)
    })
  })

  describe("fromIterable / add / addAll / has", () => {
    it("adds every value from an iterable", () => {
      const inserted = values(100)
      const filter = BloomFilter.fromIterable(inserted, { expectedItems: 100 })

      for (const value of inserted) {
        expect(BloomFilter.has(filter, value)).toBe(true)
      }
    })

    it("accepts any iterable", () => {
      const inserted = values(10)
      const filter = BloomFilter.fromIterable(new Set(inserted), { expectedItems: 10 })

      for (const value of inserted) {
        expect(BloomFilter.has(filter, value)).toBe(true)
      }
    })

    it("add returns a new filter and leaves the original unchanged", () => {
      const empty = BloomFilter.make<string>({ expectedItems: 10 })
      const added = BloomFilter.add(empty, "alice")

      expect(added).not.toBe(empty)
      expect(BloomFilter.has(empty, "alice")).toBe(false)
      expect(BloomFilter.has(added, "alice")).toBe(true)
    })

    it("supports data-last add", () => {
      const filter = pipe(BloomFilter.make<string>({ expectedItems: 10 }), BloomFilter.add("alice"))

      expect(BloomFilter.has(filter, "alice")).toBe(true)
    })

    it("addAll adds every value", () => {
      const inserted = values(50)
      const filter = BloomFilter.addAll(
        BloomFilter.make<string>({ expectedItems: 50 }),
        inserted
      )

      for (const value of inserted) {
        expect(BloomFilter.has(filter, value)).toBe(true)
      }
    })

    it("supports data-last addAll", () => {
      const inserted = values(50)
      const filter = pipe(
        BloomFilter.make<string>({ expectedItems: 50 }),
        BloomFilter.addAll(inserted)
      )

      for (const value of inserted) {
        expect(BloomFilter.has(filter, value)).toBe(true)
      }
    })

    it("has supports data-last usage", () => {
      const filter = BloomFilter.fromIterable(["alice"], { expectedItems: 10 })

      expect(pipe(filter, BloomFilter.has("alice"))).toBe(true)
      expect(pipe(filter, BloomFilter.has("bob"))).toBe(false)
    })

    it("does not report values on an empty filter", () => {
      const filter = BloomFilter.make<string>({ expectedItems: 100 })

      for (const value of values(100, "absent")) {
        expect(BloomFilter.has(filter, value)).toBe(false)
      }
    })

    it("handles duplicates", () => {
      const filter = BloomFilter.addAll(
        BloomFilter.make<string>({ expectedItems: 10 }),
        ["alice", "alice", "alice"]
      )

      expect(BloomFilter.has(filter, "alice")).toBe(true)
    })
  })

  describe("metrics", () => {
    it("saturation and false positive rate stay within bounds", () => {
      const filter = BloomFilter.fromIterable(values(100), {
        expectedItems: 100,
        falsePositiveRate: 0.01
      })

      const saturation = BloomFilter.saturation(filter)
      const falsePositiveRate = BloomFilter.estimatedFalsePositiveRate(filter)

      expect(BloomFilter.isEmpty(filter)).toBe(false)
      expect(saturation).toBeGreaterThan(0)
      expect(saturation).toBeLessThanOrEqual(1)
      expect(falsePositiveRate).toBeGreaterThan(0)
      expect(falsePositiveRate).toBeLessThanOrEqual(0.02)
    })

    it("saturation is monotonic as more values are added", () => {
      const less = BloomFilter.fromIterable(values(50), { expectedItems: 100 })
      const more = BloomFilter.fromIterable(values(100), { expectedItems: 100 })

      expect(BloomFilter.saturation(more)).toBeGreaterThanOrEqual(BloomFilter.saturation(less))
      expect(BloomFilter.estimatedFalsePositiveRate(more)).toBeGreaterThanOrEqual(
        BloomFilter.estimatedFalsePositiveRate(less)
      )
    })

    it("adding the same value twice does not change saturation", () => {
      const one = BloomFilter.add(BloomFilter.make<string>({ expectedItems: 10 }), "alice")
      const two = BloomFilter.add(one, "alice")

      expect(BloomFilter.saturation(two)).toBe(BloomFilter.saturation(one))
    })
  })

  describe("bytes", () => {
    it("writes the classic header", () => {
      const filter = BloomFilter.make<string>({ expectedItems: 10 })
      const bytes = BloomFilter.toBytes(filter)

      expect(Array.from(bytes.slice(0, 3))).toEqual([0x45, 0x42, 0x46])
      expect(bytes[3]).toBe(1)
      expect(bytes[4]).toBe(0)
      expect(bytes[5]).toBe(0)
      expect(bytes.length).toBe(28 + Math.ceil(filter.bits / 32) * 4)
    })

    it("round-trips configuration and membership", () => {
      const inserted = values(100)
      const filter = BloomFilter.fromIterable(inserted, {
        expectedItems: 123,
        falsePositiveRate: 0.005
      })
      const restored = BloomFilter.fromBytes<string>(BloomFilter.toBytes(filter))

      expect(restored.expectedItems).toBe(filter.expectedItems)
      expect(restored.falsePositiveRate).toBe(filter.falsePositiveRate)
      expect(restored.bits).toBe(filter.bits)
      expect(restored.hashes).toBe(filter.hashes)

      for (const value of inserted) {
        expect(BloomFilter.has(restored, value)).toBe(true)
      }
    })

    it("rejects empty bytes", () => {
      expect(() => BloomFilter.fromBytes(new Uint8Array())).toThrow(/Invalid BloomFilter bytes/)
    })

    it("rejects a bad magic value", () => {
      const bytes = BloomFilter.toBytes(BloomFilter.make<string>({ expectedItems: 10 }))
      bytes[0] = 0

      expect(() => BloomFilter.fromBytes(bytes)).toThrow(/Invalid BloomFilter bytes/)
    })

    it("rejects an unsupported version", () => {
      const bytes = BloomFilter.toBytes(BloomFilter.make<string>({ expectedItems: 10 }))
      bytes[3] = 2

      expect(() => BloomFilter.fromBytes(bytes)).toThrow(/Invalid BloomFilter bytes/)
    })

    it("rejects truncated bytes", () => {
      const bytes = BloomFilter.toBytes(BloomFilter.fromIterable(values(10), { expectedItems: 10 }))

      expect(() => BloomFilter.fromBytes(bytes.subarray(0, bytes.length - 1))).toThrow(
        /Invalid BloomFilter bytes/
      )
    })

    it("rejects trailing bytes", () => {
      const bytes = BloomFilter.toBytes(BloomFilter.make<string>({ expectedItems: 10 }))
      const extended = new Uint8Array(bytes.length + 1)
      extended.set(bytes)

      expect(() => BloomFilter.fromBytes(extended)).toThrow(/Invalid BloomFilter bytes/)
    })

    it("rejects a bad hash count", () => {
      const bytes = BloomFilter.toBytes(BloomFilter.make<string>({ expectedItems: 10 }))
      bytes.fill(0, 24, 28)

      expect(() => BloomFilter.fromBytes(bytes)).toThrow(/Invalid BloomFilter bytes/)
    })

    it("rejects a variant mismatch", () => {
      const classic = BloomFilter.toBytes(BloomFilter.make<string>({ expectedItems: 10 }))
      const scalable = BloomFilter.ScalableBloomFilter.toBytes(
        BloomFilter.ScalableBloomFilter.make<string>({ expectedItems: 10 })
      )

      expect(() => BloomFilter.ScalableBloomFilter.fromBytes(classic)).toThrow(
        /Invalid BloomFilter bytes/
      )
      expect(() => BloomFilter.fromBytes(scalable)).toThrow(/Invalid BloomFilter bytes/)
    })
  })

  describe("guards and inspection", () => {
    it("guards exact types", () => {
      const classic = BloomFilter.make<string>({ expectedItems: 10 })
      const mutable = BloomFilter.MutableBloomFilter.make<string>({ expectedItems: 10 })
      const scalable = BloomFilter.ScalableBloomFilter.make<string>({ expectedItems: 10 })
      const mutableScalable = BloomFilter.MutableScalableBloomFilter.make<string>({
        expectedItems: 10
      })

      expect(BloomFilter.isBloomFilter(classic)).toBe(true)
      expect(BloomFilter.isBloomFilter(mutable)).toBe(false)
      expect(BloomFilter.isBloomFilter(scalable)).toBe(false)
      expect(BloomFilter.isBloomFilter(mutableScalable)).toBe(false)

      expect(BloomFilter.isMutableBloomFilter(mutable)).toBe(true)
      expect(BloomFilter.isMutableBloomFilter(classic)).toBe(false)

      expect(BloomFilter.isScalableBloomFilter(scalable)).toBe(true)
      expect(BloomFilter.isScalableBloomFilter(classic)).toBe(false)

      expect(BloomFilter.isMutableScalableBloomFilter(mutableScalable)).toBe(true)
      expect(BloomFilter.isMutableScalableBloomFilter(scalable)).toBe(false)

      expect(BloomFilter.isBloomFilter({})).toBe(false)
      expect(BloomFilter.isMutableBloomFilter(null)).toBe(false)
    })

    it("inspects without dumping the bit words", () => {
      const filter = BloomFilter.fromIterable(["alice"], { expectedItems: 10 })
      const json = JSON.parse(JSON.stringify(filter)) as { readonly _id: string }

      expect(json._id).toBe("BloomFilter")
      expect(JSON.stringify(filter)).not.toContain("words")
      expect(String(filter)).toContain("BloomFilter")
    })
  })

  describe("properties", () => {
    it("never reports a false negative for classic immutable filters", () => {
      fc.assert(
        fc.property(fc.array(fc.string(), { maxLength: 100 }), (inserted) => {
          const filter = BloomFilter.fromIterable(inserted, {
            expectedItems: Math.max(1, inserted.length)
          })

          for (const value of inserted) {
            expect(BloomFilter.has(filter, value)).toBe(true)
          }
        }),
        { numRuns: 100 }
      )
    })

    it("immutable and mutable classic filters agree on membership", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { maxLength: 50 }),
          fc.array(fc.string(), { maxLength: 50 }),
          (inserted, queries) => {
            const options = { expectedItems: Math.max(1, inserted.length) }
            const immutable = BloomFilter.fromIterable(inserted, options)
            const mutable = BloomFilter.MutableBloomFilter.fromIterable(inserted, options)

            for (const query of queries) {
              expect(BloomFilter.has(immutable, query)).toBe(
                BloomFilter.MutableBloomFilter.has(mutable, query)
              )
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it("byte round-trips preserve membership", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { maxLength: 50 }),
          fc.array(fc.string(), { maxLength: 50 }),
          (inserted, queries) => {
            const filter = BloomFilter.fromIterable(inserted, {
              expectedItems: Math.max(1, inserted.length)
            })
            const restored = BloomFilter.fromBytes<string>(BloomFilter.toBytes(filter))

            for (const query of queries) {
              expect(BloomFilter.has(restored, query)).toBe(BloomFilter.has(filter, query))
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it("addAll matches repeated add", () => {
      fc.assert(
        fc.property(fc.array(fc.string(), { maxLength: 50 }), (inserted) => {
          const empty = BloomFilter.make<string>({ expectedItems: Math.max(1, inserted.length) })
          const batch = BloomFilter.addAll(empty, inserted)
          let sequential = empty

          for (const value of inserted) {
            sequential = BloomFilter.add(sequential, value)
          }

          expect(BloomFilter.saturation(batch)).toBe(BloomFilter.saturation(sequential))
          for (const value of inserted) {
            expect(BloomFilter.has(batch, value)).toBe(true)
          }
        }),
        { numRuns: 100 }
      )
    })
  })

  describe("false positive rate", () => {
    it("stays below twice the configured target", () => {
      const random = mulberry32(42)
      const inserted = values(2_000, "inserted")
      const filter = BloomFilter.fromIterable(inserted, {
        expectedItems: 2_000,
        falsePositiveRate: 0.01
      })

      let falsePositives = 0
      const queries = 10_000
      for (let i = 0; i < queries; i++) {
        const query = `absent-${i}-${random()}`
        if (BloomFilter.has(filter, query)) {
          falsePositives++
        }
      }

      expect(falsePositives / queries).toBeLessThanOrEqual(0.02)
    })
  })
})

describe("MutableBloomFilter", () => {
  it("creates an empty filter", () => {
    const filter = BloomFilter.MutableBloomFilter.make<string>({ expectedItems: 100 })

    expect(BloomFilter.MutableBloomFilter.isEmpty(filter)).toBe(true)
    expect(BloomFilter.MutableBloomFilter.saturation(filter)).toBe(0)
    expect(BloomFilter.MutableBloomFilter.estimatedFalsePositiveRate(filter)).toBe(0)
  })

  it("add mutates and returns the same instance", () => {
    const filter = BloomFilter.MutableBloomFilter.make<string>({ expectedItems: 10 })
    const result = BloomFilter.MutableBloomFilter.add(filter, "alice")

    expect(result).toBe(filter)
    expect(BloomFilter.MutableBloomFilter.has(filter, "alice")).toBe(true)
  })

  it("supports data-last add and addAll", () => {
    const filter = pipe(
      BloomFilter.MutableBloomFilter.make<string>({ expectedItems: 10 }),
      BloomFilter.MutableBloomFilter.add("alice"),
      BloomFilter.MutableBloomFilter.addAll(["bob", "carol"])
    )

    for (const value of ["alice", "bob", "carol"]) {
      expect(BloomFilter.MutableBloomFilter.has(filter, value)).toBe(true)
    }
  })

  it("fromIterable adds every value", () => {
    const inserted = values(100)
    const filter = BloomFilter.MutableBloomFilter.fromIterable(inserted, { expectedItems: 100 })

    for (const value of inserted) {
      expect(BloomFilter.MutableBloomFilter.has(filter, value)).toBe(true)
    }
  })

  it("clear empties the filter in place", () => {
    const filter = BloomFilter.MutableBloomFilter.fromIterable(values(10), { expectedItems: 10 })
    const result = BloomFilter.MutableBloomFilter.clear(filter)

    expect(result).toBe(filter)
    expect(BloomFilter.MutableBloomFilter.isEmpty(filter)).toBe(true)
    expect(BloomFilter.MutableBloomFilter.has(filter, "value-0")).toBe(false)
  })

  it("clone is independent", () => {
    const original = BloomFilter.MutableBloomFilter.fromIterable(["alice"], { expectedItems: 10 })
    const copy = BloomFilter.MutableBloomFilter.clone(original)

    BloomFilter.MutableBloomFilter.add(copy, "bob")
    BloomFilter.MutableBloomFilter.clear(original)

    expect(BloomFilter.MutableBloomFilter.has(copy, "bob")).toBe(true)
    expect(BloomFilter.MutableBloomFilter.has(original, "alice")).toBe(false)
  })

  it("round-trips through bytes", () => {
    const inserted = values(50)
    const filter = BloomFilter.MutableBloomFilter.fromIterable(inserted, { expectedItems: 50 })
    const restored = BloomFilter.MutableBloomFilter.fromBytes<string>(
      BloomFilter.MutableBloomFilter.toBytes(filter)
    )

    expect(restored.expectedItems).toBe(filter.expectedItems)
    for (const value of inserted) {
      expect(BloomFilter.MutableBloomFilter.has(restored, value)).toBe(true)
    }
  })
})

describe("ScalableBloomFilter", () => {
  describe("make", () => {
    it("uses the textbook growth defaults", () => {
      const filter = BloomFilter.ScalableBloomFilter.make<string>({ expectedItems: 100 })

      expect(filter.expectedItems).toBe(100)
      expect(filter.falsePositiveRate).toBe(0.01)
      expect(filter.growthFactor).toBe(2)
      expect(filter.tighteningRatio).toBe(0.9)
      expect(filter.slices).toBe(1)
    })

    it("respects custom growth options", () => {
      const filter = BloomFilter.ScalableBloomFilter.make<string>({
        expectedItems: 100,
        falsePositiveRate: 0.001,
        growthFactor: 4,
        tighteningRatio: 0.8
      })

      expect(filter.falsePositiveRate).toBe(0.001)
      expect(filter.growthFactor).toBe(4)
      expect(filter.tighteningRatio).toBe(0.8)
    })

    it("rejects invalid growth options", () => {
      for (const growthFactor of [1, 0, -1, Number.NaN, Infinity]) {
        expect(() =>
          BloomFilter.ScalableBloomFilter.make({
            expectedItems: 100,
            growthFactor
          })
        ).toThrow(RangeError)
      }

      for (const tighteningRatio of [0, 1, -0.1, 1.1, Number.NaN, Infinity]) {
        expect(() =>
          BloomFilter.ScalableBloomFilter.make({
            expectedItems: 100,
            tighteningRatio
          })
        ).toThrow(RangeError)
      }
    })

    it("rejects growth that would exceed the size limits", () => {
      const options = {
        expectedItems: 10,
        falsePositiveRate: 0.5,
        growthFactor: 1_000_000_000
      }
      const full = BloomFilter.ScalableBloomFilter.fromIterable(values(10), options)

      expect(() => BloomFilter.ScalableBloomFilter.add(full, "overflow")).toThrow(RangeError)
    })
  })

  describe("growth", () => {
    it("adds a slice when the active slice is full", () => {
      const inserted = values(250)
      const filter = BloomFilter.ScalableBloomFilter.fromIterable(inserted, { expectedItems: 100 })

      expect(filter.slices).toBe(2)
      for (const value of inserted) {
        expect(BloomFilter.ScalableBloomFilter.has(filter, value)).toBe(true)
      }
    })

    it("counts duplicates toward growth", () => {
      const duplicated = new Array<string>(250).fill("same")
      const filter = BloomFilter.ScalableBloomFilter.fromIterable(duplicated, { expectedItems: 100 })

      expect(filter.slices).toBe(2)
      expect(BloomFilter.ScalableBloomFilter.has(filter, "same")).toBe(true)
    })

    it("checks membership across all slices", () => {
      const first = values(100, "first")
      const second = values(200, "second")
      const filter = BloomFilter.ScalableBloomFilter.fromIterable([...first, ...second], {
        expectedItems: 100
      })

      for (const value of [...first, ...second]) {
        expect(BloomFilter.ScalableBloomFilter.has(filter, value)).toBe(true)
      }
    })

    it("keeps old immutable versions valid", () => {
      const inserted = values(150)
      const before = BloomFilter.ScalableBloomFilter.fromIterable(inserted, { expectedItems: 100 })
      const after = BloomFilter.ScalableBloomFilter.add(before, "extra")

      expect(BloomFilter.ScalableBloomFilter.has(after, "extra")).toBe(true)
      expect(BloomFilter.ScalableBloomFilter.has(before, "extra")).toBe(false)
      for (const value of inserted) {
        expect(BloomFilter.ScalableBloomFilter.has(before, value)).toBe(true)
      }
    })

    it("supports data-last add and addAll", () => {
      const filter = pipe(
        BloomFilter.ScalableBloomFilter.make<string>({ expectedItems: 10 }),
        BloomFilter.ScalableBloomFilter.add("alice"),
        BloomFilter.ScalableBloomFilter.addAll(["bob", "carol"])
      )

      for (const value of ["alice", "bob", "carol"]) {
        expect(BloomFilter.ScalableBloomFilter.has(filter, value)).toBe(true)
      }
    })
  })

  describe("metrics", () => {
    it("combines slice estimates within bounds", () => {
      const filter = BloomFilter.ScalableBloomFilter.fromIterable(values(250), {
        expectedItems: 100,
        falsePositiveRate: 0.01
      })

      expect(BloomFilter.ScalableBloomFilter.isEmpty(filter)).toBe(false)
      expect(BloomFilter.ScalableBloomFilter.saturation(filter)).toBeGreaterThan(0)
      expect(BloomFilter.ScalableBloomFilter.saturation(filter)).toBeLessThanOrEqual(1)
      expect(BloomFilter.ScalableBloomFilter.estimatedFalsePositiveRate(filter)).toBeLessThanOrEqual(
        0.02
      )
    })
  })

  describe("bytes", () => {
    it("writes the scalable header", () => {
      const filter = BloomFilter.ScalableBloomFilter.make<string>({ expectedItems: 10 })
      const bytes = BloomFilter.ScalableBloomFilter.toBytes(filter)

      expect(Array.from(bytes.slice(0, 3))).toEqual([0x45, 0x42, 0x46])
      expect(bytes[3]).toBe(1)
      expect(bytes[4]).toBe(1)
      expect(bytes[5]).toBe(0)
      expect(bytes.length).toBeGreaterThanOrEqual(52)
    })

    it("round-trips configuration and membership", () => {
      const inserted = values(250)
      const filter = BloomFilter.ScalableBloomFilter.fromIterable(inserted, {
        expectedItems: 100,
        falsePositiveRate: 0.005,
        growthFactor: 3,
        tighteningRatio: 0.8
      })
      const restored = BloomFilter.ScalableBloomFilter.fromBytes<string>(
        BloomFilter.ScalableBloomFilter.toBytes(filter)
      )

      expect(restored.expectedItems).toBe(filter.expectedItems)
      expect(restored.falsePositiveRate).toBe(filter.falsePositiveRate)
      expect(restored.growthFactor).toBe(filter.growthFactor)
      expect(restored.tighteningRatio).toBe(filter.tighteningRatio)
      expect(restored.slices).toBe(filter.slices)

      for (const value of inserted) {
        expect(BloomFilter.ScalableBloomFilter.has(restored, value)).toBe(true)
      }
    })

    it("can keep growing after a round-trip", () => {
      const inserted = values(150)
      const original = BloomFilter.ScalableBloomFilter.fromIterable(inserted, { expectedItems: 100 })
      const restored = BloomFilter.ScalableBloomFilter.fromBytes<string>(
        BloomFilter.ScalableBloomFilter.toBytes(original)
      )
      const grown = BloomFilter.ScalableBloomFilter.addAll(restored, values(160, "extra"))

      expect(original.slices).toBe(2)
      expect(grown.slices).toBe(3)
      for (const value of [...inserted, ...values(160, "extra")]) {
        expect(BloomFilter.ScalableBloomFilter.has(grown, value)).toBe(true)
      }
    })
  })

  describe("properties", () => {
    it("never reports a false negative", () => {
      fc.assert(
        fc.property(fc.array(fc.string(), { maxLength: 100 }), (inserted) => {
          const filter = BloomFilter.ScalableBloomFilter.fromIterable(inserted, {
            expectedItems: Math.max(1, Math.ceil(inserted.length / 4))
          })

          for (const value of inserted) {
            expect(BloomFilter.ScalableBloomFilter.has(filter, value)).toBe(true)
          }
        }),
        { numRuns: 100 }
      )
    })

    it("round-trips through bytes", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { maxLength: 50 }),
          fc.array(fc.string(), { maxLength: 50 }),
          (inserted, queries) => {
            const filter = BloomFilter.ScalableBloomFilter.fromIterable(inserted, {
              expectedItems: Math.max(1, Math.ceil(inserted.length / 2))
            })
            const restored = BloomFilter.ScalableBloomFilter.fromBytes<string>(
              BloomFilter.ScalableBloomFilter.toBytes(filter)
            )

            for (const query of queries) {
              expect(BloomFilter.ScalableBloomFilter.has(restored, query)).toBe(
                BloomFilter.ScalableBloomFilter.has(filter, query)
              )
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe("false positive rate", () => {
    it("stays below twice the configured target", () => {
      const random = mulberry32(43)
      const inserted = values(2_000, "inserted")
      const filter = BloomFilter.ScalableBloomFilter.fromIterable(inserted, {
        expectedItems: 500,
        falsePositiveRate: 0.01
      })

      let falsePositives = 0
      const queries = 10_000
      for (let i = 0; i < queries; i++) {
        const query = `absent-${i}-${random()}`
        if (BloomFilter.ScalableBloomFilter.has(filter, query)) {
          falsePositives++
        }
      }

      expect(falsePositives / queries).toBeLessThanOrEqual(0.02)
    })
  })
})

describe("MutableScalableBloomFilter", () => {
  it("creates an empty filter", () => {
    const filter = BloomFilter.MutableScalableBloomFilter.make<string>({ expectedItems: 100 })

    expect(filter.slices).toBe(1)
    expect(BloomFilter.MutableScalableBloomFilter.isEmpty(filter)).toBe(true)
    expect(BloomFilter.MutableScalableBloomFilter.saturation(filter)).toBe(0)
    expect(BloomFilter.MutableScalableBloomFilter.estimatedFalsePositiveRate(filter)).toBe(0)
  })

  it("add and addAll mutate and return the same instance", () => {
    const filter = BloomFilter.MutableScalableBloomFilter.make<string>({ expectedItems: 10 })
    const added = BloomFilter.MutableScalableBloomFilter.add(filter, "alice")
    const addedAll = BloomFilter.MutableScalableBloomFilter.addAll(added, ["bob", "carol"])

    expect(added).toBe(filter)
    expect(addedAll).toBe(filter)
    for (const value of ["alice", "bob", "carol"]) {
      expect(BloomFilter.MutableScalableBloomFilter.has(filter, value)).toBe(true)
    }
  })

  it("supports data-last add and addAll", () => {
    const filter = pipe(
      BloomFilter.MutableScalableBloomFilter.make<string>({ expectedItems: 10 }),
      BloomFilter.MutableScalableBloomFilter.add("alice"),
      BloomFilter.MutableScalableBloomFilter.addAll(["bob", "carol"])
    )

    for (const value of ["alice", "bob", "carol"]) {
      expect(BloomFilter.MutableScalableBloomFilter.has(filter, value)).toBe(true)
    }
  })

  it("grows as values are added", () => {
    const inserted = values(250)
    const filter = BloomFilter.MutableScalableBloomFilter.fromIterable(inserted, {
      expectedItems: 100
    })

    expect(filter.slices).toBe(2)
    for (const value of inserted) {
      expect(BloomFilter.MutableScalableBloomFilter.has(filter, value)).toBe(true)
    }
  })

  it("clear resets to a single empty slice", () => {
    const filter = BloomFilter.MutableScalableBloomFilter.fromIterable(values(250), {
      expectedItems: 100
    })
    const result = BloomFilter.MutableScalableBloomFilter.clear(filter)

    expect(result).toBe(filter)
    expect(filter.slices).toBe(1)
    expect(BloomFilter.MutableScalableBloomFilter.isEmpty(filter)).toBe(true)
  })

  it("clone is independent", () => {
    const original = BloomFilter.MutableScalableBloomFilter.fromIterable(["alice"], {
      expectedItems: 10
    })
    const copy = BloomFilter.MutableScalableBloomFilter.clone(original)

    BloomFilter.MutableScalableBloomFilter.add(copy, "bob")
    BloomFilter.MutableScalableBloomFilter.clear(original)

    expect(BloomFilter.MutableScalableBloomFilter.has(copy, "bob")).toBe(true)
    expect(BloomFilter.MutableScalableBloomFilter.has(original, "alice")).toBe(false)
  })

  it("round-trips through bytes and keeps growing", () => {
    const inserted = values(150)
    const filter = BloomFilter.MutableScalableBloomFilter.fromIterable(inserted, {
      expectedItems: 100
    })
    const restored = BloomFilter.MutableScalableBloomFilter.fromBytes<string>(
      BloomFilter.MutableScalableBloomFilter.toBytes(filter)
    )

    expect(restored.expectedItems).toBe(filter.expectedItems)
    expect(restored.growthFactor).toBe(filter.growthFactor)
    expect(restored.tighteningRatio).toBe(filter.tighteningRatio)
    expect(restored.slices).toBe(2)

    const grown = BloomFilter.MutableScalableBloomFilter.addAll(restored, values(160, "extra"))

    expect(grown).toBe(restored)
    expect(grown.slices).toBe(3)
    for (const value of [...inserted, ...values(160, "extra")]) {
      expect(BloomFilter.MutableScalableBloomFilter.has(grown, value)).toBe(true)
    }
  })
})
