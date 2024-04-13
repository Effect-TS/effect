import { describe, it } from "@effect/vitest"
import { Effect } from "effect"
import "bun:sqlite"

describe("Client", () => {
  it.effect("should work", () => Effect.unit)
})
