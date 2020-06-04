import { stream as S, effect as T, managed as M } from "../src"
import { pipe } from "../src/Function"
import { some } from "../src/Option"

describe("Subject", () => {
  it("use subscribe", async () => {
    let base = 0

    const source = S.fromSource(
      M.pure(
        T.delay(
          T.sync(() => {
            base++
            return some(base)
          }),
          100
        )
      )
    )

    const subject = await T.runToPromise(S.subject(source))

    const a = await T.runToPromise(subject.subscribe)
    const b = await T.runToPromise(subject.subscribe)

    const ra = await T.runToPromise(pipe(a, S.take(5), S.collectArray))
    const rb = await T.runToPromise(pipe(b, S.take(5), S.collectArray))

    await T.runToPromise(subject.interrupt)

    expect(ra).toStrictEqual(rb)
    expect(base).toStrictEqual(5)
  })
})
