import { Eq } from "../../Eq"
import * as O from "../../Option"
import * as R from "../../Record"
import * as S from "../../Set"
import * as I from "../Iso"
import * as L from "../Lens"
import type { At, Lens, Iso } from "../common/types"
export type { At }

export function create<I, S, A>(at: (i: I) => Lens<S, A>): At<S, I, A> {
  return {
    at
  }
}

export function fromIso<T, S>(iso: Iso<T, S>) {
  return <I, A>(at: At<S, I, A>): At<T, I, A> =>
    create((i) => I.composeLens(at.at(i))(iso))
}

export function record<A = never>(): At<Record<string, A>, string, O.Option<A>> {
  return create((k) =>
    L.create(
      R.lookup(k),
      O.fold(
        () => R.deleteAt(k),
        (v) => R.insertAt(k, v)
      )
    )
  )
}

export function set<A = never>(E: Eq<A>): At<Set<A>, A, boolean> {
  const elemE = S.elem(E)
  const insertE = S.insert(E)
  const removeE = S.remove(E)
  return create((at) => {
    const insertEAt = insertE(at)
    const removeEAt = removeE(at)
    return L.create(elemE(at), (a) => (a ? insertEAt : removeEAt))
  })
}
