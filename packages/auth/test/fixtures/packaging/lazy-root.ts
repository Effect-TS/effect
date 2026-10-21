import { AuthContract } from "@effect/auth"
import { Effect } from "effect"

export const make = AuthContract.make

export const client = Effect.promise(() => import("@effect/auth")).pipe(
  Effect.map((modules) => modules.Client)
)
