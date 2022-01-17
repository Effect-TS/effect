import type { Logger } from "../definition"

export function simple<A, B>(log: (a: A) => B): Logger<A, B> {
  return (_trace, _fiberId, _logLevel, message, _context, _spans, _location) =>
    log(message())
}
