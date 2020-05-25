import { CApplicative, HKT } from "../../Base"
import { Monoid } from "../../Monoid"
import * as O from "../../Option"
import * as Op from "../common/optional"
import * as Pr from "../common/prism"
import {
  Lens,
  Optional,
  Traversal,
  Setter,
  Fold,
  Getter,
  Iso,
  Prism
} from "../common/types"
import { update } from "../common/update"

export { Lens }

export interface LensFromPath<S> {
  <
    K1 extends keyof S,
    K2 extends keyof S[K1],
    K3 extends keyof S[K1][K2],
    K4 extends keyof S[K1][K2][K3],
    K5 extends keyof S[K1][K2][K3][K4]
  >(
    path: [K1, K2, K3, K4, K5]
  ): Lens<S, S[K1][K2][K3][K4][K5]>
  <
    K1 extends keyof S,
    K2 extends keyof S[K1],
    K3 extends keyof S[K1][K2],
    K4 extends keyof S[K1][K2][K3]
  >(
    path: [K1, K2, K3, K4]
  ): Lens<S, S[K1][K2][K3][K4]>
  <K1 extends keyof S, K2 extends keyof S[K1], K3 extends keyof S[K1][K2]>(
    path: [K1, K2, K3]
  ): Lens<S, S[K1][K2][K3]>
  <K1 extends keyof S, K2 extends keyof S[K1]>(path: [K1, K2]): Lens<S, S[K1][K2]>
  <K1 extends keyof S>(path: [K1]): Lens<S, S[K1]>
}

export const fromProp = <S>(): (<P extends keyof S>(prop: P) => Lens<S, S[P]>) => {
  return (prop) => ({
    get: (s) => s[prop],
    set: (a) => (s) => update(s, prop, a)
  })
}

export const compose = <A, B>(ab: Lens<A, B>) => <S>(sa: Lens<S, A>): Lens<S, B> => {
  return {
    get: (s) => ab.get(sa.get(s)),
    set: (b) => (s) => sa.set(ab.set(b)(sa.get(s)))(s)
  }
}

export const fromPath = <S>(): LensFromPath<S> => {
  const from = fromProp<S>()
  return (path: Array<any>) => {
    const lens = from(path[0])
    return path.slice(1).reduce((acc, prop) => compose(from(prop) as any)(acc), lens)
  }
}

export const fromProps = <S>(): (<P extends keyof S>(
  props: Array<P>
) => Lens<S, { [K in P]: S[K] }>) => {
  return (props) => {
    const len = props.length
    return {
      get: (s) => {
        const r: any = {}
        for (let i = 0; i < len; i++) {
          const k = props[i]
          r[k] = s[k]
        }
        return r
      },
      set: (a) => (s) => {
        for (let i = 0; i < len; i++) {
          const k = props[i]
          if (a[k] !== s[k]) {
            return Object.assign({}, s, a)
          }
        }
        return s
      }
    }
  }
}

export const fromNullableProp = <S>(): (<A extends S[K], K extends keyof S>(
  k: K,
  defaultValue: A
) => Lens<S, NonNullable<S[K]>>) => {
  return (k, defaultValue) => ({
    get: (s: S) => {
      const osk = O.fromNullable(s[k])
      if (O.isNone(osk)) {
        return defaultValue
      } else {
        return osk.value as any
      }
    },
    set: (a) => (s) => update(s, k, a)
  })
}

export function create<S, A>(get: (s: S) => A, set: (a: A) => (s: S) => S): Lens<S, A> {
  return {
    get,
    set
  }
}

export function get<S, A>(_: Lens<S, A>) {
  return _.get
}

export function set<S, A>(_: Lens<S, A>): (a: A) => (s: S) => S {
  return _.set
}

export function modify<S, A>(_: Lens<S, A>): (f: (a: A) => A) => (s: S) => S {
  return (f) => (s) => {
    const v = _.get(s)
    const n = f(v)
    return v === n ? s : _.set(n)(s)
  }
}

export function asOptional<S, A>(_: Lens<S, A>): Optional<S, A> {
  return {
    getOption: (s) => O.some(_.get(s)),
    set: _.set
  }
}

export function asTraversal<S, A>(_: Lens<S, A>): Traversal<S, A> {
  return {
    modifyF: <F>(F: CApplicative<F>) => (f: (a: A) => HKT<F, A>) => (s: S) =>
      F.map((a: A) => _.set(a)(s))(f(_.get(s)))
  }
}

export function asSetter<S, A>(_: Lens<S, A>): Setter<S, A> {
  const m = modify(_)
  return {
    modify: m
  }
}

export function asFold<S, A>(_: Lens<S, A>): Fold<S, A> {
  return {
    foldMap: () => (f) => (s) => f(_.get(s))
  }
}

export function asGetter<S, A>(_: Lens<S, A>): Getter<S, A> {
  return {
    get: _.get
  }
}

export function composeGetter<A, B>(
  _: Getter<A, B>
): <S>(_: Lens<S, A>) => Getter<S, B> {
  return (l) => ({
    get: (s) => _.get(l.get(s))
  })
}

export function composeSetter<A, B>(
  _: Setter<A, B>
): <S>(_: Lens<S, A>) => Setter<S, B> {
  return (l) => ({
    modify: (f) => modify(l)(_.modify(f))
  })
}

export function composeOptional<A, B>(
  _: Optional<A, B>
): <S>(_: Lens<S, A>) => Optional<S, B> {
  return (l) => Op.compose(_)(asOptional(l))
}

export function composeTraversal<A, B>(
  _: Traversal<A, B>
): <S>(_: Lens<S, A>) => Traversal<S, B> {
  return <S>(l: Lens<S, A>) => {
    const tr = asTraversal(l)
    return {
      modifyF: <F>(F: CApplicative<F>) => (f: (a: B) => HKT<F, B>) =>
        tr.modifyF(F)(_.modifyF(F)(f))
    }
  }
}

export function composeFold<A, B>(_: Fold<A, B>): <S>(_: Lens<S, A>) => Fold<S, B> {
  return (l) => {
    const fo = asFold(l)
    return {
      foldMap: <M>(M: Monoid<M>) => (f: (b: B) => M) => fo.foldMap(M)(_.foldMap(M)(f))
    }
  }
}

export function composeIso<A, B>(_: Iso<A, B>): <S>(_: Lens<S, A>) => Lens<S, B> {
  return (l) => ({
    get: (s) => _.get(l.get(s)),
    set: (b) => l.set(_.reverseGet(b))
  })
}

export function composePrism<A, B>(
  _: Prism<A, B>
): <S>(_: Lens<S, A>) => Optional<S, B> {
  return (l) => Op.compose(Pr.asOptional(_))(asOptional(l))
}
