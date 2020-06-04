import { effect as T } from "../src"
import { done } from "../src/Exit"
import { pipe } from "../src/Function"

describe("Sync", () => {
  it("should exec sync", () => {
    const program = T.sync(() => 10)
    const res = T.runSync(program)

    expect(res).toStrictEqual(done(10))
  })

  it("should chain exec sync", () => {
    const program = pipe(
      T.sync(() => 10),
      T.chain((n) => T.sync(() => n + 1))
    )
    const res = T.runSync(program)

    expect(res).toStrictEqual(done(11))
  })

  it("should chain access exec sync", () => {
    const program = pipe(
      T.access((_: { n: number }) => _.n),
      T.chain((n) => T.sync(() => n + 1))
    )

    const provide = T.provideM(T.map_(T.pure(10), (n): { n: number } => ({ n })))

    const res = T.runSync(pipe(program, provide))

    expect(res).toStrictEqual(done(11))
  })
})
