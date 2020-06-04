import { CApplicative, HKT } from "../../Base"
import { identity } from "../../Function"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as I from "../Iso"
import * as L from "../Lens"
import * as P from "../Prism"
import { compose, modify, modifyOption } from "../common/optional"
import { Optional, Traversal, Fold, Setter, Iso, Prism, Getter } from "../common/types"
import { update } from "../common/update"

export { Optional }

export { compose, modify, modifyOption }

export function getOption<S, A>(_: Optional<S, A>) {
  return _.getOption
}

export function set<S, A>(_: Optional<S, A>) {
  return _.set
}

export function create<S, A>(
  getOption: (s: S) => O.Option<A>,
  set: (a: A) => (s: S) => S
): Optional<S, A> {
  return {
    getOption,
    set
  }
}

export function fromNullableProp<S>(): <K extends keyof S>(
  k: K
) => Optional<S, NonNullable<S[K]>> {
  return (k) =>
    create(
      (s) => O.fromNullable(s[k]),
      (a) => (s) => (s[k] == null ? s : update(s, k, a))
    )
}

export interface OptionalFromPath<S> {
  <
    K1 extends keyof S,
    K2 extends keyof NonNullable<S[K1]>,
    K3 extends keyof NonNullable<NonNullable<S[K1]>[K2]>,
    K4 extends keyof NonNullable<NonNullable<NonNullable<S[K1]>[K2]>[K3]>,
    K5 extends keyof NonNullable<NonNullable<NonNullable<S[K1]>[K2]>[K3]>[K4]
  >(
    path: [K1, K2, K3, K4, K5]
  ): Optional<
    S,
    NonNullable<
      NonNullable<NonNullable<NonNullable<NonNullable<S[K1]>[K2]>[K3]>[K4]>[K5]
    >
  >

  <
    K1 extends keyof S,
    K2 extends keyof NonNullable<S[K1]>,
    K3 extends keyof NonNullable<NonNullable<S[K1]>[K2]>,
    K4 extends keyof NonNullable<NonNullable<NonNullable<S[K1]>[K2]>[K3]>
  >(
    path: [K1, K2, K3, K4]
  ): Optional<S, NonNullable<NonNullable<NonNullable<NonNullable<S[K1]>[K2]>[K3]>[K4]>>

  <
    K1 extends keyof S,
    K2 extends keyof NonNullable<S[K1]>,
    K3 extends keyof NonNullable<NonNullable<S[K1]>[K2]>
  >(
    path: [K1, K2, K3]
  ): Optional<S, NonNullable<NonNullable<NonNullable<S[K1]>[K2]>[K3]>>

  <K1 extends keyof S, K2 extends keyof NonNullable<S[K1]>>(path: [K1, K2]): Optional<
    S,
    NonNullable<NonNullable<S[K1]>[K2]>
  >

  <K1 extends keyof S>(path: [K1]): Optional<S, NonNullable<S[K1]>>
}

export function fromPath<S>(): OptionalFromPath<S> {
  const _ = fromNullableProp<S>()
  return (path: Array<any>) => {
    const optional = _(path[0])
    return path.slice(1).reduce((acc, prop) => compose(_(prop))(acc), optional)
  }
}

type OptionPropertyNames<S> = {
  [K in keyof S]-?: S[K] extends O.Option<any> ? K : never
}[keyof S]

type OptionPropertyType<S, K extends OptionPropertyNames<S>> = S[K] extends O.Option<
  infer A
>
  ? A
  : never

export function fromOptionProp<S>(): <P extends OptionPropertyNames<S>>(
  prop: P
) => Optional<S, OptionPropertyType<S, P>> {
  const formProp = L.fromProp<S>()
  return (prop) =>
    pipe(
      formProp(prop),
      L.composePrism({
        getOption: identity,
        reverseGet: (a) => O.some(a) as any
      })
    )
}

export function asTraversal<S, A>(opt: Optional<S, A>): Traversal<S, A> {
  return {
    modifyF: <F>(F: CApplicative<F>) => (f: (a: A) => HKT<F, A>) => (s: S) =>
      O.fold_(
        opt.getOption(s),
        () => F.of(s),
        (a) => F.map((a: A) => opt.set(a)(s))(f(a))
      )
  }
}

export function asFold<S, A>(opt: Optional<S, A>): Fold<S, A> {
  return {
    foldMap: (M) => (f) => (s) => O.fold_(opt.getOption(s), () => M.empty, f)
  }
}

export function asSetter<S, A>(opt: Optional<S, A>): Setter<S, A> {
  const m = modify(opt)
  return {
    modify: m
  }
}

export function composeTraversal<A, B>(ab: Traversal<A, B>) {
  return <S>(opt: Optional<S, A>): Traversal<S, B> => {
    const tr = asTraversal(opt)
    return {
      modifyF: <F>(F: CApplicative<F>) => (f: (a: B) => HKT<F, B>) =>
        tr.modifyF(F)(ab.modifyF(F)(f))
    }
  }
}

export function composeFold<A, B>(ab: Fold<A, B>) {
  return <S>(opt: Optional<S, A>): Fold<S, B> => {
    const fo = asFold(opt)
    return {
      foldMap: (M) => (f) => fo.foldMap(M)(ab.foldMap(M)(f))
    }
  }
}

export function composeSetter<A, B>(ab: Setter<A, B>) {
  return <S>(opt: Optional<S, A>): Setter<S, B> => {
    const se = asSetter(opt)
    return {
      modify: (f) => se.modify(ab.modify(f))
    }
  }
}

export function composeLens<A, B>(ab: L.Lens<A, B>) {
  return compose(L.asOptional(ab))
}

export function composeIso<A, B>(ab: Iso<A, B>) {
  return compose(I.asOptional(ab))
}

export function composePrism<A, B>(ab: Prism<A, B>) {
  return compose(P.asOptional(ab))
}

export function composeGetter<A, B>(ab: Getter<A, B>) {
  return <S>(opt: Optional<S, A>): Fold<S, B> => {
    const fo = asFold(opt)
    return {
      foldMap: (M) => (f) => fo.foldMap(M)((s) => f(ab.get(s)))
    }
  }
}
