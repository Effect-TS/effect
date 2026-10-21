import * as AuthContract from "@effect/auth/AuthContract"
import { Effect } from "effect"

export const make = AuthContract.make
export const client = Effect.promise(() => import("@effect/auth/Client"))
