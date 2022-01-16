// ets_tracing: off

import type { Next } from "../../Collections/Immutable/Map"
import * as FiberId from "../../FiberId"
import { tag } from "../../Has"
import * as LogSpan from "../../LogSpan"
import type { Logger } from "../definition"

export const StringLoggerSym = Symbol.for("@effect-ts/system/Logger/String")
export type StringLoggerSym = typeof StringLoggerSym

export const StringLogger = tag<string>(StringLoggerSym)

export const defaultString: Logger<string, string> = (
  trace,
  fiberId,
  logLevel,
  message,
  context,
  spans,
  location
) => {
  const nowMillis = Date.now()
  const now = new Date(nowMillis)

  let output = [
    `timestamp=${now.toISOString()}`,
    ` level=${logLevel.label}`,
    ` thread=#${FiberId.threadName(fiberId)}`,
    ` message="${message()}"`
  ].join("")

  if (spans.length > 0) {
    output = output + " "

    const spansIterator = spans[Symbol.iterator]()

    let first = true
    let next: Next<LogSpan.LogSpan>
    while (!(next = spansIterator.next()).done) {
      if (first) {
        first = false
      } else {
        output = output + " "
      }

      output = output + LogSpan.render_(next.value, nowMillis)
    }
  }

  // TODO: render TraceElement

  return output
}
