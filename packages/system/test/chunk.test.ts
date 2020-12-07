import * as C from "../src/Chunk"

describe("Chunk", () => {
  it("concat", () => {
    const x = new Uint16Array(2)
    const y = new Uint16Array(2)

    x[0] = 1
    x[1] = 2
    y[0] = 3
    y[1] = 4

    expect(C.concat_(x, y)).toEqual(new Uint16Array([1, 2, 3, 4]))
  })
})
