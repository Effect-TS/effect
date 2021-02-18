import type { Closure } from "./definition"

export function makeClosure<A>(f: (r: A) => (l: A) => A): Closure<A> {
  return {
    combine: f
  }
}
