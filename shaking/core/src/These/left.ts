import type { These } from "fp-ts/lib/These"

export function left<E = never, A = never>(left: E): These<E, A> {
  return { _tag: "Left", left }
}
