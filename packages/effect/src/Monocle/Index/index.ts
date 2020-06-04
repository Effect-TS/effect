import * as A from "../../Array"
import { identity } from "../../Function"
import { pipe } from "../../Function"
import * as NEA from "../../NonEmptyArray"
import * as O from "../../Option"
import * as At from "../At"
import * as I from "../Iso"
import * as L from "../Lens"
import * as Op from "../Optional"
import * as P from "../Prism"
import type { Index } from "../common/types"

export type { Index }

export function create<S, I, A>(index: (i: I) => Op.Optional<S, A>): Index<S, I, A> {
  return {
    index
  }
}

export function fromAt<T, J, B>(at: At.At<T, J, O.Option<B>>): Index<T, J, B> {
  return create((i) => pipe(at.at(i), L.composePrism(P.some())))
}

export function fromIso<T, S>(iso: I.Iso<T, S>) {
  return <I, A>(ind: Index<S, I, A>): Index<T, I, A> =>
    create((i) => pipe(iso, I.composeOptional(ind.index(i))))
}

export function array<A = never>(): Index<ReadonlyArray<A>, number, A> {
  return create((i) =>
    Op.create(A.lookup(i), (a) => (as) =>
      O.fold_(A.updateAt(i, a)(as), () => as, identity)
    )
  )
}

export function nonEmptyArray<A = never>(): Index<NEA.NonEmptyArray<A>, number, A> {
  return create((i) =>
    Op.create(A.lookup(i), (a) => (nea) =>
      O.fold_(NEA.updateAt(i, a)(nea), () => nea, identity)
    )
  )
}

export function record<A = never>(): Index<Record<string, A>, string, A> {
  return fromAt(At.record<A>())
}
