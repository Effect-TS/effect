import * as A from "../src/Async/index.js"
import * as T from "../src/Effect/index.js"
import * as Ex from "../src/Exit/index.js"
import { pipe } from "../src/Function/index.js"
import * as IO from "../src/IO/index.js"
import * as S from "../src/Sync/index.js"

describe("Effect", () => {
  it("mix", async () => {
    expect(
      await pipe(
        S.accessM((n: number) => S.succeedWith(() => n + 1)),
        T.chain((n) => T.succeedWith(() => n + 1)),
        T.chain((n) => T.fromIO(IO.succeedWith(() => n + 1))),
        T.chain((n) => T.fromAsync(A.succeedWith(() => n + 1))),
        T.provideAll(1),
        T.runPromise
      )
    ).toEqual(5)
  })
  it("mix fail", async () => {
    expect(await pipe(S.fail(0), T.runPromiseExit)).toEqual(Ex.fail(0))
  })
})
