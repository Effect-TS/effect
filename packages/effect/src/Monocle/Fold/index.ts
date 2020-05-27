import * as A from "../../Array"
import type {
  URIS3,
  CFoldable3,
  Kind3,
  URIS2,
  CFoldable2,
  Kind2,
  URIS,
  CFoldable1,
  Kind,
  CFoldable,
  HKT
} from "../../Base"
import { Predicate, Refinement } from "../../Function"
import { Monoid, monoidAll, monoidAny } from "../../Monoid"
import { getFirstMonoid, Option, fromPredicate } from "../../Option"
import * as L from "../Lens"
import * as Op from "../Optional"
import * as P from "../Prism"
import * as Tr from "../Traversal"
import { Fold, Getter, Iso } from "../common/types"

export { Fold }

export function foldMap<S, A>(
  _: Fold<S, A>
): <M>(M: Monoid<M>) => (f: (a: A) => M) => (s: S) => M {
  return _.foldMap
}

export function create<S, A>(
  foldMap: <M>(M: Monoid<M>) => (f: (a: A) => M) => (s: S) => M
): Fold<S, A> {
  return {
    foldMap
  }
}

export function getAll<S, A>(fold: Fold<S, A>) {
  return fold.foldMap(A.getMonoid<A>())(A.of)
}

export function exists<S, A>(fold: Fold<S, A>) {
  return fold.foldMap(monoidAny)
}

export function all<S, A>(fold: Fold<S, A>) {
  return fold.foldMap(monoidAll)
}

function foldMapFirst<S, A>(fold: Fold<S, A>) {
  return fold.foldMap(getFirstMonoid<A>())
}

export function compose<A, B>(ab: Fold<A, B>) {
  return <S>(fold: Fold<S, A>): Fold<S, B> =>
    create(<M>(M: Monoid<M>) => (f: (b: B) => M) => fold.foldMap(M)(ab.foldMap(M)(f)))
}

export function composeGetter<A, B>(ab: Getter<A, B>) {
  return <S>(fold: Fold<S, A>): Fold<S, B> =>
    create(<M>(M: Monoid<M>) => (f: (b: B) => M) =>
      fold.foldMap(M)((a) => f(ab.get(a)))
    )
}

export function composeTraversal<A, B>(ab: Tr.Traversal<A, B>) {
  return compose(Tr.asFold(ab))
}

export function composeOptional<A, B>(ab: Op.Optional<A, B>) {
  return compose(Op.asFold(ab))
}

export function composePrism<A, B>(ab: P.Prism<A, B>) {
  return compose(P.asFold(ab))
}

export function composeLens<A, B>(ab: L.Lens<A, B>) {
  return compose(L.asFold(ab))
}

export function composeIso<A, B>(ab: Iso<A, B>) {
  return <S>(fold: Fold<S, A>): Fold<S, B> =>
    create(<M>(M: Monoid<M>) => (f: (b: B) => M) =>
      fold.foldMap(M)((a) => f(ab.get(a)))
    )
}

export function find<S, A>(
  fold: Fold<S, A>
): {
  <B extends A>(p: Refinement<A, B>): (s: S) => Option<B>
  (p: Predicate<A>): (s: S) => Option<A>
}
export function find<S, A>(fold: Fold<S, A>): (p: Predicate<A>) => (s: S) => Option<A> {
  return (p) => foldMapFirst(fold)(fromPredicate(p))
}

export function headOption<S, A>(fold: Fold<S, A>) {
  return find(fold)(() => true)
}

export function fromFoldable<F extends URIS3>(
  F: CFoldable3<F>
): <U, L, A>() => Fold<Kind3<F, U, L, A>, A>
export function fromFoldable<F extends URIS2>(
  F: CFoldable2<F>
): <L, A>() => Fold<Kind2<F, L, A>, A>
export function fromFoldable<F extends URIS>(
  F: CFoldable1<F>
): <A>() => Fold<Kind<F, A>, A>
export function fromFoldable<F>(F: CFoldable<F>): <A>() => Fold<HKT<F, A>, A>
export function fromFoldable<F>(F: CFoldable<F>): <A>() => Fold<HKT<F, A>, A> {
  return <A>() =>
    create<HKT<F, A>, A>(<M>(M: Monoid<M>) => {
      const foldMapFM = F.foldMap(M)
      return (f: (a: A) => M) => foldMapFM(f)
    })
}
