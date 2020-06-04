import { process as P, effect as T } from "../src"
import { done, interrupt, raise } from "../src/Exit"
import { pipe } from "../src/Function"

describe("Process", () => {
  it("should interrupt on failures", async () => {
    interface Foo {
      test: {
        n: number
      }
    }

    const all = P.runAll({
      a: T.delay(T.pure(1), 100),
      b: T.delay(T.pure(2), 5000),
      c: T.delay(T.raiseError("3" as const), 100),
      d: T.delay(
        T.access(({ test: { n } }: Foo) => n),
        50
      )
    })

    expect(
      await T.runToPromise(pipe(all, T.provide({ test: { n: 4 } })))
    ).toStrictEqual({
      a: done(1),
      b: interrupt,
      c: raise("3"),
      d: done(4)
    })
  })

  it("should interrupt on interrupt", async () => {
    interface Foo {
      test: {
        n: number
      }
    }

    let end = {}

    const all = P.runAll(
      {
        a: T.delay(T.pure(1), 500),
        b: T.delay(T.pure(2), 5000),
        d: T.delay(
          T.access(({ test: { n } }: Foo) => n),
          50
        )
      },
      (ex) => {
        end = ex
      }
    )

    const fiber = await T.runToPromise(pipe(all, T.provide({ test: { n: 4 } }), T.fork))

    await T.runToPromise(T.delay(T.unit, 60))

    await T.runToPromise(fiber.interrupt)

    expect(end).toStrictEqual({
      a: interrupt,
      b: interrupt,
      d: done(4)
    })
  })
})
