import * as F from "../Fold"
import * as I from "../Iso"
import * as L from "../Lens"
import * as Op from "../Optional"
import * as P from "../Prism"
import * as Tr from "../Traversal"
import { Getter, Fold } from "../common/types"
export { Getter }

export function get<S, A>(_: Getter<S, A>) {
  return _.get
}

export function create<S, A>(get: (s: S) => A): Getter<S, A> {
  return {
    get
  }
}

export function asFold<S, A>(getter: Getter<S, A>): Fold<S, A> {
  return {
    foldMap: () => (f) => (s) => f(getter.get(s))
  }
}

export function compose<A, B>(ab: Getter<A, B>) {
  return <S>(getter: Getter<S, A>): Getter<S, B> => create((s) => ab.get(getter.get(s)))
}

export function composeFold<A, B>(ab: Fold<A, B>) {
  return <S>(getter: Getter<S, A>): Fold<S, B> => F.compose(ab)(asFold(getter))
}

export function composeLens<A, B>(ab: L.Lens<A, B>) {
  return compose(L.asGetter(ab))
}

export function composeIso<A, B>(ab: I.Iso<A, B>) {
  return compose(I.asGetter(ab))
}

export function composeOptional<A, B>(ab: Op.Optional<A, B>) {
  return <S>(getter: Getter<S, A>): Fold<S, B> =>
    F.compose(Op.asFold(ab))(asFold(getter))
}

export function composeTraversal<A, B>(ab: Tr.Traversal<A, B>) {
  return <S>(getter: Getter<S, A>): Fold<S, B> =>
    F.compose(Tr.asFold(ab))(asFold(getter))
}

export function composePrism<A, B>(ab: P.Prism<A, B>) {
  return <S>(getter: Getter<S, A>): Fold<S, B> =>
    F.compose(P.asFold(ab))(asFold(getter))
}
