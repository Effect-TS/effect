import { globalValue } from "../GlobalValue.js"
import type * as Request from "../Request.js"
import { unsafeMake } from "./fiberRef.js"

/** @internal */
export const currentRequestMap = globalValue(
  Symbol.for("effect/FiberRef/currentRequestMap"),
  () => unsafeMake(new Map<any, Request.Entry<any>>())
)
