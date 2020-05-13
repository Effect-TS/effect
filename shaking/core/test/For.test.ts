import { effect as T, exit as Ex } from "../src"

describe("For", () => {
  it("uses For", async () => {
    let doExecuted = false
    const X = T.For()
      .with("k", () => T.pure(1))
      .with("y", () => T.pure(2))
      .with("z", () => T.access((_: { foo: string }) => _.foo))
      .pipe(
        T.provide({
          foo: "ok"
        })
      )
      .let("f", ({ y }) => 4 + y)
      .all(() => ({
        p: T.pure(2),
        q: T.trySyncMap(() => "test")(() => 3)
      }))
      .withPipe("l", (op) =>
        op
          .do(({ k }) => T.pure(k + 1))
          .pipe(T.shiftAfter)
          .access(({ k }) => T.map((n) => n + 1 + k))
          .done()
      )
      .do(() =>
        T.sync(() => {
          doExecuted = true
        })
      )
      .done()

    expect(await T.runToPromiseExit(X)).toStrictEqual(
      Ex.done({ k: 1, y: 2, z: "ok", f: 6, p: 2, q: 3, l: 2 })
    )

    expect(doExecuted).toStrictEqual(true)
  })
})
