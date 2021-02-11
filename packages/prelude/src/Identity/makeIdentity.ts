import type { Identity } from "./definition"

/**
 * Creates a new `Identity`
 */
export function makeIdentity<A>(identity: A, op: (y: A) => (x: A) => A): Identity<A> {
  return {
    Associative: "Associative",
    combine: op,
    identity
  }
}

export * from "./definition"
