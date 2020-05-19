import { identity } from "../../Function"
import * as O from "../../Option"

import type { Optional, Prism } from "./types"

export function modifyOption<S, A>(P: Prism<S, A>) {
  return (f: (a: A) => A) => (s: S): O.Option<S> =>
    O.map_(P.getOption(s), (v) => {
      const n = f(v)
      return n === v ? s : P.reverseGet(n)
    })
}

export function modify<S, A>(P: Prism<S, A>) {
  const mo = modifyOption(P)
  return (f: (a: A) => A) => (s: S): S => O.fold_(mo(f)(s), () => s, identity)
}

export function set<S, A>(P: Prism<S, A>) {
  const mo = modify(P)
  return (a: A) => mo(() => a)
}

export function asOptional<S, A>(P: Prism<S, A>): Optional<S, A> {
  const s = set(P)
  return {
    getOption: P.getOption,
    set: s
  }
}
