import * as A from "../src/Async"
import * as T from "../src/Effect"
import { pipe } from "../src/Function"
import * as IO from "../src/IO"
import * as S from "../src/Sync"

describe("Effect", () => {
  it("mix", async () => {
    expect(
      await pipe(
        T.fromSync(S.accessM((n: number) => S.sync(() => n + 1))),
        T.chain((n) => T.effectTotal(() => n + 1)),
        T.chain((n) => T.fromIO(IO.sync(() => n + 1))),
        T.chain((n) => T.fromAsync(A.sync(() => n + 1))),
        T.provideAll(1),
        T.runPromise
      )
    ).toEqual(5)
  })
})
