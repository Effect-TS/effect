import * as C from "../src/Chunk"
import { pipe } from "../src/Function"
import * as L from "../src/List"

describe("Chunk", () => {
  it("drop", () => {
    expect(
      pipe(
        C.single(0),
        C.concat(C.array([1, 2])),
        C.concat(C.list(L.from([3, 4, 5]))),
        C.drop(2),
        C.toArray
      )
    ).toEqual([2, 3, 4, 5])
  })
  it("get", () => {
    expect(
      pipe(
        C.single(0),
        C.concat(C.array([1, 2])),
        C.concat(C.list(L.from([3, 4, 5]))),
        C.get(2)
      )
    ).toEqual(2)
  })
  it("map", () => {
    expect(
      pipe(
        C.single(0),
        C.concat(C.array([1, 2])),
        C.concat(C.list(L.from([3, 4, 5]))),
        C.map((n) => n + 1),
        C.toArray
      )
    ).toEqual([1, 2, 3, 4, 5, 6])
  })
  it("reduce", () => {
    expect(
      pipe(
        C.single(0),
        C.concat(C.array([1, 2])),
        C.concat(C.list(L.from([3, 4, 5]))),
        C.map((n) => n + 1),
        C.reduce(0, (x, y) => x + y)
      )
    ).toEqual(21)
  })
  it("chain", () => {
    const res = pipe(
      C.single(0),
      C.concat(C.array([1, 2])),
      C.concat(C.list(L.from([3, 4, 5]))),
      C.chain((n) => C.array([0, n + 1]))
    )
    expect(C.toArray(res)).toEqual([0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6])
    expect(pipe(res, C.get(5))).toEqual(3)
  })
})
