import * as FA from "../src/FreeAssociative"
import { pipe } from "../src/Function"

describe("FreeAssociative", () => {
  it("toArray", () => {
    expect(pipe(FA.init<number>(), FA.append(1), FA.append(2), FA.toArray)).toEqual([
      1,
      2
    ])
  })
})
