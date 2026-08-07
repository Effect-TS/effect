import { describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { BrowserWorker } from "@effect/platform-browser"

describe("BrowserWorker", () => {
  it.effect("terminates the worker after graceful shutdown timeout", () =>
    Effect.gen(function*() {
      yield* BrowserWorker.spawn(() => Effect.void).pipe(
        Effect.scoped,
        Effect.timeout("2 seconds"),
        Effect.ignore
      )
    }))
})
