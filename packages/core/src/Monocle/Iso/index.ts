import { CApplicative, HKT } from "../../Base"
import * as O from "../../Option"
import type {
  Iso,
  Lens,
  Prism,
  Optional,
  Traversal,
  Fold,
  Getter,
  Setter
} from "../common/types"

export type { Iso }

export function create<S, A>(get: (s: S) => A, reverseGet: (a: A) => S): Iso<S, A> {
  return {
    get,
    reverseGet
  }
}

export function reverse<S, A>(iso: Iso<S, A>): Iso<A, S> {
  return {
    get: iso.reverseGet,
    reverseGet: iso.get
  }
}

export function wrap<S, A>(iso: Iso<S, A>) {
  return iso.get
}

export function reverseGet<S, A>(iso: Iso<S, A>) {
  return iso.reverseGet
}

export function unwrap<S, A>(iso: Iso<S, A>) {
  return iso.reverseGet
}

export function get<S, A>(iso: Iso<S, A>) {
  return iso.get
}

export function modify<S, A>(iso: Iso<S, A>) {
  return (f: (a: A) => A) => (s: S): S => iso.reverseGet(f(iso.get(s)))
}

export function asLens<S, A>(iso: Iso<S, A>): Lens<S, A> {
  return {
    get: iso.get,
    set: (a) => () => iso.reverseGet(a)
  }
}

export function asPrism<S, A>(iso: Iso<S, A>): Prism<S, A> {
  return {
    getOption: (s) => O.some(iso.get(s)),
    reverseGet: iso.reverseGet
  }
}

export function asOptional<S, A>(iso: Iso<S, A>): Optional<S, A> {
  return {
    getOption: (s) => O.some(iso.get(s)),
    set: (a) => () => iso.reverseGet(a)
  }
}

export function asTraversal<S, A>(iso: Iso<S, A>): Traversal<S, A> {
  return {
    modifyF: <F>(F: CApplicative<F>) => (f: (a: A) => HKT<F, A>) => (s: S) =>
      F.map((a: A) => iso.reverseGet(a))(f(iso.get(s)))
  }
}

export function asFold<S, A>(iso: Iso<S, A>): Fold<S, A> {
  return {
    foldMap: () => (f) => (s) => f(iso.get(s))
  }
}

export function asGetter<S, A>(iso: Iso<S, A>): Getter<S, A> {
  return {
    get: iso.get
  }
}

export function asSetter<S, A>(iso: Iso<S, A>): Setter<S, A> {
  return {
    modify: (f) => (s) => iso.reverseGet(f(iso.get(s)))
  }
}

export function compose<A, B>(ab: Iso<A, B>) {
  return <S>(iso: Iso<S, A>): Iso<S, B> => ({
    get: (s) => ab.get(iso.get(s)),
    reverseGet: (b) => iso.reverseGet(ab.reverseGet(b))
  })
}

export function composeLens<A, B>(ab: Lens<A, B>) {
  return <S>(iso: Iso<S, A>): Lens<S, B> => ({
    get: (s) => ab.get(iso.get(s)),
    set: (b) => (s) => iso.reverseGet(ab.set(b)(iso.get(s)))
  })
}

export function composePrism<A, B>(ab: Prism<A, B>) {
  return <S>(iso: Iso<S, A>): Prism<S, B> => ({
    getOption: (s) => ab.getOption(iso.get(s)),
    reverseGet: (b) => iso.reverseGet(ab.reverseGet(b))
  })
}

export function composeOptional<A, B>(ab: Optional<A, B>) {
  return <S>(iso: Iso<S, A>): Optional<S, B> => ({
    getOption: (s) => ab.getOption(iso.get(s)),
    set: (b) => (s) => iso.reverseGet(ab.set(b)(iso.get(s)))
  })
}

export function composeTraversal<A, B>(ab: Traversal<A, B>) {
  return <S>(iso: Iso<S, A>): Traversal<S, B> => {
    const tr = asTraversal(iso)
    return {
      modifyF: <F>(F: CApplicative<F>) => (f: (a: B) => HKT<F, B>) =>
        tr.modifyF(F)(ab.modifyF(F)(f))
    }
  }
}

export function composeFold<A, B>(ab: Fold<A, B>) {
  return <S>(iso: Iso<S, A>): Fold<S, B> => {
    const fo = asFold(iso)
    return {
      foldMap: (M) => (f) => fo.foldMap(M)(ab.foldMap(M)(f))
    }
  }
}

export function composeGetter<A, B>(ab: Getter<A, B>) {
  return <S>(iso: Iso<S, A>): Getter<S, B> => ({
    get: (s) => ab.get(iso.get(s))
  })
}

export function composeSetter<A, B>(ab: Setter<A, B>) {
  return <S>(iso: Iso<S, A>): Setter<S, B> => {
    const st = asSetter(iso)
    return {
      modify: (f) => st.modify(ab.modify(f))
    }
  }
}
