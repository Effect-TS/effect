import * as L from "../src/List"

describe("List", () => {
  it("use list", () => {
    L.chain_(L.of(0), (n: number) => L.of(n + 1))
  })
})
