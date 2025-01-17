import * as RA from "effect/Array"
import * as Chunk from "effect/Chunk"
import * as Duration from "effect/Duration"
import * as E from "effect/Either"
import * as Equal from "effect/Equal"
import { identity, pipe } from "effect/Function"
import * as N from "effect/Number"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import type { Predicate } from "effect/Predicate"
import * as Util from "effect/test/util"
import * as fc from "fast-check"
import { assert, describe, expect, it } from "vitest"

describe("Chunk", () => {
  it("exports", () => {
    expect(Chunk.unsafeFromNonEmptyArray).exist
    expect(Chunk.contains).exist
    expect(Chunk.containsWith).exist
    expect(Chunk.difference).exist
    expect(Chunk.differenceWith).exist
    expect(Chunk.findFirst).exist
    expect(Chunk.findFirstIndex).exist
    expect(Chunk.findLast).exist
    expect(Chunk.findLastIndex).exist
    expect(Chunk.every).exist
    expect(Chunk.join).exist
    expect(Chunk.reduce).exist
    expect(Chunk.reduceRight).exist
    expect(Chunk.some).exist
  })

  it("toString", () => {
    expect(String(Chunk.make(0, 1, 2))).toEqual(`{
  "_id": "Chunk",
  "values": [
    0,
    1,
    2
  ]
}`)
    expect(String(Chunk.make(Chunk.make(1, 2, 3)))).toEqual(`{
  "_id": "Chunk",
  "values": [
    {
      "_id": "Chunk",
      "values": [
        1,
        2,
        3
      ]
    }
  ]
}`)
  })

  it("toJSON", () => {
    expect(Chunk.make(0, 1, 2).toJSON()).toEqual(
      { _id: "Chunk", values: [0, 1, 2] }
    )
    expect(Chunk.make(Chunk.make(1, 2, 3)).toJSON()).toEqual(
      { _id: "Chunk", values: [{ _id: "Chunk", values: [1, 2, 3] }] }
    )
  })

  it("equals", () => {
    expect(Equal.equals(Chunk.make(0), Chunk.make(0))).toBe(true)
    expect(Equal.equals(Chunk.make(1, 2, 3), Chunk.make(1, 2, 3))).toBe(true)
    expect(Equal.equals(Chunk.make(0), Duration.millis(1))).toBe(false)
  })

  it("inspect", () => {
    if (typeof window === "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { inspect } = require("node:util")
      expect(inspect(Chunk.make(0, 1, 2))).toEqual(inspect({ _id: "Chunk", values: [0, 1, 2] }))
    }
  })

  it("modifyOption", () => {
    expect(pipe(Chunk.empty(), Chunk.modifyOption(0, (n: number) => n * 2))).toEqual(Option.none())
    expect(pipe(Chunk.make(1, 2, 3), Chunk.modifyOption(0, (n: number) => n * 2))).toEqual(
      Option.some(Chunk.make(2, 2, 3))
    )
  })

  it("modify", () => {
    expect(pipe(Chunk.empty(), Chunk.modify(0, (n: number) => n * 2))).toEqual(Chunk.empty())
    expect(pipe(Chunk.make(1, 2, 3), Chunk.modify(0, (n: number) => n * 2))).toEqual(Chunk.make(2, 2, 3))
  })

  it("replaceOption", () => {
    expect(pipe(Chunk.empty(), Chunk.replaceOption(0, 2))).toEqual(Option.none())
    expect(pipe(Chunk.make(1, 2, 3), Chunk.replaceOption(0, 2))).toEqual(Option.some(Chunk.make(2, 2, 3)))
  })

  it("replace", () => {
    expect(pipe(Chunk.empty(), Chunk.replace(0, 2))).toEqual(Chunk.empty())
    expect(pipe(Chunk.make(1, 2, 3), Chunk.replace(0, 2))).toEqual(Chunk.make(2, 2, 3))
  })

  it("remove", () => {
    expect(pipe(Chunk.empty(), Chunk.remove(0))).toEqual(Chunk.empty())
    expect(pipe(Chunk.make(1, 2, 3), Chunk.remove(0))).toEqual(Chunk.make(2, 3))
  })

  it("chunksOf", () => {
    expect(pipe(Chunk.empty(), Chunk.chunksOf(2))).toEqual(Chunk.empty())
    expect(pipe(Chunk.make(1, 2, 3, 4, 5), Chunk.chunksOf(2))).toEqual(
      Chunk.make(Chunk.make(1, 2), Chunk.make(3, 4), Chunk.make(5))
    )
    expect(pipe(Chunk.make(1, 2, 3, 4, 5, 6), Chunk.chunksOf(2))).toEqual(
      Chunk.make(Chunk.make(1, 2), Chunk.make(3, 4), Chunk.make(5, 6))
    )
    expect(pipe(Chunk.make(1, 2, 3, 4, 5), Chunk.chunksOf(1))).toEqual(
      Chunk.make(Chunk.make(1), Chunk.make(2), Chunk.make(3), Chunk.make(4), Chunk.make(5))
    )
    expect(pipe(Chunk.make(1, 2, 3, 4, 5), Chunk.chunksOf(5))).toEqual(
      Chunk.make(Chunk.make(1, 2, 3, 4, 5))
    )
    // out of bounds
    expect(pipe(Chunk.make(1, 2, 3, 4, 5), Chunk.chunksOf(0))).toEqual(
      Chunk.make(Chunk.make(1), Chunk.make(2), Chunk.make(3), Chunk.make(4), Chunk.make(5))
    )
    expect(pipe(Chunk.make(1, 2, 3, 4, 5), Chunk.chunksOf(-1))).toEqual(
      Chunk.make(Chunk.make(1), Chunk.make(2), Chunk.make(3), Chunk.make(4), Chunk.make(5))
    )
    expect(pipe(Chunk.make(1, 2, 3, 4, 5), Chunk.chunksOf(10))).toEqual(
      Chunk.make(Chunk.make(1, 2, 3, 4, 5))
    )
  })

  it(".pipe", () => {
    expect(Chunk.empty().pipe(Chunk.append(1))).toEqual(Chunk.make(1))
  })

  describe("toArray", () => {
    it("should return an empty array for an empty chunk", () => {
      expect(Chunk.toArray(Chunk.empty())).toEqual([])
    })

    it("should return an array with the elements of the chunk", () => {
      expect(Chunk.toArray(Chunk.make(1, 2, 3))).toEqual([1, 2, 3])
    })

    it("should not affect the original chunk when the array is mutated", () => {
      const chunk = Chunk.make(1, 2, 3)
      const arr = Chunk.toArray(chunk)
      // mutate the array
      arr[1] = 4
      // the chunk should not be affected
      expect(Chunk.toArray(chunk)).toStrictEqual([1, 2, 3])
    })
  })

  describe("toReadonlyArray", () => {
    describe("Given an empty Chunk", () => {
      const chunk = Chunk.empty()
      it("should give back an empty readonly array", () => {
        expect(Chunk.toReadonlyArray(chunk)).toEqual([])
      })
    })

    describe("Given a large Chunk", () => {
      const len = 100_000
      let chunk = Chunk.empty<number>()
      for (let i = 0; i < len; i++) chunk = Chunk.appendAll(Chunk.of(i), chunk)

      it("gives back a readonly array", () => {
        expect(() => Chunk.toReadonlyArray(chunk)).not.toThrow()
        expect(Chunk.toReadonlyArray(chunk)).toEqual(RA.reverse(RA.range(0, len - 1)))
      })
    })

    describe(`Given an imbalanced left and right chunk`, () => {
      const len = 1_000
      let rchunk = Chunk.empty<number>()
      let lchunk = Chunk.empty<number>()
      for (let i = 0; i < len; i++) {
        rchunk = Chunk.appendAll(Chunk.of(i), rchunk)
        lchunk = Chunk.appendAll(lchunk, Chunk.of(i))
      }
      it("should have depth of +/- 3", () => {
        expect(rchunk.depth)
          .toBeGreaterThanOrEqual(lchunk.depth - 3)
        expect(rchunk.depth)
          .toBeLessThanOrEqual(lchunk.depth + 3)
      })
    })
  })

  describe("isChunk", () => {
    describe("Given a chunk", () => {
      const chunk = Chunk.make(0, 1)
      it("should be true", () => {
        expect(Chunk.isChunk(chunk)).toBe(true)
      })
    })
    describe("Given an object", () => {
      const object = {}
      it("should be false", () => {
        expect(Chunk.isChunk(object)).toBe(false)
      })
    })
  })

  describe("fromIterable", () => {
    describe("Given an iterable", () => {
      const myIterable = {
        [Symbol.iterator]() {
          let i = 0

          return {
            next() {
              i++
              return { value: i, done: i > 5 }
            }
          }
        }
      }

      it("should process it", () => {
        expect(Chunk.fromIterable(myIterable)).toEqual(Chunk.unsafeFromArray([1, 2, 3, 4, 5]))
      })
    })

    it("should return the same reference if the input is a Chunk", () => {
      const expected = Chunk.make(1, 2, 3)
      const actual = Chunk.fromIterable(expected)
      expect(actual === expected).toEqual(true)
    })
  })

  describe("get", () => {
    describe("Given a Chunk and an index within the bounds", () => {
      const chunk = Chunk.unsafeFromArray([1, 2, 3])
      const index = 0

      it("should a Some with the value", () => {
        expect(pipe(
          chunk,
          Chunk.get(index)
        )).toEqual(Option.some(1))
      })
    })

    describe("Given a Chunk and an index out of bounds", () => {
      const chunk = Chunk.unsafeFromArray([1, 2, 3])

      it("should return a None", () => {
        expect(pipe(chunk, Chunk.get(4))).toEqual(Option.none())
      })
    })
  })

  describe("unsafeGet", () => {
    describe("Given an empty Chunk and an index", () => {
      const chunk = Chunk.empty()
      const index = 4

      it("should throw", () => {
        expect(() => pipe(chunk, Chunk.unsafeGet(index))).toThrow()
      })
    })

    describe("Given an appended Chunk and an index out of bounds", () => {
      const chunk = pipe(Chunk.empty(), Chunk.append(1))
      const index = 4

      it("should throw", () => {
        expect(() => pipe(chunk, Chunk.unsafeGet(index))).toThrow()
      })
    })

    describe("Given an appended Chunk and an index in bounds", () => {
      it("should return the value", () => {
        const chunk = pipe(Chunk.make(0, 1, 2), Chunk.append(3))
        expect(Chunk.unsafeGet(1)(chunk)).toEqual(1)
      })
    })

    describe("Given a prepended Chunk and an index out of bounds", () => {
      it("should throw", () => {
        fc.assert(fc.property(fc.array(fc.anything()), (array) => {
          let chunk: Chunk.Chunk<unknown> = Chunk.empty()
          array.forEach((e) => {
            chunk = pipe(chunk, Chunk.prepend(e))
          })
          expect(() => pipe(chunk, Chunk.unsafeGet(array.length))).toThrow()
        }))
      })
    })

    describe("Given a prepended Chunk and an index in bounds", () => {
      it("should return the value", () => {
        const chunk = pipe(Chunk.make(0, 1, 2), Chunk.prepend(3))
        expect(Chunk.unsafeGet(1)(chunk)).toEqual(0)
      })
    })

    describe("Given a singleton Chunk and an index out of bounds", () => {
      const chunk = pipe(Chunk.make(1))
      const index = 4

      it("should throw", () => {
        expect(() => pipe(chunk, Chunk.unsafeGet(index))).toThrow()
      })
    })

    describe("Given an array Chunk and an index out of bounds", () => {
      const chunk = pipe(Chunk.unsafeFromArray([1, 2]))
      const index = 4

      it("should throw", () => {
        expect(() => pipe(chunk, Chunk.unsafeGet(index))).toThrow()
      })
    })

    describe("Given a concat Chunk and an index out of bounds", () => {
      it("should throw", () => {
        fc.assert(fc.property(fc.array(fc.anything()), fc.array(fc.anything()), (arr1, arr2) => {
          const chunk: Chunk.Chunk<unknown> = Chunk.appendAll(Chunk.fromIterable(arr2))(Chunk.unsafeFromArray(arr1))
          expect(() => pipe(chunk, Chunk.unsafeGet(arr1.length + arr2.length))).toThrow()
        }))
      })
    })

    describe("Given an appended Chunk and an index in bounds", () => {
      const chunk = pipe(Chunk.empty(), Chunk.append(1), Chunk.append(2))
      const index = 1

      it("should return the value", () => {
        expect(pipe(chunk, Chunk.unsafeGet(index))).toEqual(2)
      })
    })

    describe("Given a prepended Chunk and an index in bounds", () => {
      const chunk = pipe(Chunk.empty(), Chunk.prepend(2), Chunk.prepend(1))
      const index = 1

      it("should return the value", () => {
        expect(pipe(chunk, Chunk.unsafeGet(index))).toEqual(2)
      })
    })

    describe("Given a singleton Chunk and an index in bounds", () => {
      const chunk = pipe(Chunk.make(1))
      const index = 0

      it("should return the value", () => {
        expect(pipe(chunk, Chunk.unsafeGet(index))).toEqual(1)
      })
    })

    describe("Given an array Chunk and an index in bounds", () => {
      const chunk = pipe(Chunk.unsafeFromArray([1, 2, 3]))
      const index = 1

      it("should return the value", () => {
        expect(pipe(chunk, Chunk.unsafeGet(index))).toEqual(2)
      })
    })

    describe("Given a concat Chunk and an index in bounds", () => {
      it("should return the value", () => {
        fc.assert(fc.property(fc.array(fc.anything()), fc.array(fc.anything()), (a, b) => {
          const c = [...a, ...b]
          const d = Chunk.appendAll(Chunk.unsafeFromArray(b))(Chunk.unsafeFromArray(a))
          for (let i = 0; i < c.length; i++) {
            expect(Chunk.unsafeGet(i)(d)).toEqual(c[i])
          }
        }))
      })
    })
  })

  it("append", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer()),
        fc.array(fc.integer(), { minLength: 0, maxLength: 120, size: "xlarge" }),
        (a, b) => {
          let chunk = Chunk.unsafeFromArray(a)
          b.forEach((e) => {
            chunk = Chunk.append(e)(chunk)
          })
          expect(Chunk.toReadonlyArray(chunk)).toEqual([...a, ...b])
        }
      )
    )
  })

  it("prependAll", () => {
    expect(pipe(Chunk.empty(), Chunk.prependAll(Chunk.make(1)))).toEqual(Chunk.make(1))
    expect(pipe(Chunk.make(1), Chunk.prependAll(Chunk.empty()))).toEqual(Chunk.make(1))

    expect(pipe(Chunk.empty(), Chunk.prependAll(Chunk.make(1, 2)))).toEqual(Chunk.make(1, 2))
    expect(pipe(Chunk.make(1, 2), Chunk.prependAll(Chunk.empty()))).toEqual(Chunk.make(1, 2))

    expect(pipe(Chunk.make(2, 3), Chunk.prependAll(Chunk.make(1)))).toEqual(Chunk.make(1, 2, 3))
    expect(pipe(Chunk.make(3), Chunk.prependAll(Chunk.make(1, 2)))).toEqual(Chunk.make(1, 2, 3))
  })

  it("prepend", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer()),
        fc.array(fc.integer(), { minLength: 0, maxLength: 120, size: "xlarge" }),
        (a, b) => {
          let chunk = Chunk.unsafeFromArray(a)
          for (let i = b.length - 1; i >= 0; i--) {
            chunk = Chunk.prepend(b[i])(chunk)
          }
          expect(Chunk.toReadonlyArray(chunk)).toEqual([...b, ...a])
        }
      )
    )
  })

  describe("take", () => {
    describe("Given a Chunk with more elements than the amount taken", () => {
      it("should return the subset", () => {
        expect(pipe(Chunk.unsafeFromArray([1, 2, 3]), Chunk.take(2)))
          .toEqual(Chunk.unsafeFromArray([1, 2]))
      })
    })

    describe("Given a Chunk with fewer elements than the amount taken", () => {
      const chunk = Chunk.unsafeFromArray([1, 2, 3])
      const amount = 5

      it("should return the available subset", () => {
        expect(pipe(chunk, Chunk.take(amount))).toEqual(Chunk.unsafeFromArray([
          1,
          2,
          3
        ]))
      })
    })

    describe("Given a slice Chunk with and an amount", () => {
      const chunk = pipe(Chunk.unsafeFromArray([1, 2, 3, 4, 5]), Chunk.take(4))
      const amount = 3

      it("should return the available subset", () => {
        expect(pipe(chunk, Chunk.take(amount))).toEqual(Chunk.unsafeFromArray([
          1,
          2,
          3
        ]))
      })
    })

    describe("Given a singleton Chunk with and an amount > 1", () => {
      const chunk = Chunk.make(1)
      const amount = 2

      it("should return the available subset", () => {
        expect(pipe(chunk, Chunk.take(amount))).toEqual(Chunk.unsafeFromArray([
          1
        ]))
      })
    })

    describe("Given a concatenated Chunk and an amount > 1", () => {
      const chunk = pipe(Chunk.of(1), Chunk.appendAll(Chunk.make(2, 3, 4)))
      const amount = 2

      it("should return the available subset", () => {
        expect(pipe(chunk, Chunk.take(amount), Chunk.toReadonlyArray)).toEqual([1, 2])
      })
    })

    describe("Given a concatenated Chunk and an amount <= self.left", () => {
      it("should return the available subset", () => {
        const chunk = Chunk.appendAll(Chunk.make(2, 3, 4), Chunk.of(1))
        expect(pipe(chunk, Chunk.take(2), Chunk.toReadonlyArray)).toEqual([2, 3])
        expect(pipe(chunk, Chunk.take(3), Chunk.toReadonlyArray)).toEqual([2, 3, 4])
      })
    })
  })

  describe("make", () => {
    it("should return a NonEmptyChunk", () => {
      expect(Chunk.make(0, 1).length).toStrictEqual(2)
    })
  })

  describe("singleton", () => {
    it("should return a NonEmptyChunk", () => {
      expect(Chunk.of(1).length).toStrictEqual(1)
    })
    it("should return a ISingleton", () => {
      expect(Chunk.of(1).backing._tag).toEqual("ISingleton")
    })
  })

  describe("drop", () => {
    it("should return self on 0", () => {
      const self = Chunk.make(0, 1)
      expect(Chunk.drop(0)(self)).toStrictEqual(self)
    })
    it("should drop twice", () => {
      const self = Chunk.make(0, 1, 2, 3)
      expect(Chunk.toReadonlyArray(Chunk.drop(1)(Chunk.drop(1)(self)))).toEqual([2, 3])
    })
    it("should handle concatenated chunks", () => {
      const self = pipe(Chunk.make(1), Chunk.appendAll(Chunk.make(2, 3, 4)))
      expect(pipe(self, Chunk.drop(2), Chunk.toReadonlyArray)).toEqual([3, 4])
    })
  })

  describe("dropRight", () => {
    describe("Given a Chunk and an amount to drop below the length", () => {
      const chunk = Chunk.unsafeFromArray([1, 2, 3])
      const toDrop = 1

      it("should remove the given amount of items", () => {
        expect(pipe(chunk, Chunk.dropRight(toDrop))).toEqual(Chunk.unsafeFromArray([1, 2]))
      })
    })

    describe("Given a Chunk and an amount to drop above the length", () => {
      const chunk = Chunk.unsafeFromArray([1, 2])
      const toDrop = 3

      it("should return an empty chunk", () => {
        expect(pipe(chunk, Chunk.dropRight(toDrop))).toEqual(Chunk.unsafeFromArray([]))
      })
    })
  })

  describe("dropWhile", () => {
    describe("Given a Chunk and a criteria that applies to part of the chunk", () => {
      const chunk = Chunk.unsafeFromArray([1, 2, 3])
      const criteria = (n: number) => n < 3

      it("should return the subset that doesn't pass the criteria", () => {
        expect(pipe(chunk, Chunk.dropWhile(criteria))).toEqual(Chunk.unsafeFromArray([3]))
      })
    })

    describe("Given a Chunk and a criteria that applies to the whole chunk", () => {
      const chunk = Chunk.unsafeFromArray([1, 2, 3])
      const criteria = (n: number) => n < 4

      it("should return an empty chunk", () => {
        expect(pipe(chunk, Chunk.dropWhile(criteria))).toEqual(Chunk.unsafeFromArray([]))
      })
    })
  })

  describe("concat", () => {
    describe("Given 2 chunks of the same length", () => {
      const chunk1 = Chunk.unsafeFromArray([0, 1])
      const chunk2 = Chunk.unsafeFromArray([2, 3])

      it("should concatenate them following order", () => {
        expect(pipe(chunk1, Chunk.appendAll(chunk2))).toEqual(Chunk.unsafeFromArray([0, 1, 2, 3]))
      })
    })

    describe("Given 2 chunks where the first one has more elements than the second one", () => {
      const chunk1 = Chunk.unsafeFromArray([1, 2])
      const chunk2 = Chunk.unsafeFromArray([3])

      it("should concatenate them following order", () => {
        expect(pipe(chunk1, Chunk.appendAll(chunk2))).toEqual(Chunk.unsafeFromArray([1, 2, 3]))
      })
    })

    describe("Given 2 chunks where the first one has fewer elements than the second one", () => {
      const chunk1 = Chunk.unsafeFromArray([1])
      const chunk2 = Chunk.unsafeFromArray([2, 3, 4])

      it("should concatenate them following order", () => {
        expect(pipe(chunk1, Chunk.appendAll(chunk2))).toEqual(Chunk.unsafeFromArray([1, 2, 3, 4]))
      })
    })

    describe("Given 2 chunks where the first one is appended", () => {
      const chunk1 = pipe(
        Chunk.empty(),
        Chunk.append(1)
      )
      const chunk2 = Chunk.unsafeFromArray([2, 3, 4])

      it("should concatenate them following order", () => {
        expect(pipe(chunk1, Chunk.appendAll(chunk2))).toEqual(Chunk.unsafeFromArray([1, 2, 3, 4]))
      })
    })

    describe("Given 2 chunks where the second one is appended", () => {
      const chunk1 = Chunk.unsafeFromArray([1])
      const chunk2 = pipe(
        Chunk.empty(),
        Chunk.prepend(2)
      )

      it("should concatenate them following order", () => {
        expect(pipe(chunk1, Chunk.appendAll(chunk2))).toEqual(Chunk.unsafeFromArray([1, 2]))
      })
    })

    describe("Given 2 chunks where the first one is empty", () => {
      const chunk1 = Chunk.empty()
      const chunk2 = Chunk.unsafeFromArray([1, 2])

      it("should concatenate them following order", () => {
        expect(pipe(chunk1, Chunk.appendAll(chunk2))).toEqual(Chunk.unsafeFromArray([1, 2]))
      })
    })

    describe("Given 2 chunks where the second one is empty", () => {
      const chunk1 = Chunk.unsafeFromArray([1, 2])
      const chunk2 = Chunk.empty()

      it("should concatenate them following order", () => {
        expect(pipe(chunk1, Chunk.appendAll(chunk2))).toEqual(Chunk.unsafeFromArray([1, 2]))
      })
    })

    describe("Given several chunks concatenated with each", () => {
      const chunk1 = Chunk.empty()
      const chunk2 = Chunk.unsafeFromArray([1])
      const chunk3 = Chunk.unsafeFromArray([2])
      const chunk4 = Chunk.unsafeFromArray([3, 4])
      const chunk5 = Chunk.unsafeFromArray([5, 6])

      it("should concatenate them following order", () => {
        expect(
          pipe(
            chunk1,
            Chunk.appendAll(chunk2),
            Chunk.appendAll(chunk3),
            Chunk.appendAll(chunk4),
            Chunk.appendAll(chunk5)
          )
        )
          .toEqual(Chunk.unsafeFromArray([1, 2, 3, 4, 5, 6]))
      })
    })
    // TODO add tests for 100% coverage: left & right diff depths & depth > 0
  })

  it("zip", () => {
    pipe(
      Chunk.empty(),
      Chunk.zip(Chunk.empty()),
      Equal.equals(Chunk.unsafeFromArray([])),
      assert.isTrue
    )
    pipe(
      Chunk.empty(),
      Chunk.zip(Chunk.of(1)),
      Equal.equals(Chunk.unsafeFromArray([])),
      assert.isTrue
    )
    pipe(
      Chunk.of(1),
      Chunk.zip(Chunk.empty()),
      Equal.equals(Chunk.unsafeFromArray([])),
      assert.isTrue
    )
    expect(pipe(
      Chunk.of(1),
      Chunk.zip(Chunk.of(2)),
      Chunk.toReadonlyArray
    )).toEqual([[1, 2]])
  })

  describe("Given two non-materialized chunks of different sizes", () => {
    it("should zip the chunks together and drop the leftover", () => {
      // Create two non-materialized Chunks
      const left = pipe(Chunk.make(-1, 0, 1), Chunk.drop(1))
      const right = pipe(Chunk.make(1, 0, 0, 1), Chunk.drop(1))
      const zipped = pipe(left, Chunk.zipWith(pipe(right, Chunk.take(left.length)), (a, b) => [a, b]))
      expect(Array.from(zipped)).toEqual([[0, 0], [1, 0]])
    })
  })

  it("last", () => {
    expect(Chunk.last(Chunk.empty())).toEqual(Option.none())
    expect(Chunk.last(Chunk.make(1, 2, 3))).toEqual(Option.some(3))
  })

  it("map", () => {
    expect(Chunk.map(Chunk.empty(), (n) => n + 1)).toEqual(Chunk.empty())
    expect(Chunk.map(Chunk.of(1), (n) => n + 1)).toEqual(Chunk.of(2))
    expect(Chunk.map(Chunk.make(1, 2, 3), (n) => n + 1)).toEqual(Chunk.make(2, 3, 4))
    expect(Chunk.map(Chunk.make(1, 2, 3), (n, i) => n + i)).toEqual(Chunk.make(1, 3, 5))
  })

  it("mapAccum", () => {
    expect(Chunk.mapAccum(Chunk.make(1, 2, 3), "-", (s, a) => [s + a, a + 1])).toEqual(["-123", Chunk.make(2, 3, 4)])
  })

  it("partition", () => {
    expect(Chunk.partition(Chunk.empty(), (n) => n > 2)).toEqual([Chunk.empty(), Chunk.empty()])
    expect(Chunk.partition(Chunk.make(1, 3), (n) => n > 2)).toEqual([Chunk.make(1), Chunk.make(3)])

    expect(Chunk.partition(Chunk.empty(), (n, i) => n + i > 2)).toEqual([Chunk.empty(), Chunk.empty()])
    expect(Chunk.partition(Chunk.make(1, 2), (n, i) => n + i > 2)).toEqual([Chunk.make(1), Chunk.make(2)])
  })

  it("partitionMap", () => {
    expect(Chunk.partitionMap(Chunk.empty(), identity)).toEqual([Chunk.empty(), Chunk.empty()])
    expect(Chunk.partitionMap(Chunk.make(E.right(1), E.left("a"), E.right(2)), identity)).toEqual([
      Chunk.make("a"),
      Chunk.make(1, 2)
    ])
  })

  it("separate", () => {
    expect(Chunk.separate(Chunk.empty())).toEqual([Chunk.empty(), Chunk.empty()])
    expect(Chunk.separate(Chunk.make(E.right(1), E.left("e"), E.right(2)))).toEqual([
      Chunk.make("e"),
      Chunk.make(1, 2)
    ])
  })

  it("size", () => {
    expect(Chunk.size(Chunk.empty())).toEqual(0)
    expect(Chunk.size(Chunk.make(1, 2, 3))).toEqual(3)
  })

  it("split", () => {
    expect(pipe(Chunk.empty(), Chunk.split(2))).toEqual(Chunk.empty())
    expect(pipe(Chunk.make(1), Chunk.split(2))).toEqual(
      Chunk.make(Chunk.make(1))
    )
    expect(pipe(Chunk.make(1, 2), Chunk.split(2))).toEqual(
      Chunk.make(Chunk.make(1), Chunk.make(2))
    )
    expect(pipe(Chunk.make(1, 2, 3, 4, 5), Chunk.split(2))).toEqual(
      Chunk.make(Chunk.make(1, 2, 3), Chunk.make(4, 5))
    )
    expect(pipe(Chunk.make(1, 2, 3, 4, 5), Chunk.split(3))).toEqual(
      Chunk.make(Chunk.make(1, 2), Chunk.make(3, 4), Chunk.make(5))
    )
  })

  it("tail", () => {
    expect(Chunk.tail(Chunk.empty())).toEqual(Option.none())
    expect(Chunk.tail(Chunk.make(1, 2, 3))).toEqual(Option.some(Chunk.make(2, 3)))
  })

  it("filter", () => {
    Util.deepStrictEqual(Chunk.filter(Chunk.make(1, 2, 3), (n) => n % 2 === 1), Chunk.make(1, 3))
    assert.deepStrictEqual(
      Chunk.filter(Chunk.make(Option.some(3), Option.some(2), Option.some(1)), Option.isSome),
      Chunk.make(Option.some(3), Option.some(2), Option.some(1)) as any
    )
    assert.deepStrictEqual(
      Chunk.filter(Chunk.make(Option.some(3), Option.none(), Option.some(1)), Option.isSome),
      Chunk.make(Option.some(3), Option.some(1)) as any
    )
  })

  it("filterMapWhile", () => {
    expect(Chunk.filterMapWhile(Chunk.make(1, 3, 4, 5), (n) => n % 2 === 1 ? Option.some(n) : Option.none())).toEqual(
      Chunk.make(1, 3)
    )
  })

  it("compact", () => {
    expect(Chunk.compact(Chunk.empty())).toEqual(Chunk.empty())
    expect(Chunk.compact(Chunk.make(Option.some(1), Option.some(2), Option.some(3)))).toEqual(Chunk.make(1, 2, 3))
    expect(Chunk.compact(Chunk.make(Option.some(1), Option.none(), Option.some(3)))).toEqual(Chunk.make(1, 3))
  })

  it("dedupeAdjacent", () => {
    expect(Chunk.dedupeAdjacent(Chunk.empty())).toEqual(Chunk.empty())
    expect(Chunk.dedupeAdjacent(Chunk.make(1, 2, 3))).toEqual(Chunk.make(1, 2, 3))
    expect(Chunk.dedupeAdjacent(Chunk.make(1, 2, 2, 3, 3))).toEqual(Chunk.make(1, 2, 3))
  })

  it("flatMap", () => {
    expect(Chunk.flatMap(Chunk.make(1), (n) => Chunk.make(n, n + 1))).toEqual(Chunk.make(1, 2))
    expect(Chunk.flatMap(Chunk.make(1, 2, 3), (n) => Chunk.make(n, n + 1))).toEqual(Chunk.make(1, 2, 2, 3, 3, 4))
  })

  it("union", () => {
    expect(Chunk.union(Chunk.make(1, 2, 3), Chunk.empty())).toEqual(Chunk.make(1, 2, 3))
    expect(Chunk.union(Chunk.empty(), Chunk.make(1, 2, 3))).toEqual(Chunk.make(1, 2, 3))
    expect(Chunk.union(Chunk.make(1, 2, 3), Chunk.make(2, 3, 4))).toEqual(Chunk.make(1, 2, 3, 4))
  })

  it("intersection", () => {
    expect(Chunk.intersection(Chunk.make(1, 2, 3), Chunk.empty())).toEqual(Chunk.empty())
    expect(Chunk.intersection(Chunk.empty(), Chunk.make(2, 3, 4))).toEqual(Chunk.empty())
    expect(Chunk.intersection(Chunk.make(1, 2, 3), Chunk.make(2, 3, 4))).toEqual(Chunk.make(2, 3))
  })

  it("isEmpty", () => {
    expect(Chunk.isEmpty(Chunk.empty())).toEqual(true)
    expect(Chunk.isEmpty(Chunk.make(1))).toEqual(false)
  })

  it("unsafeLast", () => {
    expect(Chunk.unsafeLast(Chunk.make(1))).toEqual(1)
    expect(Chunk.unsafeLast(Chunk.make(1, 2, 3))).toEqual(3)
    expect(() => Chunk.unsafeLast(Chunk.empty())).toThrow(new Error("Index out of bounds"))
  })

  it("splitNonEmptyAt", () => {
    expect(pipe(Chunk.make(1, 2, 3, 4), Chunk.splitNonEmptyAt(2))).toStrictEqual([Chunk.make(1, 2), Chunk.make(3, 4)])
    expect(pipe(Chunk.make(1, 2, 3, 4), Chunk.splitNonEmptyAt(10))).toStrictEqual([
      Chunk.make(1, 2, 3, 4),
      Chunk.empty()
    ])
  })

  it("splitWhere", () => {
    expect(Chunk.splitWhere(Chunk.empty(), (n) => n > 1)).toEqual([Chunk.empty(), Chunk.empty()])
    expect(Chunk.splitWhere(Chunk.make(1, 2, 3), (n) => n > 1)).toEqual([Chunk.make(1), Chunk.make(2, 3)])
  })

  it("takeWhile", () => {
    expect(Chunk.takeWhile(Chunk.empty(), (n) => n <= 2)).toEqual(Chunk.empty())
    expect(Chunk.takeWhile(Chunk.make(1, 2, 3), (n) => n <= 2)).toEqual(Chunk.make(1, 2))
  })

  it("dedupe", () => {
    expect(Chunk.dedupe(Chunk.empty())).toEqual(Chunk.empty())
    expect(Chunk.dedupe(Chunk.make(1, 2, 3))).toEqual(Chunk.make(1, 2, 3))
    expect(Chunk.dedupe(Chunk.make(1, 2, 3, 2, 1, 3))).toEqual(Chunk.make(1, 2, 3))
  })

  it("unzip", () => {
    expect(Chunk.unzip(Chunk.empty())).toEqual([Chunk.empty(), Chunk.empty()])
    expect(Chunk.unzip(Chunk.make(["a", 1] as const, ["b", 2] as const))).toEqual([
      Chunk.make("a", "b"),
      Chunk.make(1, 2)
    ])
  })

  it("reverse", () => {
    expect(Chunk.reverse(Chunk.empty())).toEqual(Chunk.empty())
    expect(Chunk.reverse(Chunk.make(1, 2, 3))).toEqual(Chunk.make(3, 2, 1))
    expect(Chunk.reverse(Chunk.take(Chunk.make(1, 2, 3, 4), 3))).toEqual(Chunk.make(3, 2, 1))
  })

  it("flatten", () => {
    expect(Chunk.flatten(Chunk.make(Chunk.make(1), Chunk.make(2), Chunk.make(3)))).toEqual(Chunk.make(1, 2, 3))
  })

  it("makeBy", () => {
    expect(Chunk.makeBy(5, (n) => n * 2)).toEqual(Chunk.make(0, 2, 4, 6, 8))
    expect(Chunk.makeBy(2.2, (n) => n * 2)).toEqual(Chunk.make(0, 2))
  })

  it("range", () => {
    expect(Chunk.range(0, 0)).toEqual(Chunk.make(0))
    expect(Chunk.range(0, 1)).toEqual(Chunk.make(0, 1))
    expect(Chunk.range(1, 5)).toEqual(Chunk.make(1, 2, 3, 4, 5))
    expect(Chunk.range(10, 15)).toEqual(Chunk.make(10, 11, 12, 13, 14, 15))
    expect(Chunk.range(-1, 0)).toEqual(Chunk.make(-1, 0))
    expect(Chunk.range(-5, -1)).toEqual(Chunk.make(-5, -4, -3, -2, -1))
    // out of bound
    expect(Chunk.range(2, 1)).toEqual(Chunk.make(2))
    expect(Chunk.range(-1, -2)).toEqual(Chunk.make(-1))
  })

  it("some", () => {
    const isPositive: Predicate<number> = (n) => n > 0
    expect(Chunk.some(Chunk.make(-1, -2, 3), isPositive)).toEqual(true)
    expect(Chunk.some(Chunk.make(-1, -2, -3), isPositive)).toEqual(false)
  })

  it("forEach", () => {
    const as: Array<number> = []
    Chunk.forEach(Chunk.make(1, 2, 3, 4), (n) => as.push(n))
    expect(as).toEqual([1, 2, 3, 4])
  })

  it("sortWith", () => {
    type X = {
      a: string
      b: number
    }
    const chunk: Chunk.Chunk<X> = Chunk.make({ a: "a", b: 2 }, { a: "b", b: 1 })
    expect(Chunk.sortWith(chunk, (x) => x.b, Order.number)).toEqual(Chunk.make({ a: "b", b: 1 }, { a: "a", b: 2 }))
  })

  it("getEquivalence", () => {
    const equivalence = Chunk.getEquivalence(N.Equivalence)
    expect(equivalence(Chunk.empty(), Chunk.empty())).toBe(true)
    expect(equivalence(Chunk.make(1, 2, 3), Chunk.make(1, 2, 3))).toBe(true)
    expect(equivalence(Chunk.make(1, 2, 3), Chunk.make(1, 2))).toBe(false)
    expect(equivalence(Chunk.make(1, 2, 3), Chunk.make(1, 2, 4))).toBe(false)
  })

  it("differenceWith", () => {
    const eq = <E extends { id: number }>(a: E, b: E) => a.id === b.id
    const diffW = pipe(eq, Chunk.differenceWith)

    const curr = Chunk.make({ id: 1 }, { id: 2 }, { id: 3 })

    expect(diffW(Chunk.make({ id: 1 }, { id: 2 }), curr)).toEqual(Chunk.make({ id: 3 }))
    expect(diffW(Chunk.empty(), curr)).toEqual(curr)
    expect(diffW(curr, Chunk.empty())).toEqual(Chunk.empty())
    expect(diffW(curr, curr)).toEqual(Chunk.empty())
  })

  it("difference", () => {
    const curr = Chunk.make(1, 3, 5, 7, 9)

    expect(Chunk.difference(Chunk.make(1, 2, 3, 4, 5), curr)).toEqual(Chunk.make(7, 9))
    expect(Chunk.difference(Chunk.empty(), curr)).toEqual(curr)
    expect(Chunk.difference(curr, Chunk.empty())).toEqual(Chunk.empty())
    expect(Chunk.difference(curr, curr)).toEqual(Chunk.empty())
  })
})
