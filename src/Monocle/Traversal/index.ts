import type {
  CApplicative,
  HKT,
  URIS3,
  CTraversable3,
  Kind3,
  URIS2,
  CTraversable2,
  Kind2,
  URIS,
  CTraversable1,
  Kind,
  CTraversable
} from "../../Base"
import { getApplicative, make } from "../../Const"
import { constant, Predicate, Refinement } from "../../Function"
import { identityAp } from "../../Identity"
import * as I from "../Iso"
import * as L from "../Lens"
import * as Op from "../Optional"
import * as P from "../Prism"
import { Traversal, ModifyF, Fold, Setter, Getter } from "../common/types"

export { Traversal, ModifyF }

export function modifyF<S, A>(_: Traversal<S, A>) {
  return _.modifyF
}

export function create<S, A>(modifyF: ModifyF<S, A>): Traversal<S, A> {
  return {
    modifyF
  }
}

export function modify<S, A>(tra: Traversal<S, A>) {
  return tra.modifyF(identityAp)
}

export function set<S, A>(tra: Traversal<S, A>) {
  return (a: A) => modify(tra)(constant(a))
}

export function compose<A, B>(ab: Traversal<A, B>) {
  return <S>(tra: Traversal<S, A>): Traversal<S, B> =>
    create(<F>(F: CApplicative<F>) => (f: (a: B) => HKT<F, B>) =>
      tra.modifyF(F)(ab.modifyF(F)(f))
    )
}

export function filter<S, A>(
  tra: Traversal<S, A>
): <B extends A>(refinement: Refinement<A, B>) => Traversal<S, B>
export function filter<S, A>(
  tra: Traversal<S, A>
): (predicate: Predicate<A>) => Traversal<S, A>
export function filter<S, A>(
  tra: Traversal<S, A>
): (predicate: Predicate<A>) => Traversal<S, A> {
  return (predicate) => compose(P.asTraversal(P.fromPredicate(predicate)))(tra)
}

export function asFold<S, A>(tra: Traversal<S, A>): Fold<S, A> {
  return {
    foldMap: (M) => (f) => tra.modifyF(getApplicative(M))((a) => make(f(a)))
  }
}

export function asSetter<S, A>(tra: Traversal<S, A>): Setter<S, A> {
  return {
    modify: modify(tra)
  }
}

export function composeFold<A, B>(ab: Fold<A, B>) {
  return <S>(tra: Traversal<S, A>): Fold<S, B> => {
    const fo = asFold(tra)
    return {
      foldMap: (M) => (f) => fo.foldMap(M)(ab.foldMap(M)(f))
    }
  }
}

export function composeSetter<A, B>(ab: Setter<A, B>) {
  return <S>(tra: Traversal<S, A>): Setter<S, B> => {
    const se = asSetter(tra)
    return {
      modify: (f) => se.modify(ab.modify(f))
    }
  }
}

export function composeOptional<A, B>(ab: Op.Optional<A, B>) {
  return compose(Op.asTraversal(ab))
}

export function composeLens<A, B>(ab: L.Lens<A, B>) {
  return compose(L.asTraversal(ab))
}

export function composePrism<A, B>(ab: P.Prism<A, B>) {
  return compose(P.asTraversal(ab))
}

export function composeIso<A, B>(ab: I.Iso<A, B>) {
  return compose(I.asTraversal(ab))
}

export function composeGetter<A, B>(ab: Getter<A, B>) {
  return <S>(tra: Traversal<S, A>): Fold<S, B> => {
    const fo = asFold(tra)
    return {
      foldMap: (M) => (f) => fo.foldMap(M)((a) => f(ab.get(a)))
    }
  }
}

export function fromTraversable<T extends URIS3>(
  T: CTraversable3<T>
): <U, L, A>() => Traversal<Kind3<T, U, L, A>, A>
export function fromTraversable<T extends URIS2>(
  T: CTraversable2<T>
): <L, A>() => Traversal<Kind2<T, L, A>, A>
export function fromTraversable<T extends URIS>(
  T: CTraversable1<T>
): <A>() => Traversal<Kind<T, A>, A>
export function fromTraversable<T>(T: CTraversable<T>): <A>() => Traversal<HKT<T, A>, A>
export function fromTraversable<T>(
  T: CTraversable<T>
): <A>() => Traversal<HKT<T, A>, A> {
  return <A>() =>
    create(<F>(F: CApplicative<F>) => {
      const traverseF = T.traverse(F)
      return (f: (a: A) => HKT<F, A>) => traverseF(f)
    })
}
