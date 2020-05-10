import type { Option } from "fp-ts/lib/Option"

/**
 * @since 2.0.0
 */
export function some<A>(a: A): Option<A> {
  return { _tag: "Some", value: a }
}
