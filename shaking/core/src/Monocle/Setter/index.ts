import { constant } from "../../Function"
import * as I from "../Iso"
import * as L from "../Lens"
import * as Op from "../Optional"
import * as P from "../Prism"
import * as Tr from "../Traversal"
import { Setter } from "../common/types"

export { Setter }

export function modify<S, A>(_: Setter<S, A>) {
  return _.modify
}

export function create<S, A>(modify: (f: (a: A) => A) => (s: S) => S): Setter<S, A> {
  return {
    modify
  }
}

export function set<S, A>(_: Setter<S, A>) {
  return (a: A) => _.modify(constant(a))
}

export function compose<A, B>(ab: Setter<A, B>) {
  return <S>(set: Setter<S, A>): Setter<S, B> => create((f) => set.modify(ab.modify(f)))
}

export function composeTraversal<A, B>(ab: Tr.Traversal<A, B>) {
  return compose(Tr.asSetter(ab))
}

export function composeOptional<A, B>(ab: Op.Optional<A, B>) {
  return compose(Op.asSetter(ab))
}

export function composeLens<A, B>(ab: L.Lens<A, B>) {
  return compose(L.asSetter(ab))
}

export function composeIso<A, B>(ab: I.Iso<A, B>) {
  return compose(I.asSetter(ab))
}

export function composePrism<A, B>(ab: P.Prism<A, B>) {
  return compose(P.asSetter(ab))
}
