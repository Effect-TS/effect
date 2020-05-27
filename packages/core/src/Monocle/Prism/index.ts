import { CApplicative, HKT } from "../../Base"
import { Refinement, Predicate, identity } from "../../Function"
import * as O from "../../Option"
import { asOptional, modify, modifyOption, set } from "../common/prism"
import type {
  Prism,
  Optional,
  Traversal,
  Setter,
  Fold,
  Getter,
  Iso,
  Lens
} from "../common/types"

export type { Prism }
export { asOptional, modify, modifyOption, set }

export function create<S, A>(
  getOption: (s: S) => O.Option<A>,
  reverseGet: (a: A) => S
): Prism<S, A> {
  return {
    getOption,
    reverseGet
  }
}

export function getOption<S, A>(P: Prism<S, A>) {
  return P.getOption
}

export function reverseGet<S, A>(P: Prism<S, A>) {
  return P.reverseGet
}

export function fromPredicate<S, A extends S>(refinement: Refinement<S, A>): Prism<S, A>
export function fromPredicate<A>(predicate: Predicate<A>): Prism<A, A>
export function fromPredicate<A>(predicate: Predicate<A>): Prism<A, A> {
  return {
    getOption: (s) => (predicate(s) ? O.some(s) : O.none),
    reverseGet: identity
  }
}

export function some<A>(): Prism<O.Option<A>, A> {
  return {
    getOption: identity,
    reverseGet: O.some
  }
}

export function asTraversal<S, A>(P: Prism<S, A>): Traversal<S, A> {
  const st = set(P)
  return {
    modifyF: <F>(F: CApplicative<F>) => (f: (a: A) => HKT<F, A>) => (s: S) =>
      O.fold_(
        P.getOption(s),
        () => F.of(s),
        (v) => F.map((a: A) => st(a)(s))(f(v))
      )
  }
}

export function asSetter<S, A>(P: Prism<S, A>): Setter<S, A> {
  const m = modify(P)
  return {
    modify: m
  }
}

export function asFold<S, A>(P: Prism<S, A>): Fold<S, A> {
  return {
    foldMap: (M) => (f) => (s) => O.fold_(P.getOption(s), () => M.empty, f)
  }
}

export function compose<A, B>(ab: Prism<A, B>) {
  return <S>(P: Prism<S, A>): Prism<S, B> => ({
    getOption: (s) => O.chain_(P.getOption(s), ab.getOption),
    reverseGet: (b) => P.reverseGet(ab.reverseGet(b))
  })
}

export function composeOptional<A, B>(ab: Optional<A, B>) {
  return <S>(P: Prism<S, A>): Optional<S, B> => {
    const m = modify(P)
    return {
      getOption: (s) => O.chain_(P.getOption(s), ab.getOption),
      set: (b) => m(ab.set(b))
    }
  }
}

export function composeTraversal<A, B>(ab: Traversal<A, B>) {
  return <S>(P: Prism<S, A>): Traversal<S, B> => {
    const tr = asTraversal(P)
    return {
      modifyF: <F>(F: CApplicative<F>) => (f: (a: B) => HKT<F, B>) =>
        tr.modifyF(F)(ab.modifyF(F)(f))
    }
  }
}

export function composeFold<A, B>(ab: Fold<A, B>) {
  return <S>(P: Prism<S, A>): Fold<S, B> => {
    const fo = asFold(P)
    return {
      foldMap: (M) => (f) => fo.foldMap(M)(ab.foldMap(M)(f))
    }
  }
}

export function composeSetter<A, B>(ab: Setter<A, B>) {
  return <S>(P: Prism<S, A>): Setter<S, B> => {
    const se = asSetter(P)
    return {
      modify: (f) => se.modify(ab.modify(f))
    }
  }
}

export function composeGetter<A, B>(ab: Getter<A, B>) {
  return <S>(P: Prism<S, A>): Fold<S, B> => {
    const fo = asFold(P)
    return {
      foldMap: (M) => (f) => fo.foldMap(M)((s) => f(ab.get(s)))
    }
  }
}

export function composeIso<A, B>(ab: Iso<A, B>) {
  return <S>(P: Prism<S, A>): Prism<S, B> => ({
    getOption: (s) => O.map_(P.getOption(s), ab.get),
    reverseGet: (b) => P.reverseGet(ab.reverseGet(b))
  })
}

export function composeLens<A, B>(ab: Lens<A, B>) {
  return <S>(P: Prism<S, A>): Optional<S, B> => {
    const mod = modify(P)
    return {
      getOption: (s) => O.map_(P.getOption(s), ab.get),
      set: (b) => mod(ab.set(b))
    }
  }
}
