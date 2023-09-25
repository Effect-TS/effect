import { globalValue } from "../GlobalValue"
import type * as Request from "../Request"
import { fiberRefUnsafeMake } from "./core"

/** @internal */
export const currentRequestMap = globalValue(
  Symbol.for("effect/FiberRef/currentRequestMap"),
  () => fiberRefUnsafeMake(new Map<any, Request.Entry<any>>())
)
