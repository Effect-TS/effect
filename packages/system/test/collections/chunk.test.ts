import * as Chunk from "../../src/Collections/Immutable/Chunk"
import * as Tp from "../../src/Collections/Immutable/Tuple"
import * as T from "../../src/Effect"
import { pipe } from "../../src/Function"
import * as O from "../../src/Option"

describe("Chunk", () => {
  it("spread", () => {
    const f = (...args: number[]) => args
    expect(f(...Chunk.many(0, 1, 2))).toEqual([0, 1, 2])
  })
  it("append", () => {
    expect(
      pipe(
        Chunk.single(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.append(5)
      )
    ).equals(Chunk.many(1, 2, 3, 4, 5))
  })
  it("prepend", () => {
    expect(
      pipe(
        Chunk.single(1),
        Chunk.prepend(2),
        Chunk.prepend(3),
        Chunk.prepend(4),
        Chunk.prepend(5)
      )
    ).equals(Chunk.many(5, 4, 3, 2, 1))
  })
  it("fromArray", () => {
    expect(pipe(Chunk.from([1, 2, 3, 4, 5]), Chunk.append(6), Chunk.append(7))).equals(
      Chunk.many(1, 2, 3, 4, 5, 6, 7)
    )
  })
  it("concat", () => {
    expect(
      pipe(Chunk.from([1, 2, 3, 4, 5]), Chunk.concat(Chunk.from([6, 7, 8, 9, 10])))
    ).equals(Chunk.many(1, 2, 3, 4, 5, 6, 7, 8, 9, 10))
  })
  it("iterable", () => {
    expect(Chunk.toArrayLike(Chunk.from([0, 1, 2]))).toEqual(Buffer.of(0, 1, 2))
  })
  it("get", () => {
    expect(
      pipe(
        Chunk.single(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.append(5),
        Chunk.get(3)
      )
    ).toEqual(O.some(4))
  })
  it("buffer", () => {
    expect(
      pipe(
        Chunk.from(Buffer.from("hello")),
        Chunk.concat(Chunk.from(Buffer.from(" "))),
        Chunk.concat(Chunk.from(Buffer.from("world"))),
        Chunk.drop(6),
        Chunk.append(32),
        Chunk.prepend(32),
        Chunk.toArrayLike
      )
    ).toEqual(Buffer.from(" world "))
  })
  it("stack", () => {
    let a = Chunk.empty<number>()
    for (let i = 0; i < 100_000; i++) {
      a = Chunk.concat_(a, Chunk.from([i, i]))
    }
    expect(Chunk.toArrayLike(a).length).toEqual(200_000)
  })
  it("take", () => {
    expect(
      pipe(
        Chunk.from([1, 2, 3, 4, 5]),
        Chunk.concat(Chunk.from([6, 7, 8, 9, 10])),
        Chunk.take(5)
      )
    ).equals(Chunk.many(1, 2, 3, 4, 5))
  })
  it("drop", () => {
    expect(
      pipe(
        Chunk.from([1, 2, 3, 4, 5]),
        Chunk.concat(Chunk.from([6, 7, 8, 9, 10])),
        Chunk.drop(5)
      )
    ).equals(Chunk.many(6, 7, 8, 9, 10))
  })
  it("map", () => {
    expect(
      pipe(
        Chunk.from(Buffer.from("hello-world")),
        Chunk.map((n) => (n === 45 ? 32 : n)),
        Chunk.toArrayLike
      )
    ).toEqual(Buffer.from("hello world"))
  })
  it("chain", () => {
    expect(
      pipe(
        Chunk.from(Buffer.from("hello-world")),
        Chunk.chain((n) =>
          n === 45 ? Chunk.from(Buffer.from("-|-")) : Chunk.single(n)
        ),
        Chunk.toArrayLike
      )
    ).toEqual(Buffer.from("hello-|-world"))
  })
  it("collectM", async () => {
    const result = await pipe(
      Chunk.single(0),
      Chunk.append(1),
      Chunk.append(2),
      Chunk.append(3),
      Chunk.collectM((n) => (n >= 2 ? O.some(T.succeed(n)) : O.none)),
      T.runPromise
    )
    expect(result).equals(Chunk.many(2, 3))
  })
  it("arrayLikeIterator", () => {
    const it = pipe(
      Chunk.single(0),
      Chunk.concat(Chunk.single(1)),
      Chunk.concat(Chunk.single(2)),
      Chunk.concat(Chunk.single(3))
    )

    expect(Array.from(Chunk.buckets(it))).toEqual([
      Buffer.of(0),
      Buffer.of(1),
      Buffer.of(2),
      Buffer.of(3)
    ])
  })
  it("equals", () => {
    const a = pipe(
      Chunk.single(0),
      Chunk.concat(Chunk.single(1)),
      Chunk.concat(Chunk.single(2)),
      Chunk.concat(Chunk.single(3)),
      Chunk.concat(Chunk.single(4))
    )
    const b = pipe(
      Chunk.single(0),
      Chunk.append(1),
      Chunk.append(2),
      Chunk.append(3),
      Chunk.append(4)
    )
    expect(a).equals(b)
  })
  it("dropWhile", () => {
    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.dropWhile((n) => n < 2)
      )
    ).equals(Chunk.from([2, 3, 4]))
  })
  it("dropWhileM", async () => {
    expect(
      await pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.dropWhileM((n) => T.delay(1)(T.succeed(n < 2))),
        T.runPromise
      )
    ).equals(Chunk.from([2, 3, 4]))
  })
  it("filter", () => {
    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.filter((n) => n >= 2)
      )
    ).equals(Chunk.from([2, 3, 4]))
  })
  it("filterM", async () => {
    expect(
      await pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.filterM((n) => T.delay(1)(T.succeed(n >= 2))),
        T.runPromise
      )
    ).equals(Chunk.from([2, 3, 4]))
  })
  it("exists", () => {
    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.exists((n) => n === 3)
      )
    ).toEqual(true)
    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.exists((n) => n === 6)
      )
    ).toEqual(false)
  })
  it("find", () => {
    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.find((n) => n > 2)
      )
    ).toEqual(O.some(3))
    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.find((n) => n === 6)
      )
    ).toEqual(O.none)
  })
  it("reduceM", async () => {
    const order = [] as number[]
    expect(
      await pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.reduceM(0, (s, a) =>
          T.succeedWith(() => {
            order.push(a)
            return s + a
          })
        ),
        T.runPromise
      )
    ).toEqual(10)
    expect(order).toEqual([0, 1, 2, 3, 4])
  })
  it("reduceRightM", async () => {
    const order = [] as number[]
    expect(
      await pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.reduceRightM(0, (a, s) =>
          T.succeedWith(() => {
            order.push(a)
            return s + a
          })
        ),
        T.runPromise
      )
    ).toEqual(10)
    expect(order).toEqual([4, 3, 2, 1, 0])
  })
  it("indexWhere", () => {
    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(1),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.indexWhereFrom(2, (n) => n > 2)
      )
    ).toEqual(4)
  })
  it("split", () => {
    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.append(5),
        Chunk.split(2)
      )
    ).equals(Chunk.many(Chunk.from([0, 1, 2]), Chunk.from([3, 4, 5])))

    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.append(5),
        Chunk.split(4)
      )
    ).equals(
      Chunk.many(Chunk.many(0, 1), Chunk.many(2, 3), Chunk.single(4), Chunk.single(5))
    )

    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.append(5),
        Chunk.split(5)
      )
    ).equals(
      Chunk.many(
        Chunk.many(0, 1),
        Chunk.many(2),
        Chunk.many(3),
        Chunk.many(4),
        Chunk.many(5)
      )
    )

    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.append(5),
        Chunk.append(6),
        Chunk.split(5)
      )
    ).equals(
      Chunk.many(
        Chunk.many(0, 1),
        Chunk.many(2, 3),
        Chunk.many(4),
        Chunk.many(5),
        Chunk.many(6)
      )
    )
  })
  it("splitWhere", () => {
    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.append(5),
        Chunk.splitWhere((n) => n === 3),
        ({ tuple: [l, r] }) => Tp.tuple(Chunk.toArray(l), Chunk.toArray(r))
      )
    ).toEqual(Tp.tuple([0, 1, 2], [3, 4, 5]))
  })
  it("zip", () => {
    const left = pipe(
      Chunk.single(0),
      Chunk.append(1),
      Chunk.append(2),
      Chunk.append(3)
    )
    const right = pipe(
      Chunk.single(0),
      Chunk.append(1),
      Chunk.append(2),
      Chunk.append(3),
      Chunk.append(4)
    )
    expect(pipe(left, Chunk.zip(right), Chunk.toArray)).toEqual([
      Tp.tuple(0, 0),
      Tp.tuple(1, 1),
      Tp.tuple(2, 2),
      Tp.tuple(3, 3)
    ])
    expect(pipe(right, Chunk.zip(left), Chunk.toArray)).toEqual([
      Tp.tuple(0, 0),
      Tp.tuple(1, 1),
      Tp.tuple(2, 2),
      Tp.tuple(3, 3)
    ])
  })
  it("zipAll", () => {
    const left = pipe(
      Chunk.single(0),
      Chunk.append(1),
      Chunk.append(2),
      Chunk.append(3)
    )
    const right = pipe(
      Chunk.single(0),
      Chunk.append(1),
      Chunk.append(2),
      Chunk.append(3),
      Chunk.append(4)
    )
    expect(pipe(left, Chunk.zipAll(right), Chunk.toArray)).toEqual([
      Tp.tuple(O.some(0), O.some(0)),
      Tp.tuple(O.some(1), O.some(1)),
      Tp.tuple(O.some(2), O.some(2)),
      Tp.tuple(O.some(3), O.some(3)),
      Tp.tuple(O.none, O.some(4))
    ])
    expect(pipe(right, Chunk.zipAll(left), Chunk.toArray)).toEqual([
      Tp.tuple(O.some(0), O.some(0)),
      Tp.tuple(O.some(1), O.some(1)),
      Tp.tuple(O.some(2), O.some(2)),
      Tp.tuple(O.some(3), O.some(3)),
      Tp.tuple(O.some(4), O.none)
    ])
  })
  it("zipWithIndex", () => {
    expect(
      pipe(
        Chunk.single(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.zipWithIndex
      )
    ).equals(Chunk.many(Tp.tuple(1, 0), Tp.tuple(2, 1), Tp.tuple(3, 2), Tp.tuple(4, 3)))
  })
  it("fill", () => {
    expect(Chunk.fill(10, (n) => n + 1)).equals(
      Chunk.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    )
  })
  it("equality", () => {
    expect(Chunk.many(0, 1, 2)).equals(Chunk.from([0, 1, 2]))
  })

  it("findM found", async () => {
    const chunk = Chunk.from([1, 2, 3, 4])

    const result = await pipe(
      T.fold_(
        Chunk.findM_(chunk, (a) => T.succeed(a === 3)),
        () => -1,
        O.fold(
          () => -1,
          (n) => n
        )
      ),
      T.runPromise
    )

    expect(result).equals(3)
  })

  it("findM not found", async () => {
    const chunk = Chunk.from([1, 2, 3, 4])

    const result = await pipe(
      T.fold_(
        Chunk.findM_(chunk, (a) => T.succeed(a === 20)),
        () => -1,
        O.fold(
          () => 42,
          (n) => n
        )
      ),
      T.runPromise
    )

    expect(result).equals(42)
  })

  it("findM with failing predicate", async () => {
    const chunk = Chunk.from([1, 2, 3, 4])

    const result = await pipe(
      Chunk.findM_(chunk, (a) => T.fail({ _tag: "Error" } as const)),
      T.runPromiseExit
    )

    expect(result._tag).equals("Failure")
  })
})
