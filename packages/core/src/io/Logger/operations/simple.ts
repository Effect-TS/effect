import type { Logger } from "../definition"

/**
 * @tsplus static ets/LoggerOps simple
 */
export function simple<A, B>(log: (a: A) => B): Logger<A, B> {
  return {
    apply: (
      _trace,
      _fiberId,
      _logLevel,
      message,
      _cause,
      _context,
      _spans,
      _annotations
    ) => log(message())
  }
}
