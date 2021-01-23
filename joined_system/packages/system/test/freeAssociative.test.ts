import * as FA from "../src/FreeAssociative"
import { pipe } from "../src/Function"

describe("FreeAssociative", () => {
  it("toArray", () => {
    expect(pipe(FA.init<number>(), FA.append(1), FA.append(2), FA.toArray)).toEqual([
      1,
      2
    ])
  })
  it("map", () => {
    expect(
      pipe(
        FA.init<number>(),
        FA.append(1),
        FA.append(2),
        FA.map((n) => n + 1),
        FA.toArray
      )
    ).toEqual([2, 3])
  })
})
