import * as L from "../src/List"

describe("List", () => {
  it("use list", () => {
    L.chain((n: number) => L.of(n + 1), L.of(0))
  })
})
