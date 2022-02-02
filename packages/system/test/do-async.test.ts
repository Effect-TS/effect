import * as As from "../src/Async"
import { pipe } from "../src/Function"

describe("Async Do", () => {
  it("bind", async () => {
    const result_ok = await pipe(
      As.do,
      As.bind("a", () => As.succeed(0)),
      As.bind("b", () => As.succeed(1)),
      As.map(({ a, b }) => a + b),
      As.runPromise
    )

    const result_fail = await pipe(
      As.do,
      As.bind("a", () => As.succeed(0)),
      As.bind("b", () => As.succeed(1)),
      As.bind("c", () => As.fail("LOL")),
      As.map(({ a, b }) => a + b),
      As.runPromiseExit
    )

    expect(result_ok).toEqual(1)
    expect(result_fail).toEqual(As.failExit("LOL"))
  })

  it("bindAll", async () => {
    expect(
      await pipe(
        As.do,
        As.bind("a", () => As.succeed(0)),
        As.bindAll(({ a }) => ({
          b: As.succeed(a + 1),
          c: As.succeed(a + 2)
        })),
        As.runPromise
      )
    ).toEqual({ a: 0, b: 1, c: 2 })
  })

  it("bindAllPar", async () => {
    let testValue = 0
    expect(
      await pipe(
        As.do,
        As.bind("a", () => As.succeed(0)),
        As.bindAllPar(({ a }) => ({
          b: pipe(
            As.succeedWith(() => testValue),
            As.delay(10)
          ),
          c: As.succeedWith(() => {
            testValue = a + 2
            return testValue
          })
        })),
        As.runPromise
      )
    ).toEqual({ a: 0, b: 2, c: 2 })
  })
})
