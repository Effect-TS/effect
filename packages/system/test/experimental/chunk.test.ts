import * as T from "../../src/Effect"
import * as Chunk from "../../src/Experimental/Chunk"
import { pipe } from "../../src/Function"
import * as O from "../../src/Option"

describe("Chunk", () => {
  it("append", () => {
    expect(
      pipe(
        Chunk.single(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.append(5),
        Chunk.toArray
      )
    ).toEqual([1, 2, 3, 4, 5])
  })
  it("prepend", () => {
    expect(
      pipe(
        Chunk.single(1),
        Chunk.prepend(2),
        Chunk.prepend(3),
        Chunk.prepend(4),
        Chunk.prepend(5),
        Chunk.toArray
      )
    ).toEqual([5, 4, 3, 2, 1])
  })
  it("fromArray", () => {
    expect(
      pipe(
        Chunk.from([1, 2, 3, 4, 5]),
        Chunk.append(6),
        Chunk.append(7),
        Chunk.toArrayLike
      )
    ).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
  it("concat", () => {
    expect(
      pipe(
        Chunk.from([1, 2, 3, 4, 5]),
        Chunk.concat(Chunk.from([6, 7, 8, 9, 10])),
        Chunk.toArrayLike
      )
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })
  it("iterable", () => {
    expect(Chunk.toArrayLike(Chunk.from([0, 1, 2]))).toEqual([0, 1, 2])
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
        Chunk.take(5),
        Chunk.toArrayLike
      )
    ).toEqual([1, 2, 3, 4, 5])
  })
  it("drop", () => {
    expect(
      pipe(
        Chunk.from([1, 2, 3, 4, 5]),
        Chunk.concat(Chunk.from([6, 7, 8, 9, 10])),
        Chunk.drop(5),
        Chunk.toArrayLike
      )
    ).toEqual([6, 7, 8, 9, 10])
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
    expect(Chunk.toArray(result)).toEqual([2, 3])
  })
})
