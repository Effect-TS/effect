import type { These } from "fp-ts/lib/These"

export function both<E, A>(left: E, right: A): These<E, A> {
  return { _tag: "Both", left, right }
}
