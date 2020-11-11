import "../../src/Effect/Integrations"

import { succeed } from "@effect-ts/system/Exit"
import { pipe } from "@effect-ts/system/Function"

import * as A from "../../src/Async"
import { successExit } from "../../src/Async"
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
  it("async should execute sync natively", async () => {
    const result = await pipe(
      S.accessM((_: { foo: string }) => S.succeed(_.foo.length)),
      A.chain((n) => A.sync(() => n + 1)),
      A.provideAll({ foo: "" }),
      A.runPromiseExit
    )

    expect(result).toEqual(successExit(1))
  })
})
