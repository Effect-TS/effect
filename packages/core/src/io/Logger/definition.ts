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
    cause: Lazy<Cause<unknown>>,
    context: Map<FiberRef<unknown>, unknown>,
    spans: List<LogSpan>,
    annotations: Map<string, string>
  ) => Output
}

/**
 * @tsplus type ets/LoggerOps
 */
export interface LoggerOps {}
export const Logger: LoggerOps = {}
