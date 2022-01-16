// ets_tracing: off

import type { Cause } from "../../Cause"
import { tag } from "../../Has"
// import { pretty } from "../../Cause"
import type { Logger } from "../definition"
import { contramap_ } from "./contramap"
import { defaultString } from "./defaultString"

export const CauseLoggerSym = Symbol.for("@effect-ts/system/Logger/Cause")
export type CauseLoggerSym = typeof CauseLoggerSym

export const CauseLogger = tag<Cause<any>>(CauseLoggerSym)

export const defaultCause: Logger<Cause<any>, string> = contramap_(
  defaultString,
  // pretty
  () => ""
  // TODO
)
