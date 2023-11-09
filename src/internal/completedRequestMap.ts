import { globalValue } from "../exports/GlobalValue.js"
import type { Request } from "../exports/Request.js"
import { fiberRefUnsafeMake } from "./core.js"

/** @internal */
export const currentRequestMap = globalValue(
  Symbol.for("effect/FiberRef/currentRequestMap"),
  () => fiberRefUnsafeMake(new Map<any, Request.Entry<any>>())
)
