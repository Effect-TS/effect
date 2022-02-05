import * as As from "../src/Async/index.js"

describe("Async", () => {
  it("struct", async () => {
    expect(
      await As.runPromise(
        As.struct({
          zero: As.succeed(0),
          one: As.succeed(1)
        })
      )
    ).toEqual({ zero: 0, one: 1 })
  })
  it("structPar", async () => {
    let value = 0
    expect(
      await As.runPromise(
        As.structPar({
          one: As.delay(10)(As.succeedWith(() => value)),
          zero: As.succeedWith(() => value++)
        })
      )
    ).toEqual({ zero: 0, one: 1 })
  })
})
