/**
 * @tsplus static effect/core/io/Logger.Ops simple
 */
export function simple<A, B>(log: (a: A) => B): Logger<A, B> {
  return {
    apply: (
      _fiberId,
      _logLevel,
      message,
      _cause,
      _context,
      _spans,
      _annotations
    ) => log(message)
  }
}
