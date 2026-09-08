import { it } from "@effect/rstest"
import { Effect } from "effect"

const value = {
  // oxlint-disable-next-line unicorn/no-thenable -- regression: Effect values must bypass Promise assimilation
  get then(): never {
    throw new Error("Effect success values must not reach Promise resolution")
  }
}

it.effect("discards thenable success values before the Rstest boundary", () => Effect.succeed(value))
it.live("discards live thenable success values before the Rstest boundary", () => Effect.succeed(value))
