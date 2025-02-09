import { describe, it } from "@effect/vitest"
import {
  Array as Arr,
  Chunk,
  Either,
  Equal,
  FastCheck as fc,
  identity,
  Number as Num,
  Option,
  Order,
  pipe,
  type Predicate
} from "effect"
import {
  assertEquals,
  assertFalse,
  assertNone,
  assertSome,
  assertTrue,
  deepStrictEqual,
  doesNotThrow,
  strictEqual,
  throws
} from "effect/test/util"

const assertTuple = <A, B>(
  actual: [Chunk.Chunk<A>, Chunk.Chunk<B>],
  expected: [Chunk.Chunk<A>, Chunk.Chunk<B>]
) => {
  assertEquals(actual[0], expected[0])
  assertEquals(actual[1], expected[1])
}

describe("Chunk", () => {
  it("Equal.equals", () => {
    assertTrue(Equal.equals(Chunk.make(0), Chunk.make(0)))
    assertTrue(Equal.equals(Chunk.make(1, 2, 3), Chunk.make(1, 2, 3)))
    assertFalse(Equal.equals(Chunk.make(1, 2, 3), Chunk.make(1, 2)))
    assertFalse(Equal.equals(Chunk.make(1, 2), Chunk.make(1, 2, 3)))
    assertFalse(Equal.equals(Chunk.make(1, 2, 3), Chunk.make(1, "a", 3)))
    assertFalse(Equal.equals(Chunk.make(0), [0]))
  })

  it("toString", () => {
    strictEqual(
      String(Chunk.make(0, 1, 2)),
      `{
  "_id": "Chunk",
  "values": [
    0,
    1,
    2
  ]
}`
    )
    strictEqual(
      String(Chunk.make(Chunk.make(1, 2, 3))),
      `{
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
}`
    )
  })

  it("toJSON", () => {
    deepStrictEqual(Chunk.make(0, 1, 2).toJSON(), { _id: "Chunk", values: [0, 1, 2] })
    deepStrictEqual(Chunk.make(Chunk.make(1, 2, 3)).toJSON(), {
      _id: "Chunk",
      values: [{ _id: "Chunk", values: [1, 2, 3] }]
    })
  })

  it("inspect", () => {
    if (typeof window === "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { inspect } = require("node:util")
      assertEquals(inspect(Chunk.make(0, 1, 2)), inspect({ _id: "Chunk", values: [0, 1, 2] }))
    }
  })

  it("modifyOption", () => {
    assertNone(pipe(Chunk.empty(), Chunk.modifyOption(0, (n: number) => n * 2)))
    assertSome(
      pipe(Chunk.make(1, 2, 3), Chunk.modifyOption(0, (n: number) => n * 2)),
      Chunk.make(2, 2, 3)
    )
  })

  it("modify", () => {
    assertEquals(pipe(Chunk.empty(), Chunk.modify(0, (n: number) => n * 2)), Chunk.empty())
    assertEquals(pipe(Chunk.make(1, 2, 3), Chunk.modify(0, (n: number) => n * 2)), Chunk.make(2, 2, 3))
  })

  it("replaceOption", () => {
    assertNone(pipe(Chunk.empty(), Chunk.replaceOption(0, 2)))
    assertSome(pipe(Chunk.make(1, 2, 3), Chunk.replaceOption(0, 2)), Chunk.make(2, 2, 3))
  })

  it("replace", () => {
    assertEquals(pipe(Chunk.empty(), Chunk.replace(0, 2)), Chunk.empty())
    assertEquals(pipe(Chunk.make(1, 2, 3), Chunk.replace(0, 2)), Chunk.make(2, 2, 3))
  })

  it("remove", () => {
    assertEquals(pipe(Chunk.empty(), Chunk.remove(0)), Chunk.empty())
    assertEquals(pipe(Chunk.make(1, 2, 3), Chunk.remove(0)), Chunk.make(2, 3))
  })

  it("chunksOf", () => {
    assertEquals(pipe(Chunk.empty(), Chunk.chunksOf(2)), Chunk.empty())
    assertEquals(
      pipe(Chunk.make(1, 2, 3, 4, 5), Chunk.chunksOf(2)),
      Chunk.make(Chunk.make(1, 2), Chunk.make(3, 4), Chunk.make(5))
    )
    assertEquals(
      pipe(Chunk.make(1, 2, 3, 4, 5, 6), Chunk.chunksOf(2)),
      Chunk.make(Chunk.make(1, 2), Chunk.make(3, 4), Chunk.make(5, 6))
    )
    assertEquals(
      pipe(Chunk.make(1, 2, 3, 4, 5), Chunk.chunksOf(1)),
      Chunk.make(Chunk.make(1), Chunk.make(2), Chunk.make(3), Chunk.make(4), Chunk.make(5))
    )
    assertEquals(pipe(Chunk.make(1, 2, 3, 4, 5), Chunk.chunksOf(5)), Chunk.make(Chunk.make(1, 2, 3, 4, 5)))
    // out of bounds
    assertEquals(
      pipe(Chunk.make(1, 2, 3, 4, 5), Chunk.chunksOf(0)),
      Chunk.make(Chunk.make(1), Chunk.make(2), Chunk.make(3), Chunk.make(4), Chunk.make(5))
    )
    assertEquals(
      pipe(Chunk.make(1, 2, 3, 4, 5), Chunk.chunksOf(-1)),
      Chunk.make(Chunk.make(1), Chunk.make(2), Chunk.make(3), Chunk.make(4), Chunk.make(5))
    )
    assertEquals(pipe(Chunk.make(1, 2, 3, 4, 5), Chunk.chunksOf(10)), Chunk.make(Chunk.make(1, 2, 3, 4, 5)))
  })

  it(".pipe() method", () => {
    assertEquals(Chunk.empty().pipe(Chunk.append(1)), Chunk.make(1))
  })

  describe("toArray", () => {
    it("should return an empty array for an empty chunk", () => {
      deepStrictEqual(Chunk.toArray(Chunk.empty()), [])
    })

    it("should return an array with the elements of the chunk", () => {
      deepStrictEqual(Chunk.toArray(Chunk.make(1, 2, 3)), [1, 2, 3])
    })

    it("should not affect the original chunk when the array is mutated", () => {
      const chunk = Chunk.make(1, 2, 3)
      const arr = Chunk.toArray(chunk)
      // mutate the array
      arr[1] = 4
      // the chunk should not be affected
      deepStrictEqual(Chunk.toArray(chunk), [1, 2, 3])
    })
  })

  describe("toReadonlyArray", () => {
    describe("Given an empty Chunk", () => {
      const chunk = Chunk.empty()
      it("should give back an empty readonly array", () => {
        deepStrictEqual(Chunk.toReadonlyArray(chunk), [])
      })
    })

    describe("Given a large Chunk", () => {
      const len = 100_000
      let chunk = Chunk.empty<number>()
      for (let i = 0; i < len; i++) chunk = Chunk.appendAll(Chunk.of(i), chunk)

      it("gives back a readonly array", () => {
        doesNotThrow(() => Chunk.toReadonlyArray(chunk))
        deepStrictEqual(Chunk.toReadonlyArray(chunk), Arr.reverse(Arr.range(0, len - 1)))
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
        assertTrue(rchunk.depth >= lchunk.depth - 3)
        assertTrue(rchunk.depth <= lchunk.depth + 3)
      })
    })
  })

  describe("isChunk", () => {
    describe("Given a chunk", () => {
      const chunk = Chunk.make(0, 1)
      it("should be true", () => {
        assertTrue(Chunk.isChunk(chunk))
      })
    })
    describe("Given an object", () => {
      const object = {}
      it("should be false", () => {
        assertFalse(Chunk.isChunk(object))
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
        assertEquals(Chunk.fromIterable(myIterable), Chunk.unsafeFromArray([1, 2, 3, 4, 5]))
      })
    })

    it("should return the same reference if the input is a Chunk", () => {
      const expected = Chunk.make(1, 2, 3)
      const actual = Chunk.fromIterable(expected)
      assertTrue(actual === expected)
    })
  })

  describe("get", () => {
    describe("Given a Chunk and an index within the bounds", () => {
      const chunk = Chunk.unsafeFromArray([1, 2, 3])
      const index = 0

      it("should a Some with the value", () => {
        deepStrictEqual(pipe(chunk, Chunk.get(index)), Option.some(1))
      })
    })

    describe("Given a Chunk and an index out of bounds", () => {
      const chunk = Chunk.unsafeFromArray([1, 2, 3])

      it("should return a None", () => {
        assertNone(pipe(chunk, Chunk.get(4)))
      })
    })
  })

  describe("unsafeGet", () => {
    describe("Given an empty Chunk and an index", () => {
      const chunk = Chunk.empty()
      const index = 4

      it("should throw", () => {
        throws(() => pipe(chunk, Chunk.unsafeGet(index)))
      })
    })

    describe("Given an appended Chunk and an index out of bounds", () => {
      const chunk = pipe(Chunk.empty(), Chunk.append(1))
      const index = 4

      it("should throw", () => {
        throws(() => pipe(chunk, Chunk.unsafeGet(index)))
      })
    })

    describe("Given an appended Chunk and an index in bounds", () => {
      it("should return the value", () => {
        const chunk = pipe(Chunk.make(0, 1, 2), Chunk.append(3))
        strictEqual(Chunk.unsafeGet(1)(chunk), 1)
      })
    })

    describe("Given a prepended Chunk and an index out of bounds", () => {
      it("should throw", () => {
        fc.assert(fc.property(fc.array(fc.anything()), (array) => {
          let chunk: Chunk.Chunk<unknown> = Chunk.empty()
          array.forEach((e) => {
            chunk = pipe(chunk, Chunk.prepend(e))
          })
          throws(() => pipe(chunk, Chunk.unsafeGet(array.length)))
        }))
      })
    })

    describe("Given a prepended Chunk and an index in bounds", () => {
      it("should return the value", () => {
        const chunk = pipe(Chunk.make(0, 1, 2), Chunk.prepend(3))
        strictEqual(Chunk.unsafeGet(1)(chunk), 0)
      })
    })

    describe("Given a singleton Chunk and an index out of bounds", () => {
      const chunk = pipe(Chunk.make(1))
      const index = 4

      it("should throw", () => {
        throws(() => pipe(chunk, Chunk.unsafeGet(index)))
      })
    })

    describe("Given an array Chunk and an index out of bounds", () => {
      const chunk = pipe(Chunk.unsafeFromArray([1, 2]))
      const index = 4

      it("should throw", () => {
        throws(() => pipe(chunk, Chunk.unsafeGet(index)))
      })
    })

    describe("Given a concat Chunk and an index out of bounds", () => {
      it("should throw", () => {
        fc.assert(fc.property(fc.array(fc.anything()), fc.array(fc.anything()), (arr1, arr2) => {
          const chunk: Chunk.Chunk<unknown> = Chunk.appendAll(Chunk.fromIterable(arr2))(Chunk.unsafeFromArray(arr1))
          throws(() => pipe(chunk, Chunk.unsafeGet(arr1.length + arr2.length)))
        }))
      })
    })

    describe("Given an appended Chunk and an index in bounds", () => {
      const chunk = pipe(Chunk.empty(), Chunk.append(1), Chunk.append(2))
      const index = 1

      it("should return the value", () => {
        strictEqual(pipe(chunk, Chunk.unsafeGet(index)), 2)
      })
    })

    describe("Given a prepended Chunk and an index in bounds", () => {
      const chunk = pipe(Chunk.empty(), Chunk.prepend(2), Chunk.prepend(1))
      const index = 1

      it("should return the value", () => {
        strictEqual(pipe(chunk, Chunk.unsafeGet(index)), 2)
      })
    })

    describe("Given a singleton Chunk and an index in bounds", () => {
      const chunk = pipe(Chunk.make(1))
      const index = 0

      it("should return the value", () => {
        strictEqual(pipe(chunk, Chunk.unsafeGet(index)), 1)
      })
    })

    describe("Given an array Chunk and an index in bounds", () => {
      const chunk = pipe(Chunk.unsafeFromArray([1, 2, 3]))
      const index = 1

      it("should return the value", () => {
        strictEqual(pipe(chunk, Chunk.unsafeGet(index)), 2)
      })
    })

    describe("Given a concat Chunk and an index in bounds", () => {
      it("should return the value", () => {
        fc.assert(fc.property(fc.array(fc.anything()), fc.array(fc.anything()), (a, b) => {
          const c = [...a, ...b]
          const d = Chunk.appendAll(Chunk.unsafeFromArray(b))(Chunk.unsafeFromArray(a))
          for (let i = 0; i < c.length; i++) {
            deepStrictEqual(Chunk.unsafeGet(i)(d), c[i])
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
          deepStrictEqual(Chunk.toReadonlyArray(chunk), [...a, ...b])
        }
      )
    )
  })

  it("prependAll", () => {
    assertEquals(pipe(Chunk.empty(), Chunk.prependAll(Chunk.make(1))), Chunk.make(1))
    assertEquals(pipe(Chunk.make(1), Chunk.prependAll(Chunk.empty())), Chunk.make(1))

    assertEquals(pipe(Chunk.empty(), Chunk.prependAll(Chunk.make(1, 2))), Chunk.make(1, 2))
    assertEquals(pipe(Chunk.make(1, 2), Chunk.prependAll(Chunk.empty())), Chunk.make(1, 2))

    assertEquals(pipe(Chunk.make(2, 3), Chunk.prependAll(Chunk.make(1))), Chunk.make(1, 2, 3))
    assertEquals(pipe(Chunk.make(3), Chunk.prependAll(Chunk.make(1, 2))), Chunk.make(1, 2, 3))
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
          deepStrictEqual(Chunk.toReadonlyArray(chunk), [...b, ...a])
        }
      )
    )
  })

  describe("take", () => {
    describe("Given a Chunk with more elements than the amount taken", () => {
      it("should return the subset", () => {
        assertEquals(pipe(Chunk.unsafeFromArray([1, 2, 3]), Chunk.take(2)), Chunk.unsafeFromArray([1, 2]))
      })
    })

    describe("Given a Chunk with fewer elements than the amount taken", () => {
      const chunk = Chunk.unsafeFromArray([1, 2, 3])
      const amount = 5

      it("should return the available subset", () => {
        assertEquals(pipe(chunk, Chunk.take(amount)), Chunk.unsafeFromArray([1, 2, 3]))
      })
    })

    describe("Given a slice Chunk with and an amount", () => {
      const chunk = pipe(Chunk.unsafeFromArray([1, 2, 3, 4, 5]), Chunk.take(4))
      const amount = 3

      it("should return the available subset", () => {
        assertEquals(pipe(chunk, Chunk.take(amount)), Chunk.unsafeFromArray([1, 2, 3]))
      })
    })

    describe("Given a singleton Chunk with and an amount > 1", () => {
      const chunk = Chunk.make(1)
      const amount = 2

      it("should return the available subset", () => {
        assertEquals(pipe(chunk, Chunk.take(amount)), Chunk.unsafeFromArray([1]))
      })
    })

    describe("Given a concatenated Chunk and an amount > 1", () => {
      const chunk = pipe(Chunk.of(1), Chunk.appendAll(Chunk.make(2, 3, 4)))
      const amount = 2

      it("should return the available subset", () => {
        deepStrictEqual(pipe(chunk, Chunk.take(amount), Chunk.toReadonlyArray), [1, 2])
      })
    })

    describe("Given a concatenated Chunk and an amount <= self.left", () => {
      it("should return the available subset", () => {
        const chunk = Chunk.appendAll(Chunk.make(2, 3, 4), Chunk.of(1))
        deepStrictEqual(pipe(chunk, Chunk.take(2), Chunk.toReadonlyArray), [2, 3])
        deepStrictEqual(pipe(chunk, Chunk.take(3), Chunk.toReadonlyArray), [2, 3, 4])
      })
    })
  })

  describe("make", () => {
    it("should return a NonEmptyChunk", () => {
      strictEqual(Chunk.make(0, 1).length, 2)
    })
  })

  describe("singleton", () => {
    it("should return a NonEmptyChunk", () => {
      strictEqual(Chunk.of(1).length, 1)
    })
    it("should return a ISingleton", () => {
      strictEqual(Chunk.of(1).backing._tag, "ISingleton")
    })
  })

  describe("drop", () => {
    it("should return self on 0", () => {
      const self = Chunk.make(0, 1)
      strictEqual(Chunk.drop(0)(self), self)
    })
    it("should drop twice", () => {
      const self = Chunk.make(0, 1, 2, 3)
      deepStrictEqual(Chunk.toReadonlyArray(Chunk.drop(1)(Chunk.drop(1)(self))), [2, 3])
    })
    it("should handle concatenated chunks", () => {
      const self = pipe(Chunk.make(1), Chunk.appendAll(Chunk.make(2, 3, 4)))
      deepStrictEqual(pipe(self, Chunk.drop(2), Chunk.toReadonlyArray), [3, 4])
    })
  })

  describe("dropRight", () => {
    describe("Given a Chunk and an amount to drop below the length", () => {
      const chunk = Chunk.unsafeFromArray([1, 2, 3])
      const toDrop = 1

      it("should remove the given amount of items", () => {
        assertEquals(pipe(chunk, Chunk.dropRight(toDrop)), Chunk.unsafeFromArray([1, 2]))
      })
    })

    describe("Given a Chunk and an amount to drop above the length", () => {
      const chunk = Chunk.unsafeFromArray([1, 2])
      const toDrop = 3

      it("should return an empty chunk", () => {
        assertEquals(pipe(chunk, Chunk.dropRight(toDrop)), Chunk.unsafeFromArray([]))
      })
    })
  })

  describe("dropWhile", () => {
    describe("Given a Chunk and a criteria that applies to part of the chunk", () => {
      const chunk = Chunk.unsafeFromArray([1, 2, 3])
      const criteria = (n: number) => n < 3

      it("should return the subset that doesn't pass the criteria", () => {
        assertEquals(pipe(chunk, Chunk.dropWhile(criteria)), Chunk.unsafeFromArray([3]))
      })
    })

    describe("Given a Chunk and a criteria that applies to the whole chunk", () => {
      const chunk = Chunk.unsafeFromArray([1, 2, 3])
      const criteria = (n: number) => n < 4

      it("should return an empty chunk", () => {
        assertEquals(pipe(chunk, Chunk.dropWhile(criteria)), Chunk.unsafeFromArray([]))
      })
    })
  })

  describe("concat", () => {
    describe("Given 2 chunks of the same length", () => {
      const chunk1 = Chunk.unsafeFromArray([0, 1])
      const chunk2 = Chunk.unsafeFromArray([2, 3])

      it("should concatenate them following order", () => {
        assertEquals(pipe(chunk1, Chunk.appendAll(chunk2)), Chunk.unsafeFromArray([0, 1, 2, 3]))
      })
    })

    describe("Given 2 chunks where the first one has more elements than the second one", () => {
      const chunk1 = Chunk.unsafeFromArray([1, 2])
      const chunk2 = Chunk.unsafeFromArray([3])

      it("should concatenate them following order", () => {
        assertEquals(pipe(chunk1, Chunk.appendAll(chunk2)), Chunk.unsafeFromArray([1, 2, 3]))
      })
    })

    describe("Given 2 chunks where the first one has fewer elements than the second one", () => {
      const chunk1 = Chunk.unsafeFromArray([1])
      const chunk2 = Chunk.unsafeFromArray([2, 3, 4])

      it("should concatenate them following order", () => {
        assertEquals(pipe(chunk1, Chunk.appendAll(chunk2)), Chunk.unsafeFromArray([1, 2, 3, 4]))
      })
    })

    describe("Given 2 chunks where the first one is appended", () => {
      const chunk1 = pipe(
        Chunk.empty(),
        Chunk.append(1)
      )
      const chunk2 = Chunk.unsafeFromArray([2, 3, 4])

      it("should concatenate them following order", () => {
        assertEquals(pipe(chunk1, Chunk.appendAll(chunk2)), Chunk.unsafeFromArray([1, 2, 3, 4]))
      })
    })

    describe("Given 2 chunks where the second one is appended", () => {
      const chunk1 = Chunk.unsafeFromArray([1])
      const chunk2 = pipe(
        Chunk.empty(),
        Chunk.prepend(2)
      )

      it("should concatenate them following order", () => {
        assertEquals(pipe(chunk1, Chunk.appendAll(chunk2)), Chunk.unsafeFromArray([1, 2]))
      })
    })

    describe("Given 2 chunks where the first one is empty", () => {
      const chunk1 = Chunk.empty()
      const chunk2 = Chunk.unsafeFromArray([1, 2])

      it("should concatenate them following order", () => {
        assertEquals(pipe(chunk1, Chunk.appendAll(chunk2)), Chunk.unsafeFromArray([1, 2]))
      })
    })

    describe("Given 2 chunks where the second one is empty", () => {
      const chunk1 = Chunk.unsafeFromArray([1, 2])
      const chunk2 = Chunk.empty()

      it("should concatenate them following order", () => {
        assertEquals(pipe(chunk1, Chunk.appendAll(chunk2)), Chunk.unsafeFromArray([1, 2]))
      })
    })

    describe("Given several chunks concatenated with each", () => {
      const chunk1 = Chunk.empty()
      const chunk2 = Chunk.unsafeFromArray([1])
      const chunk3 = Chunk.unsafeFromArray([2])
      const chunk4 = Chunk.unsafeFromArray([3, 4])
      const chunk5 = Chunk.unsafeFromArray([5, 6])

      it("should concatenate them following order", () => {
        assertEquals(
          pipe(
            chunk1,
            Chunk.appendAll(chunk2),
            Chunk.appendAll(chunk3),
            Chunk.appendAll(chunk4),
            Chunk.appendAll(chunk5)
          ),
          Chunk.unsafeFromArray([1, 2, 3, 4, 5, 6])
        )
      })
    })
  })

  it("zip", () => {
    assertEquals(Chunk.zip(Chunk.empty(), Chunk.empty()), Chunk.empty())
    assertEquals(Chunk.zip(Chunk.make(1), Chunk.empty()), Chunk.empty())
    assertEquals(Chunk.zip(Chunk.empty(), Chunk.make(1)), Chunk.empty())
    deepStrictEqual(Chunk.toArray(Chunk.zip(Chunk.make(1), Chunk.make(2))), [[1, 2]])
  })

  describe("Given two non-materialized chunks of different sizes", () => {
    it("should zip the chunks together and drop the leftover", () => {
      // Create two non-materialized Chunks
      const left = pipe(Chunk.make(-1, 0, 1), Chunk.drop(1))
      const right = pipe(Chunk.make(1, 0, 0, 1), Chunk.drop(1))
      const zipped = pipe(left, Chunk.zipWith(pipe(right, Chunk.take(left.length)), (a, b) => [a, b]))
      deepStrictEqual(Array.from(zipped), [[0, 0], [1, 0]])
    })
  })

  it("last", () => {
    assertNone(Chunk.last(Chunk.empty()))
    assertSome(Chunk.last(Chunk.make(1, 2, 3)), 3)
  })

  it("map", () => {
    assertEquals(Chunk.map(Chunk.empty(), (n) => n + 1), Chunk.empty())
    assertEquals(Chunk.map(Chunk.of(1), (n) => n + 1), Chunk.of(2))
    assertEquals(Chunk.map(Chunk.make(1, 2, 3), (n) => n + 1), Chunk.make(2, 3, 4))
    assertEquals(Chunk.map(Chunk.make(1, 2, 3), (n, i) => n + i), Chunk.make(1, 3, 5))
  })

  it("mapAccum", () => {
    deepStrictEqual(Chunk.mapAccum(Chunk.make(1, 2, 3), "-", (s, a) => [s + a, a + 1]), ["-123", Chunk.make(2, 3, 4)])
  })

  it("partition", () => {
    assertTuple(Chunk.partition(Chunk.empty(), (n) => n > 2), [Chunk.empty(), Chunk.empty()])
    assertTuple(Chunk.partition(Chunk.make(1, 3), (n) => n > 2), [Chunk.make(1), Chunk.make(3)])

    assertTuple(Chunk.partition(Chunk.empty(), (n, i) => n + i > 2), [Chunk.empty(), Chunk.empty()])
    assertTuple(Chunk.partition(Chunk.make(1, 2), (n, i) => n + i > 2), [Chunk.make(1), Chunk.make(2)])
  })

  it("partitionMap", () => {
    assertTuple(Chunk.partitionMap(Chunk.empty(), identity), [Chunk.empty(), Chunk.empty()])
    assertTuple(Chunk.partitionMap(Chunk.make(Either.right(1), Either.left("a"), Either.right(2)), identity), [
      Chunk.make("a"),
      Chunk.make(1, 2)
    ])
  })

  it("separate", () => {
    assertTuple(Chunk.separate(Chunk.empty()), [Chunk.empty(), Chunk.empty()])
    assertTuple(Chunk.separate(Chunk.make(Either.right(1), Either.left("e"), Either.right(2))), [
      Chunk.make("e"),
      Chunk.make(1, 2)
    ])
  })

  it("size", () => {
    strictEqual(Chunk.size(Chunk.empty()), 0)
    strictEqual(Chunk.size(Chunk.make(1, 2, 3)), 3)
  })

  it("split", () => {
    assertEquals(pipe(Chunk.empty(), Chunk.split(2)), Chunk.empty())
    assertEquals(pipe(Chunk.make(1), Chunk.split(2)), Chunk.make(Chunk.make(1)))
    assertEquals(pipe(Chunk.make(1, 2), Chunk.split(2)), Chunk.make(Chunk.make(1), Chunk.make(2)))
    assertEquals(pipe(Chunk.make(1, 2, 3, 4, 5), Chunk.split(2)), Chunk.make(Chunk.make(1, 2, 3), Chunk.make(4, 5)))
    assertEquals(
      pipe(Chunk.make(1, 2, 3, 4, 5), Chunk.split(3)),
      Chunk.make(Chunk.make(1, 2), Chunk.make(3, 4), Chunk.make(5))
    )
  })

  it("tail", () => {
    assertNone(Chunk.tail(Chunk.empty()))
    // TODO: use assertSome?
    assertEquals(Chunk.tail(Chunk.make(1, 2, 3)), Option.some(Chunk.make(2, 3)))
  })

  it("filter", () => {
    assertEquals(Chunk.filter(Chunk.make(1, 2, 3), (n) => n % 2 === 1), Chunk.make(1, 3))
    assertEquals(
      Chunk.filter(Chunk.make(Option.some(3), Option.some(2), Option.some(1)), Option.isSome),
      Chunk.make(Option.some(3), Option.some(2), Option.some(1)) as any
    )
    assertEquals(
      Chunk.filter(Chunk.make(Option.some(3), Option.none(), Option.some(1)), Option.isSome),
      Chunk.make(Option.some(3), Option.some(1)) as any
    )
  })

  it("filterMapWhile", () => {
    assertEquals(
      Chunk.filterMapWhile(Chunk.make(1, 3, 4, 5), (n) => n % 2 === 1 ? Option.some(n) : Option.none()),
      Chunk.make(1, 3)
    )
  })

  it("compact", () => {
    assertEquals(Chunk.compact(Chunk.empty()), Chunk.empty())
    assertEquals(Chunk.compact(Chunk.make(Option.some(1), Option.some(2), Option.some(3))), Chunk.make(1, 2, 3))
    assertEquals(Chunk.compact(Chunk.make(Option.some(1), Option.none(), Option.some(3))), Chunk.make(1, 3))
  })

  it("dedupeAdjacent", () => {
    assertEquals(Chunk.dedupeAdjacent(Chunk.empty()), Chunk.empty())
    assertEquals(Chunk.dedupeAdjacent(Chunk.make(1, 2, 3)), Chunk.make(1, 2, 3))
    assertEquals(Chunk.dedupeAdjacent(Chunk.make(1, 2, 2, 3, 3)), Chunk.make(1, 2, 3))
  })

  it("flatMap", () => {
    assertEquals(Chunk.flatMap(Chunk.make(1), (n) => Chunk.make(n, n + 1)), Chunk.make(1, 2))
    assertEquals(Chunk.flatMap(Chunk.make(1, 2, 3), (n) => Chunk.make(n, n + 1)), Chunk.make(1, 2, 2, 3, 3, 4))
  })

  it("union", () => {
    assertEquals(Chunk.union(Chunk.make(1, 2, 3), Chunk.empty()), Chunk.make(1, 2, 3))
    assertEquals(Chunk.union(Chunk.empty(), Chunk.make(1, 2, 3)), Chunk.make(1, 2, 3))
    assertEquals(Chunk.union(Chunk.make(1, 2, 3), Chunk.make(2, 3, 4)), Chunk.make(1, 2, 3, 4))
  })

  it("intersection", () => {
    assertEquals(Chunk.intersection(Chunk.make(1, 2, 3), Chunk.empty()), Chunk.empty())
    assertEquals(Chunk.intersection(Chunk.empty(), Chunk.make(2, 3, 4)), Chunk.empty())
    assertEquals(Chunk.intersection(Chunk.make(1, 2, 3), Chunk.make(2, 3, 4)), Chunk.make(2, 3))
  })

  it("isEmpty", () => {
    assertTrue(Chunk.isEmpty(Chunk.empty()))
    assertFalse(Chunk.isEmpty(Chunk.make(1)))
  })

  it("unsafeLast", () => {
    strictEqual(Chunk.unsafeLast(Chunk.make(1)), 1)
    strictEqual(Chunk.unsafeLast(Chunk.make(1, 2, 3)), 3)
    throws(() => Chunk.unsafeLast(Chunk.empty()), new Error("Index out of bounds"))
  })

  it("splitNonEmptyAt", () => {
    assertTuple(Chunk.splitNonEmptyAt(Chunk.make(1, 2, 3, 4), 2), [Chunk.make(1, 2), Chunk.make(3, 4)])
    assertTuple(Chunk.splitNonEmptyAt(Chunk.make(1, 2, 3, 4), 10), [Chunk.make(1, 2, 3, 4), Chunk.empty()])
  })

  it("splitWhere", () => {
    assertTuple(Chunk.splitWhere(Chunk.empty(), (n) => n > 1), [Chunk.empty(), Chunk.empty()])
    assertTuple(Chunk.splitWhere(Chunk.make(1, 2, 3), (n) => n > 1), [Chunk.make(1), Chunk.make(2, 3)])
  })

  it("takeWhile", () => {
    assertEquals(Chunk.takeWhile(Chunk.empty(), (n) => n <= 2), Chunk.empty())
    assertEquals(Chunk.takeWhile(Chunk.make(1, 2, 3), (n) => n <= 2), Chunk.make(1, 2))
  })

  it("dedupe", () => {
    assertEquals(Chunk.dedupe(Chunk.empty()), Chunk.empty())
    assertEquals(Chunk.dedupe(Chunk.make(1, 2, 3)), Chunk.make(1, 2, 3))
    assertEquals(Chunk.dedupe(Chunk.make(1, 2, 3, 2, 1, 3)), Chunk.make(1, 2, 3))
  })

  it("unzip", () => {
    assertTuple(Chunk.unzip(Chunk.empty()), [Chunk.empty(), Chunk.empty()])
    assertTuple(Chunk.unzip(Chunk.make(["a", 1] as const, ["b", 2] as const)), [
      Chunk.make("a", "b"),
      Chunk.make(1, 2)
    ])
  })

  it("reverse", () => {
    assertEquals(Chunk.reverse(Chunk.empty()), Chunk.empty())
    assertEquals(Chunk.reverse(Chunk.make(1, 2, 3)), Chunk.make(3, 2, 1))
    assertEquals(Chunk.reverse(Chunk.take(Chunk.make(1, 2, 3, 4), 3)), Chunk.make(3, 2, 1))
  })

  it("flatten", () => {
    assertEquals(Chunk.flatten(Chunk.make(Chunk.make(1), Chunk.make(2), Chunk.make(3))), Chunk.make(1, 2, 3))
  })

  it("makeBy", () => {
    assertEquals(Chunk.makeBy(5, (n) => n * 2), Chunk.make(0, 2, 4, 6, 8))
    assertEquals(Chunk.makeBy(2.2, (n) => n * 2), Chunk.make(0, 2))
  })

  it("range", () => {
    assertEquals(Chunk.range(0, 0), Chunk.make(0))
    assertEquals(Chunk.range(0, 1), Chunk.make(0, 1))
    assertEquals(Chunk.range(1, 5), Chunk.make(1, 2, 3, 4, 5))
    assertEquals(Chunk.range(10, 15), Chunk.make(10, 11, 12, 13, 14, 15))
    assertEquals(Chunk.range(-1, 0), Chunk.make(-1, 0))
    assertEquals(Chunk.range(-5, -1), Chunk.make(-5, -4, -3, -2, -1))
    // out of bound
    assertEquals(Chunk.range(2, 1), Chunk.make(2))
    assertEquals(Chunk.range(-1, -2), Chunk.make(-1))
  })

  it("some", () => {
    const isPositive: Predicate.Predicate<number> = (n) => n > 0
    assertTrue(Chunk.some(Chunk.make(-1, -2, 3), isPositive))
    assertFalse(Chunk.some(Chunk.make(-1, -2, -3), isPositive))
  })

  it("forEach", () => {
    const as: Array<string> = []
    Chunk.forEach(Chunk.make(1, 2, 3, 4), (n, i) => as.push(`${n}-${i}`))
    deepStrictEqual(as, ["1-0", "2-1", "3-2", "4-3"])
  })

  it("sortWith", () => {
    type X = {
      a: string
      b: number
    }
    const chunk: Chunk.Chunk<X> = Chunk.make({ a: "a", b: 2 }, { a: "b", b: 1 })
    deepStrictEqual(Chunk.sortWith(chunk, (x) => x.b, Order.number), Chunk.make({ a: "b", b: 1 }, { a: "a", b: 2 }))
  })

  it("getEquivalence", () => {
    const equivalence = Chunk.getEquivalence(Num.Equivalence)
    assertTrue(equivalence(Chunk.empty(), Chunk.empty()))
    assertTrue(equivalence(Chunk.make(1, 2, 3), Chunk.make(1, 2, 3)))
    assertFalse(equivalence(Chunk.make(1, 2, 3), Chunk.make(1, 2)))
    assertFalse(equivalence(Chunk.make(1, 2, 3), Chunk.make(1, 2, 4)))
  })

  it("differenceWith", () => {
    const eq = <E extends { id: number }>(a: E, b: E) => a.id === b.id
    const differenceWith = pipe(eq, Chunk.differenceWith)

    const chunk = Chunk.make({ id: 1 }, { id: 2 }, { id: 3 })

    deepStrictEqual(differenceWith(Chunk.make({ id: 1 }, { id: 2 }), chunk), Chunk.make({ id: 3 }))
    assertEquals(differenceWith(Chunk.empty(), chunk), chunk)
    assertEquals(differenceWith(chunk, Chunk.empty()), Chunk.empty())
    assertEquals(differenceWith(chunk, chunk), Chunk.empty())
  })

  it("difference", () => {
    const curr = Chunk.make(1, 3, 5, 7, 9)

    assertEquals(Chunk.difference(Chunk.make(1, 2, 3, 4, 5), curr), Chunk.make(7, 9))
    assertEquals(Chunk.difference(Chunk.empty(), curr), curr)
    assertEquals(Chunk.difference(curr, Chunk.empty()), Chunk.empty())
    assertEquals(Chunk.difference(curr, curr), Chunk.empty())
  })
})
