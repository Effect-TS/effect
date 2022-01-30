import type { Tuple } from "../definition"

/**
 * Converts to native tuple type.
 *
 * @ets fluent ets/Tuple toNative
 */
export function toNative<Ks extends readonly unknown[]>(self: Tuple<Ks>): Ks {
  return self.value
}
