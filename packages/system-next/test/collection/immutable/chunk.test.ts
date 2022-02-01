import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"

describe("Chunk", () => {
  it("find & concat", () => {
    const chunk = Chunk(4, 5, 6) + Chunk(1, 2, 3)
    const result = chunk.find((v) => v === 3)

    expect(result).toEqual(Option.some(3))
  })

  it("spread", () => {
    const f = (...args: number[]) => args

    expect(f(...Chunk(0, 1, 2))).toEqual([0, 1, 2])
  })

  it("append", () => {
    const chunkA = Chunk.single(1).append(2).append(3).append(4).append(5)
    const chunkB = Chunk(1, 2, 3, 4, 5)

    const a = chunkA.toArray()
    const b = chunkB.toArray()

    expect(a).toEqual(b)
  })

  it("prepend", () => {
    const chunkA = Chunk.single(1).prepend(2).prepend(3).prepend(4).prepend(5)
    const chunkB = Chunk(5, 4, 3, 2, 1)

    const a = chunkA.toArray()
    const b = chunkB.toArray()

    expect(a).toEqual(b)
  })

  it("fromArray", () => {
    const chunkA = Chunk.from([1, 2, 3, 4, 5]).append(6).append(7)
    const chunkB = Chunk(1, 2, 3, 4, 5, 6, 7)

    const a = chunkA.toArray()
    const b = chunkB.toArray()

    expect(a).toEqual(b)
  })

  it("concat", () => {
    const chunkA = Chunk(1, 2, 3, 4, 5) + Chunk(6, 7, 8, 9, 10)
    const chunkB = Chunk(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

    const a = chunkA.toArray()
    const b = chunkB.toArray()

    expect(a).toEqual(b)
  })

  it("iterable", () => {
    const chunk = Chunk(0, 1, 2).toArrayLike()

    expect(chunk).toEqual(Buffer.of(0, 1, 2))
  })

  it("get", () => {
    const chunk = Chunk(1, 2, 3, 4, 5)

    expect(chunk.get(3)).toEqual(Option.some(4))
    expect(chunk.get(5)).toEqual(Option.none)
  })

  it("buffer", () => {
    const chunk =
      Chunk.from(Buffer.from("hello")) +
      Chunk.from(Buffer.from(" ")) +
      Chunk.from(Buffer.from("world"))

    const result = chunk.drop(6).append(32).prepend(32).toArrayLike()

    expect(result).toEqual(Buffer.from(" world "))
  })

  it("stack", () => {
    let a = Chunk.empty<number>()
    for (let i = 0; i < 100_000; i++) {
      a = a + Chunk(i, i)
    }

    const result = a.toArrayLike()

    expect(result.length).toEqual(200_000)
  })

  it("take", () => {
    const chunk = Chunk(1, 2, 3, 4, 5) + Chunk(6, 7, 8, 9, 10)

    const result = chunk.take(5).toArray()

    expect(result).toEqual([1, 2, 3, 4, 5])
  })

  it("takeRight", () => {
    const chunk = Chunk(1, 2, 3, 4, 5) + Chunk(6, 7, 8, 9, 10)

    const result = chunk.takeRight(5).toArray()

    expect(result).toEqual([6, 7, 8, 9, 10])
  })

  it("drop", () => {
    const chunk = Chunk(1, 2, 3, 4, 5) + Chunk(6, 7, 8, 9, 10)

    const result = chunk.drop(5).toArray()

    expect(result).toEqual([6, 7, 8, 9, 10])
  })

  it("map", () => {
    const chunk = Chunk.from(Buffer.from("hello-world"))

    const result = chunk.map((n) => (n === 45 ? 32 : n)).toArrayLike()

    expect(result).toEqual(Buffer.from("hello world"))
  })

  it("chain", () => {
    const chunk = Chunk.from(Buffer.from("hello-world"))

    const result = chunk
      .flatMap((n) => (n === 45 ? Chunk.from(Buffer.from("-|-")) : Chunk.single(n)))
      .toArrayLike()

    expect(result).toEqual(Buffer.from("hello-|-world"))
  })

  it("collectEffect", async () => {
    const chunk = Chunk(0, 1, 2, 3)

    const result = await chunk
      .collectEffect((n) => (n >= 2 ? Option.some(Effect.succeed(n)) : Option.none))
      .unsafeRunPromise()

    expect(result.toArray()).toEqual([2, 3])
  })

  it("arrayLikeIterator", () => {
    const chunk = Chunk.single(0) + Chunk.single(1) + Chunk.single(2) + Chunk.single(3)

    const result = Array.from(chunk.buckets)

    expect(result).toEqual([Buffer.of(0), Buffer.of(1), Buffer.of(2), Buffer.of(3)])
  })

  it("equals", () => {
    const chunkA =
      Chunk.single(0) +
      Chunk.single(1) +
      Chunk.single(2) +
      Chunk.single(3) +
      Chunk.single(4)
    const chunkB = Chunk.single(0).append(1).append(2).append(3).append(4)

    const a = chunkA.toArray()
    const b = chunkB.toArray()

    expect(a).toEqual(b)
  })

  it("dropWhile", () => {
    const chunk = Chunk(0, 1, 2, 3, 4)

    const result = chunk.dropWhile((n) => n < 2).toArray()

    expect(result).toEqual([2, 3, 4])
  })

  it("dropWhileEffect", async () => {
    const chunk = Chunk(0, 1, 2, 3, 4)

    const result = await chunk
      .dropWhileEffect((n) => Effect.succeed(n < 2))
      .unsafeRunPromise()

    expect(result.toArray()).toEqual([2, 3, 4])
  })

  it("filter", () => {
    const chunk = Chunk(0, 1, 2, 3, 4)

    const result = chunk.filter((n) => n >= 2).toArray()

    expect(result).toEqual([2, 3, 4])
  })

  it("filterEffect", async () => {
    const chunk = Chunk(0, 1, 2, 3, 4)

    const result = await chunk
      .filterEffect((n) => Effect.succeed(n >= 2))
      .unsafeRunPromise()

    expect(result.toArray()).toEqual([2, 3, 4])
  })

  it("exists", () => {
    const chunk = Chunk(0, 1, 2, 3, 4)

    expect(chunk.exists((n) => n === 3)).toBe(true)
    expect(chunk.exists((n) => n === 6)).toBe(false)
  })

  it("find", () => {
    const chunk = Chunk(0, 1, 2, 3, 4)

    expect(chunk.find((n) => n > 2)).toEqual(Option.some(3))
    expect(chunk.find((n) => n === 6)).toEqual(Option.none)
  })

  it("reduceEffect", async () => {
    const order: Array<number> = []
    const chunk = Chunk(0, 1, 2, 3, 4)

    const result = await chunk
      .reduceEffect(0, (s, a) =>
        Effect.succeed(() => {
          order.push(a)
          return s + a
        })
      )
      .unsafeRunPromise()

    expect(order).toEqual([0, 1, 2, 3, 4])
    expect(result).toEqual(10)
  })

  it("reduceRightEffect", async () => {
    const order: Array<number> = []
    const chunk = Chunk(0, 1, 2, 3, 4)

    const result = await chunk
      .reduceRightEffect(0, (a, s) =>
        Effect.succeed(() => {
          order.push(a)
          return a + s
        })
      )
      .unsafeRunPromise()

    expect(order).toEqual([4, 3, 2, 1, 0])
    expect(result).toEqual(10)
  })

  it("indexWhere", () => {
    const chunk = Chunk(0, 1, 2, 1, 3, 4)

    const result = chunk.indexWhere((n) => n > 2)

    expect(result).toEqual(4)
  })

  it("indexWhereFrom", () => {
    const chunk = Chunk(0, 1, 2, 1, 3, 4)

    const result = chunk.indexWhereFrom(2, (n) => n > 2)

    expect(result).toEqual(4)
  })

  it("split", () => {
    function flattenArray(
      chunk: Chunk<Chunk<number>>
    ): ReadonlyArray<ReadonlyArray<number>> {
      return chunk.map((_) => _.toArray()).toArray()
    }

    const chunk = Chunk(0, 1, 2, 3, 4, 5)

    expect(flattenArray(chunk.split(2))).toEqual([
      [0, 1, 2],
      [3, 4, 5]
    ])
    expect(flattenArray(chunk.split(4))).toEqual([[0, 1], [2, 3], [4], [5]])
    expect(flattenArray(chunk.split(5))).toEqual([[0, 1], [2], [3], [4], [5]])
  })

  it("splitWhere", () => {
    const chunk = Chunk(0, 1, 2, 3, 4, 5)

    const {
      tuple: [left, right]
    } = chunk.splitWhere((n) => n === 3)

    expect(left.toArray()).toEqual([0, 1, 2])
    expect(right.toArray()).toEqual([3, 4, 5])
  })

  it("zip", () => {
    const leftChunk = Chunk(0, 1, 2, 3)
    const rightChunk = Chunk(0, 1, 2, 3, 4)

    const resultA = leftChunk.zip(rightChunk).toArray()
    const resultB = rightChunk.zip(leftChunk).toArray()

    expect(resultA).toEqual([Tuple(0, 0), Tuple(1, 1), Tuple(2, 2), Tuple(3, 3)])
    expect(resultB).toEqual([Tuple(0, 0), Tuple(1, 1), Tuple(2, 2), Tuple(3, 3)])
  })

  it("zipAll", () => {
    const leftChunk = Chunk(0, 1, 2, 3)
    const rightChunk = Chunk(0, 1, 2, 3, 4)

    const resultA = leftChunk.zipAll(rightChunk).toArray()
    const resultB = rightChunk.zipAll(leftChunk).toArray()

    expect(resultA).toEqual([
      Tuple(Option.some(0), Option.some(0)),
      Tuple(Option.some(1), Option.some(1)),
      Tuple(Option.some(2), Option.some(2)),
      Tuple(Option.some(3), Option.some(3)),
      Tuple(Option.none, Option.some(4))
    ])
    expect(resultB).toEqual([
      Tuple(Option.some(0), Option.some(0)),
      Tuple(Option.some(1), Option.some(1)),
      Tuple(Option.some(2), Option.some(2)),
      Tuple(Option.some(3), Option.some(3)),
      Tuple(Option.some(4), Option.none)
    ])
  })

  it("zipWithIndex", () => {
    const chunk = Chunk(1, 2, 3, 4)

    const result = chunk.zipWithIndex().toArray()

    expect(result).toEqual([Tuple(1, 0), Tuple(2, 1), Tuple(3, 2), Tuple(4, 3)])
  })

  it("fill", () => {
    const chunk = Chunk.fill(10, (n) => n + 1)

    const result = chunk.toArray()

    expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it("equality", () => {
    const chunk = Chunk(0, 1, 2)

    const result = chunk.equals(Chunk.from([0, 1, 2]))

    expect(result).toBe(true)
  })

  it("findEffect - found", async () => {
    const chunk = Chunk(1, 2, 3, 4)

    const result = await chunk
      .findEffect((a) => Effect.succeed(a === 3))
      .fold(
        () => -1,
        (option) =>
          option.fold(
            () => -1,
            (n) => n
          )
      )
      .unsafeRunPromise()

    expect(result).toBe(3)
  })

  it("findEffect - not found", async () => {
    const chunk = Chunk(1, 2, 3, 4)

    const result = await chunk
      .findEffect((a) => Effect.succeed(a === 20))
      .fold(
        () => -1,
        (option) =>
          option.fold(
            () => 42,
            (n) => n
          )
      )
      .unsafeRunPromise()

    expect(result).toBe(42)
  })

  it("findEffect - failing predicate", async () => {
    const chunk = Chunk(1, 2, 3, 4)

    const result = await chunk
      .findEffect((a) => Effect.fail({ _tag: "Error" } as const))
      .unsafeRunPromiseExit()

    expect(result.untraced()).toEqual(Exit.fail({ _tag: "Error" }))
  })

  it("dedupe", () => {
    const chunk = Chunk(0, 0, 1, 2, 3, 4, 4, 5, 6, 7, 7, 7, 8, 9, 9, 9, 9)

    const result = chunk.dedupe().toArray()

    expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it("dropRight", () => {
    const chunk = Chunk(1, 2, 3, 4, 5, 6, 7)

    const result = chunk.dropRight(3).toArray()

    expect(result).toEqual([1, 2, 3, 4])
  })

  it("mapWithIndex", () => {
    const chunk = Chunk(1, 2, 3, 4, 5, 6, 7)

    const result = chunk.mapWithIndex((i, n) => Tuple(i, n)).toArray()

    expect(result).toEqual([
      Tuple(0, 1),
      Tuple(1, 2),
      Tuple(2, 3),
      Tuple(3, 4),
      Tuple(4, 5),
      Tuple(5, 6),
      Tuple(6, 7)
    ])
  })

  it("reduceWithIndex", () => {
    const chunk = Chunk(1, 2, 3, 4, 5, 6, 7)

    const result = chunk.reduceWithIndex(
      [] as Array<Tuple<[number, number]>>,
      (i, acc, n) => [...acc, Tuple(i, n)]
    )

    expect(result).toEqual([
      Tuple(0, 1),
      Tuple(1, 2),
      Tuple(2, 3),
      Tuple(3, 4),
      Tuple(4, 5),
      Tuple(5, 6),
      Tuple(6, 7)
    ])
  })

  it("reduceRightWithIndex", () => {
    const chunk = Chunk(1, 2, 3, 4, 5, 6, 7)

    const result = chunk.reduceRightWithIndex(
      [] as Array<Tuple<[number, number]>>,
      (i, n, acc) => [...acc, Tuple(i, n)]
    )

    expect(result).toEqual([
      Tuple(6, 7),
      Tuple(5, 6),
      Tuple(4, 5),
      Tuple(3, 4),
      Tuple(2, 3),
      Tuple(1, 2),
      Tuple(0, 1)
    ])
  })

  it("findIndex", () => {
    const chunk = Chunk(1, 2, 3, 4, 5, 6, 7)

    const result = chunk.findIndex((n) => n === 5)

    expect(result).toEqual(Option.some(4))
  })

  it("findLast - found", () => {
    const chunk = Chunk(1, 2, 3, 4, 5, 6, 7, 5, 9, 10).mapWithIndex((i, n) => ({
      id: i,
      n
    }))

    const result = chunk.findLast(({ n }) => n === 5)

    expect(result).toEqual(Option.some({ id: 7, n: 5 }))
  })

  it("findLast - not found", () => {
    const chunk = Chunk(1, 2, 3, 4, 5, 6, 7, 5, 9, 10).mapWithIndex((i, n) => ({
      id: i,
      n
    }))

    const result = chunk.findLast(({ n }) => n === 25)

    expect(result).toEqual(Option.none)
  })

  it("findLastIndex - found", () => {
    const chunk = Chunk(1, 2, 3, 4, 5, 6, 7, 5, 9, 10).mapWithIndex((i, n) => ({
      id: i,
      n
    }))

    const result = chunk.findLastIndex(({ n }) => n === 5)

    expect(result).toEqual(Option.some(7))
  })

  it("findLastIndex - not found", () => {
    const chunk = Chunk(1, 2, 3, 4, 5, 6, 7, 5, 9, 10).mapWithIndex((i, n) => ({
      id: i,
      n
    }))

    const result = chunk.findLastIndex(({ n }) => n === 25)

    expect(result).toEqual(Option.none)
  })
})
