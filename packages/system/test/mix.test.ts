import * as A from "../src/Async"
import * as T from "../src/Effect"
import { pipe } from "../src/Function"
import * as IO from "../src/IO"
import * as S from "../src/Sync"

describe("Effect", () => {
  it("mix", async () => {
    expect(
      await pipe(
        S.accessM((n: number) => S.sync(() => n + 1)),
        T.chain((n) => T.effectTotal(() => n + 1)),
        T.chain((n) => IO.sync(() => n + 1)),
        T.chain((n) => A.sync(() => n + 1)),
        T.provideAll(1),
        T.runPromise
      )
    ).toEqual(5)
  })
})
