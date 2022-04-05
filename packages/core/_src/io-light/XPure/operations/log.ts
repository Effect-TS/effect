import { Log } from "@effect-ts/core/io-light/XPure/definition/primitives";

/**
 * Constructs a computation that lazily logs `W`.
 */
export function log<S, W>(w: LazyArg<W>): XPure<W, S, S, unknown, never, never> {
  return new Log(w);
}
