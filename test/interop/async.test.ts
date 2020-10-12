import "../../src/Effect/Integrations"

import { succeed } from "@effect-ts/system/Exit"
import { pipe } from "@effect-ts/system/Function"

import * as A from "../../src/Classic/Async"
import * as T from "../../src/Effect"

describe("Async/Effect interop", () => {
  it("should execute async natively", async () => {
    const result = await pipe(
      A.succeed(0),
      T.chain((n) => T.effectTotal(() => n + 1)),
      T.runPromiseExit
    )

    expect(result).toEqual(succeed(1))
  })
})
