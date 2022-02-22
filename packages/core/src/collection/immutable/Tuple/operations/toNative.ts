import type { Tuple } from "../definition"

/**
 * Converts to native tuple type.
 *
 * @tsplus fluent ets/Tuple toNative
 */
export function toNative<Ks extends readonly unknown[]>(self: Tuple<Ks>): Ks {
  return self.tuple
}
