import { identity } from "../../Function"
import * as O from "../../Option"

import { Optional } from "./types"

export function modifyOption<S, A>(opt: Optional<S, A>) {
  return (f: (a: A) => A) => (s: S): O.Option<S> =>
    O.map_(opt.getOption(s), (a) => {
      const n = f(a)
      return n === a ? s : opt.set(n)(s)
    })
}

export function modify<S, A>(opt: Optional<S, A>) {
  const mod = modifyOption(opt)
  return (f: (a: A) => A) => (s: S): S => O.fold_(mod(f)(s), () => s, identity)
}

export function compose<A, B>(ab: Optional<A, B>) {
  return <S>(opt: Optional<S, A>): Optional<S, B> => ({
    getOption: (s) => O.chain_(opt.getOption(s), (a) => ab.getOption(a)),
    set: (b) => modify(opt)(ab.set(b))
  })
}
