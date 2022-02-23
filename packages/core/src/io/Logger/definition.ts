import type { List } from "../../collection/immutable/List"
import type { Map } from "../../collection/immutable/Map"
import type { Lazy } from "../../data/Function"
import type { TraceElement } from "../../io/TraceElement"
import type { Cause } from "../Cause"
import type { FiberId } from "../FiberId"
import type { FiberRef } from "../FiberRef"
import type { LogLevel } from "../LogLevel"
import type { LogSpan } from "../LogSpan"

/**
 * @tsplus type ets/Logger
 */
export interface Logger<Message, Output> {
  readonly apply: (
    trace: TraceElement,
    fiberId: FiberId,
    logLevel: LogLevel,
    message: Lazy<Message>,
    cause: Lazy<Cause<any>>,
    context: Map<FiberRef.Runtime<any>, any>,
    spans: List<LogSpan>,
    annotations: Map<string, string>
  ) => Output
}

/**
 * @tsplus type ets/LoggerOps
 */
export interface LoggerOps {}
export const Logger: LoggerOps = {}

/**
 * @tsplus unify ets/Logger
 */
export function unify<X extends Logger<any, any>>(
  self: X
): Logger<
  [X] extends [Logger<infer MX, any>] ? MX : never,
  [X] extends [Logger<any, infer OX>] ? OX : never
> {
  return self
}
