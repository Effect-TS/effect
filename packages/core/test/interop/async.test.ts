import { succeed } from "@effect-ts/system/Exit"
import { pipe } from "@effect-ts/system/Function"

import * as A from "../../src/Async"
import * as T from "../../src/Effect"
import * as S from "../../src/Sync"

describe("Async/Effect interop", () => {
  it("effect should execute async natively", async () => {
    const result = await pipe(
      A.accessM((_: { foo: string }) => A.succeed(_.foo.length)),
      T.chain((n) => T.effectTotal(() => n + 1)),
      T.provideAll({ foo: "" }),
      T.runPromiseExit
    )

    expect(result).toEqual(succeed(1))
  })
  it("effect should execute sync natively", async () => {
    const result = await pipe(
      S.accessM((_: { foo: string }) => S.succeed(_.foo.length)),
      T.chain((n) => T.effectTotal(() => n + 1)),
      T.provideAll({ foo: "" }),
      T.runPromiseExit
    )

    expect(result).toEqual(succeed(1))
  })
})
