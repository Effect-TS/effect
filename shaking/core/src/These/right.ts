import type { These } from "fp-ts/lib/These"

export function right<E = never, A = never>(right: A): These<E, A> {
  return { _tag: "Right", right }
}
