import { globalValue } from "effect/GlobalValue"
import { fiberRefUnsafeMake } from "effect/internal/core"
import type * as Request from "effect/Request"

/** @internal */
export const currentRequestMap = globalValue(
  Symbol.for("effect/FiberRef/currentRequestMap"),
  () => fiberRefUnsafeMake(new Map<any, Request.Entry<any>>())
)
