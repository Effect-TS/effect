import * as assert from "assert"

import { effect as T } from "@matechs/effect"
import { pipe } from "fp-ts/lib/pipeable"

import * as G from "../src"

describe("Graceful", () => {
  it("should record onExit and trigger", async () => {
    let calls = 0

    await T.runToPromise(
      pipe(
        G.onExit(
          T.sync(() => {
            calls += 1
          })
        ),
        T.chainTap((_) => G.trigger),
        G.provideGraceful
      )
    )

    assert.deepStrictEqual(calls, 1)
  })
})
