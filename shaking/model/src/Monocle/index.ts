/**
 * @since 1.0.0
 */
import type {
  Applicative,
  Applicative1,
  Applicative2,
  Applicative3,
  Applicative2C
} from "fp-ts/lib/Applicative"
import type { Foldable, Foldable1, Foldable2, Foldable3 } from "fp-ts/lib/Foldable"
import type { HKT, URIS, URIS2, URIS3, Kind3, Kind2, Kind } from "fp-ts/lib/HKT"
import type {
  Traversable,
  Traversable1,
  Traversable2,
  Traversable3
} from "fp-ts/lib/Traversable"

import { getMonoid } from "@matechs/core/Array"
import { getApplicative, make } from "@matechs/core/Const"
import { identity, constant, Predicate, Refinement } from "@matechs/core/Function"
import { identityMonad as id } from "@matechs/core/Identity"
import { Monoid, monoidAll, monoidAny } from "@matechs/core/Monoid"
import {
  Option,
  none,
  some,
  fromNullable,
  getFirstMonoid,
  fromPredicate,
  isNone,
  map_,
  chain_
} from "@matechs/core/Option"

const update = <O, K extends keyof O, A extends O[K]>(o: O, k: K, a: A): O => {
  return a === o[k] ? o : Object.assign({}, o, { [k]: a })
}

/**
 * Laws:
 * 1. reverseGet(get(s)) = s
 * 2. get(reversetGet(a)) = a
 *
 * @since 1.0.0
 */
export class Iso<S, A> {
  /**
   * @since 1.0.0
   */
  readonly _tag: "Iso" = "Iso"
  /**
   * @since 1.0.0
   */
  readonly unwrap = this.get
  /**
   * @since 1.0.0
   */
  readonly to = this.get
  /**
   * @since 1.0.0
   */
  readonly wrap = this.reverseGet
  /**
   * @since 1.0.0
   */
  readonly from = this.reverseGet
  constructor(readonly get: (s: S) => A, readonly reverseGet: (a: A) => S) {}

  /**
   * reverse the `Iso`: the source becomes the target and the target becomes the source
   * @since 1.0.0
   */
  reverse(): Iso<A, S> {
    return new Iso(this.reverseGet, this.get)
  }

  /**
   * @since 1.0.0
   */
  modify(f: (a: A) => A): (s: S) => S {
    return (s) => this.reverseGet(f(this.get(s)))
  }

  /**
   * view an `Iso` as a `Lens`
   *
   * @since 1.0.0
   */
  asLens(): Lens<S, A> {
    return new Lens(this.get, (a) => (_) => this.reverseGet(a))
  }

  /**
   * view an `Iso` as a `Prism`
   *
   * @since 1.0.0
   */
  asPrism(): Prism<S, A> {
    return new Prism((s) => some(this.get(s)), this.reverseGet)
  }

  /**
   * view an `Iso` as a `Optional`
   *
   * @since 1.0.0
   */
  asOptional(): Optional<S, A> {
    return new Optional(
      (s) => some(this.get(s)),
      (a) => (_) => this.reverseGet(a)
    )
  }

  /**
   * view an `Iso` as a `Traversal`
   *
   * @since 1.0.0
   */
  asTraversal(): Traversal<S, A> {
    return new Traversal(<F>(F: Applicative<F>) => (f: (a: A) => HKT<F, A>) => (s: S) =>
      F.map(f(this.get(s)), (a) => this.reverseGet(a))
    )
  }

  /**
   * view an `Iso` as a `Fold`
   *
   * @since 1.0.0
   */
  asFold(): Fold<S, A> {
    return new Fold(() => (f) => (s) => f(this.get(s)))
  }

  /**
   * view an `Iso` as a `Getter`
   *
   * @since 1.0.0
   */
  asGetter(): Getter<S, A> {
    return new Getter((s) => this.get(s))
  }

  /**
   * view an `Iso` as a `Setter`
   *
   * @since 1.0.0
   */
  asSetter(): Setter<S, A> {
    return new Setter((f) => this.modify(f))
  }

  /**
   * compose an `Iso` with an `Iso`
   *
   * @since 1.0.0
   */
  compose<B>(ab: Iso<A, B>): Iso<S, B> {
    return new Iso(
      (s) => ab.get(this.get(s)),
      (b) => this.reverseGet(ab.reverseGet(b))
    )
  }

  /**
   * Alias of `compose`
   *
   * @since 1.0.0
   */
  composeIso<B>(ab: Iso<A, B>): Iso<S, B> {
    return this.compose(ab)
  }

  /**
   * compose an `Iso` with a `Lens `
   *
   * @since 1.0.0
   */
  composeLens<B>(ab: Lens<A, B>): Lens<S, B> {
    return this.asLens().compose(ab)
  }

  /**
   * compose an `Iso` with a `Prism`
   *
   * @since 1.0.0
   */
  composePrism<B>(ab: Prism<A, B>): Prism<S, B> {
    return this.asPrism().compose(ab)
  }

  /**
   * compose an `Iso` with an `Optional`
   *
   * @since 1.0.0
   */
  composeOptional<B>(ab: Optional<A, B>): Optional<S, B> {
    return this.asOptional().compose(ab)
  }

  /**
   * compose an `Iso` with a `Traversal`
   *
   * @since 1.0.0
   */
  composeTraversal<B>(ab: Traversal<A, B>): Traversal<S, B> {
    return this.asTraversal().compose(ab)
  }

  /**
   * compose an `Iso` with a `Fold`
   *
   * @since 1.0.0
   */
  composeFold<B>(ab: Fold<A, B>): Fold<S, B> {
    return this.asFold().compose(ab)
  }

  /**
   * compose an `Iso` with a `Getter`
   *
   * @since 1.0.0
   */
  composeGetter<B>(ab: Getter<A, B>): Getter<S, B> {
    return this.asGetter().compose(ab)
  }

  /**
   * compose an `Iso` with a `Setter`
   *
   * @since 1.0.0
   */
  composeSetter<B>(ab: Setter<A, B>): Setter<S, B> {
    return this.asSetter().compose(ab)
  }
}

/**
 * @since 1.3.0
 */
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

/**
 * Laws:
 * 1. get(set(a)(s)) = a
 * 2. set(get(s))(s) = s
 * 3. set(a)(set(a)(s)) = set(a)(s)
 *
 * @since 1.0.0
 */
export class Lens<S, A> {
  /**
   * @since 1.0.0
   */
  readonly _tag: "Lens" = "Lens"
  constructor(readonly get: (s: S) => A, readonly set: (a: A) => (s: S) => S) {}

  /**
   * @example
   * import { Lens } from 'monocle-ts'
   *
   * type Person = {
   *   name: string
   *   age: number
   *   address: {
   *     city: string
   *   }
   * }
   *
   * const city = Lens.fromPath<Person>()(['address', 'city'])
   *
   * const person: Person = { name: 'Giulio', age: 43, address: { city: 'Milan' } }
   *
   * assert.strictEqual(city.get(person), 'Milan')
   * assert.deepStrictEqual(city.set('London')(person), { name: 'Giulio', age: 43, address: { city: 'London' } })
   *
   * @since 1.0.0
   */
  static fromPath<S>(): LensFromPath<S> {
    const fromProp = Lens.fromProp<S>()
    return (path: Array<any>) => {
      const lens = fromProp(path[0])
      return path.slice(1).reduce((acc, prop) => acc.compose(fromProp(prop)), lens)
    }
  }

  /**
   * Returns a `Lens` from a type and a prop
   *
   * @example
   * import { Lens } from 'monocle-ts'
   *
   * type Person = {
   *   name: string
   *   age: number
   * }
   *
   * const age = Lens.fromProp<Person>()('age')
   *
   * const person: Person = { name: 'Giulio', age: 43 }
   *
   * assert.strictEqual(age.get(person), 43)
   * assert.deepStrictEqual(age.set(44)(person), { name: 'Giulio', age: 44 })
   *
   * @since 1.0.0
   */
  static fromProp<S>(): <P extends keyof S>(prop: P) => Lens<S, S[P]> {
    return (prop) =>
      new Lens(
        (s) => s[prop],
        (a) => (s) => update(s, prop, a)
      )
  }

  /**
   * Returns a `Lens` from a type and an array of props
   *
   * @example
   * import { Lens } from 'monocle-ts'
   *
   * interface Person {
   *   name: string
   *   age: number
   *   rememberMe: boolean
   * }
   *
   * const lens = Lens.fromProps<Person>()(['name', 'age'])
   *
   * const person: Person = { name: 'Giulio', age: 44, rememberMe: true }
   *
   * assert.deepStrictEqual(lens.get(person), { name: 'Giulio', age: 44 })
   * assert.deepStrictEqual(lens.set({ name: 'Guido', age: 47 })(person), { name: 'Guido', age: 47, rememberMe: true })
   *
   * @since 1.0.0
   */
  static fromProps<S>(): <P extends keyof S>(
    props: Array<P>
  ) => Lens<S, { [K in P]: S[K] }> {
    return (props) => {
      const len = props.length
      return new Lens(
        (s) => {
          const r: any = {}
          for (let i = 0; i < len; i++) {
            const k = props[i]
            r[k] = s[k]
          }
          return r
        },
        (a) => (s) => {
          for (let i = 0; i < len; i++) {
            const k = props[i]
            if (a[k] !== s[k]) {
              return Object.assign({}, s, a)
            }
          }
          return s
        }
      )
    }
  }

  /**
   * Returns a `Lens` from a nullable (`A | null | undefined`) prop
   *
   * @example
   * import { Lens } from 'monocle-ts'
   *
   * interface Outer {
   *   inner?: Inner
   * }
   *
   * interface Inner {
   *   value: number
   *   foo: string
   * }
   *
   * const inner = Lens.fromNullableProp<Outer>()('inner', { value: 0, foo: 'foo' })
   * const value = Lens.fromProp<Inner>()('value')
   * const lens = inner.compose(value)
   *
   * assert.deepStrictEqual(lens.set(1)({})), { inner: { value: 1, foo: 'foo' } })
   * assert.strictEqual(lens.get({})), 0)
   * assert.deepStrictEqual(lens.set(1)({ inner: { value: 1, foo: 'bar' } })), { inner: { value: 1, foo: 'bar' } })
   * assert.strictEqual(lens.get({ inner: { value: 1, foo: 'bar' } })), 1)
   *
   * @since 1.0.0
   */
  static fromNullableProp<S>(): <A extends S[K], K extends keyof S>(
    k: K,
    defaultValue: A
  ) => Lens<S, NonNullable<S[K]>> {
    return (k, defaultValue) =>
      new Lens(
        (s: S) => {
          const osk = fromNullable(s[k])
          if (isNone(osk)) {
            return defaultValue
          } else {
            return osk.value as any
          }
        },
        (a) => (s) => update(s, k, a)
      )
  }

  /**
   * @since 1.0.0
   */
  modify(f: (a: A) => A): (s: S) => S {
    return (s) => {
      const v = this.get(s)
      const n = f(v)
      return v === n ? s : this.set(n)(s)
    }
  }

  /**
   * view a `Lens` as a Optional
   *
   * @since 1.0.0
   */
  asOptional(): Optional<S, A> {
    return new Optional((s) => some(this.get(s)), this.set)
  }

  /**
   * view a `Lens` as a `Traversal`
   *
   * @since 1.0.0
   */
  asTraversal(): Traversal<S, A> {
    return new Traversal(<F>(F: Applicative<F>) => (f: (a: A) => HKT<F, A>) => (s: S) =>
      F.map(f(this.get(s)), (a) => this.set(a)(s))
    )
  }

  /**
   * view a `Lens` as a `Setter`
   *
   * @since 1.0.0
   */
  asSetter(): Setter<S, A> {
    return new Setter((f) => this.modify(f))
  }

  /**
   * view a `Lens` as a `Getter`
   *
   * @since 1.0.0
   */
  asGetter(): Getter<S, A> {
    return new Getter((s) => this.get(s))
  }

  /**
   * view a `Lens` as a `Fold`
   *
   * @since 1.0.0
   */
  asFold(): Fold<S, A> {
    return new Fold(() => (f) => (s) => f(this.get(s)))
  }

  /**
   * compose a `Lens` with a `Lens`
   *
   * @since 1.0.0
   */
  compose<B>(ab: Lens<A, B>): Lens<S, B> {
    return new Lens(
      (s) => ab.get(this.get(s)),
      (b) => (s) => this.set(ab.set(b)(this.get(s)))(s)
    )
  }

  /**
   * Alias of `compose`
   *
   * @since 1.0.0
   */
  composeLens<B>(ab: Lens<A, B>): Lens<S, B> {
    return this.compose(ab)
  }

  /**
   * compose a `Lens` with a `Getter`
   *
   * @since 1.0.0
   */
  composeGetter<B>(ab: Getter<A, B>): Getter<S, B> {
    return this.asGetter().compose(ab)
  }

  /**
   * compose a `Lens` with a `Fold`
   *
   * @since 1.0.0
   */
  composeFold<B>(ab: Fold<A, B>): Fold<S, B> {
    return this.asFold().compose(ab)
  }

  /**
   * compose a `Lens` with an `Optional`
   *
   * @since 1.0.0
   */
  composeOptional<B>(ab: Optional<A, B>): Optional<S, B> {
    return this.asOptional().compose(ab)
  }

  /**
   * compose a `Lens` with an `Traversal`
   *
   * @since 1.0.0
   */
  composeTraversal<B>(ab: Traversal<A, B>): Traversal<S, B> {
    return this.asTraversal().compose(ab)
  }

  /**
   * compose a `Lens` with an `Setter`
   *
   * @since 1.0.0
   */
  composeSetter<B>(ab: Setter<A, B>): Setter<S, B> {
    return this.asSetter().compose(ab)
  }

  /**
   * compose a `Lens` with an `Iso`
   *
   * @since 1.0.0
   */
  composeIso<B>(ab: Iso<A, B>): Lens<S, B> {
    return this.compose(ab.asLens())
  }

  /**
   * compose a `Lens` with a `Prism`
   *
   * @since 1.0.0
   */
  composePrism<B>(ab: Prism<A, B>): Optional<S, B> {
    return this.asOptional().compose(ab.asOptional())
  }
}

/**
 * Laws:
 * 1. getOption(s).fold(s, reverseGet) = s
 * 2. getOption(reverseGet(a)) = Some(a)
 *
 * @since 1.0.0
 */
export class Prism<S, A> {
  /**
   * @since 1.0.0
   */
  readonly _tag: "Prism" = "Prism"
  constructor(
    readonly getOption: (s: S) => Option<A>,
    readonly reverseGet: (a: A) => S
  ) {}

  /**
   * @since 1.0.0
   */
  static fromPredicate<S, A extends S>(refinement: Refinement<S, A>): Prism<S, A>
  static fromPredicate<A>(predicate: Predicate<A>): Prism<A, A>
  static fromPredicate<A>(predicate: Predicate<A>): Prism<A, A> {
    return new Prism((s) => (predicate(s) ? some(s) : none), identity)
  }

  /**
   * @since 1.0.0
   */
  static some<A>(): Prism<Option<A>, A> {
    return somePrism
  }

  /**
   * @since 1.0.0
   */
  modify(f: (a: A) => A): (s: S) => S {
    return (s) => {
      const os = this.modifyOption(f)(s)
      if (isNone(os)) {
        return s
      } else {
        return os.value
      }
    }
  }

  /**
   * @since 1.0.0
   */
  modifyOption(f: (a: A) => A): (s: S) => Option<S> {
    return (s) =>
      map_(this.getOption(s), (v) => {
        const n = f(v)
        return n === v ? s : this.reverseGet(n)
      })
  }

  /**
   * set the target of a `Prism` with a value
   *
   * @since 1.0.0
   */
  set(a: A): (s: S) => S {
    return this.modify(() => a)
  }

  /**
   * view a `Prism` as a `Optional`
   *
   * @since 1.0.0
   */
  asOptional(): Optional<S, A> {
    return new Optional(this.getOption, (a) => this.set(a))
  }

  /**
   * view a `Prism` as a `Traversal`
   *
   * @since 1.0.0
   */
  asTraversal(): Traversal<S, A> {
    return new Traversal(
      <F>(F: Applicative<F>) => (f: (a: A) => HKT<F, A>) => (s: S) => {
        const oa = this.getOption(s)
        if (isNone(oa)) {
          return F.of(s)
        } else {
          return F.map(f(oa.value), (a) => this.set(a)(s))
        }
      }
    )
  }

  /**
   * view a `Prism` as a `Setter`
   *
   * @since 1.0.0
   */
  asSetter(): Setter<S, A> {
    return new Setter((f) => this.modify(f))
  }

  /**
   * view a `Prism` as a `Fold`
   *
   * @since 1.0.0
   */
  asFold(): Fold<S, A> {
    return new Fold((M) => (f) => (s) => {
      const oa = this.getOption(s)
      return isNone(oa) ? (M.empty as any) : f(oa.value)
    })
  }

  /**
   * compose a `Prism` with a `Prism`
   *
   * @since 1.0.0
   */
  compose<B>(ab: Prism<A, B>): Prism<S, B> {
    return new Prism(
      (s) => chain_(this.getOption(s), (a) => ab.getOption(a)),
      (b) => this.reverseGet(ab.reverseGet(b))
    )
  }

  /**
   * Alias of `compose`
   *
   * @since 1.0.0
   */
  composePrism<B>(ab: Prism<A, B>): Prism<S, B> {
    return this.compose(ab)
  }

  /**
   * compose a `Prism` with a `Optional`
   *
   * @since 1.0.0
   */
  composeOptional<B>(ab: Optional<A, B>): Optional<S, B> {
    return this.asOptional().compose(ab)
  }

  /**
   * compose a `Prism` with a `Traversal`
   *
   * @since 1.0.0
   */
  composeTraversal<B>(ab: Traversal<A, B>): Traversal<S, B> {
    return this.asTraversal().compose(ab)
  }

  /**
   * compose a `Prism` with a `Fold`
   *
   * @since 1.0.0
   */
  composeFold<B>(ab: Fold<A, B>): Fold<S, B> {
    return this.asFold().compose(ab)
  }

  /**
   * compose a `Prism` with a `Setter`
   *
   * @since 1.0.0
   */
  composeSetter<B>(ab: Setter<A, B>): Setter<S, B> {
    return this.asSetter().compose(ab)
  }

  /**
   * compose a `Prism` with a `Iso`
   *
   * @since 1.0.0
   */
  composeIso<B>(ab: Iso<A, B>): Prism<S, B> {
    return this.compose(ab.asPrism())
  }

  /**
   * compose a `Prism` with a `Lens`
   *
   * @since 1.0.0
   */
  composeLens<B>(ab: Lens<A, B>): Optional<S, B> {
    return this.asOptional().compose(ab.asOptional())
  }

  /**
   * compose a `Prism` with a `Getter`
   *
   * @since 1.0.0
   */
  composeGetter<B>(ab: Getter<A, B>): Fold<S, B> {
    return this.asFold().compose(ab.asFold())
  }
}

const somePrism = new Prism<Option<any>, any>(identity, some)

type OptionPropertyNames<S> = {
  [K in keyof S]-?: S[K] extends Option<any> ? K : never
}[keyof S]
type OptionPropertyType<S, K extends OptionPropertyNames<S>> = S[K] extends Option<
  infer A
>
  ? A
  : never

/**
 * @since 2.1.0
 */
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
    NonNullable<NonNullable<NonNullable<NonNullable<S[K1]>[K2]>[K3]>[K4]>[K5]
  >

  <
    K1 extends keyof S,
    K2 extends keyof NonNullable<S[K1]>,
    K3 extends keyof NonNullable<NonNullable<S[K1]>[K2]>,
    K4 extends keyof NonNullable<NonNullable<NonNullable<S[K1]>[K2]>[K3]>
  >(
    path: [K1, K2, K3, K4]
  ): Optional<S, NonNullable<NonNullable<NonNullable<S[K1]>[K2]>[K3]>[K4]>

  <
    K1 extends keyof S,
    K2 extends keyof NonNullable<S[K1]>,
    K3 extends keyof NonNullable<NonNullable<S[K1]>[K2]>
  >(
    path: [K1, K2, K3]
  ): Optional<S, NonNullable<NonNullable<S[K1]>[K2]>[K3]>

  <K1 extends keyof S, K2 extends keyof NonNullable<S[K1]>>(path: [K1, K2]): Optional<
    S,
    NonNullable<S[K1]>[K2]
  >

  <K1 extends keyof S>(path: [K1]): Optional<S, S[K1]>
}

/**
 * Laws:
 * 1. getOption(s).fold(() => s, a => set(a)(s)) = s
 * 2. getOption(set(a)(s)) = getOption(s).map(_ => a)
 * 3. set(a)(set(a)(s)) = set(a)(s)
 *
 * @since 1.0.0
 */
export class Optional<S, A> {
  /**
   * @since 1.0.0
   */
  readonly _tag: "Optional" = "Optional"
  constructor(
    readonly getOption: (s: S) => Option<A>,
    readonly set: (a: A) => (s: S) => S
  ) {}

  /**
   * Returns an `Optional` from a nullable (`A | null | undefined`) prop
   *
   * @example
   * import { Optional } from 'monocle-ts'
   *
   * interface Phone {
   *   number: string
   * }
   * interface Employment {
   *   phone?: Phone
   * }
   * interface Info {
   *   employment?: Employment
   * }
   * interface Response {
   *   info?: Info
   * }
   *
   * const numberFromResponse = Optional.fromPath<Response>()(['info', 'employment', 'phone', 'number'])
   *
   * const response1: Response = {
   *   info: {
   *     employment: {
   *       phone: {
   *         number: '555-1234'
   *       }
   *     }
   *   }
   * }
   * const response2: Response = {
   *   info: {
   *     employment: {}
   *   }
   * }
   *
   * numberFromResponse.getOption(response1) // some('555-1234')
   * numberFromResponse.getOption(response2) // none
   *
   * @since 2.1.0
   */
  static fromPath<S>(): OptionalFromPath<S> {
    const fromNullableProp = Optional.fromNullableProp<S>()
    return (path: Array<any>) => {
      const optional = fromNullableProp(path[0])
      return path
        .slice(1)
        .reduce((acc, prop) => acc.compose(fromNullableProp(prop)), optional)
    }
  }

  /**
   * @example
   * import { Optional } from 'monocle-ts'
   *
   * interface S {
   *   a: number | undefined | null
   * }
   *
   * const optional = Optional.fromNullableProp<S>()('a')
   *
   * const s1: S = { a: undefined }
   * const s2: S = { a: null }
   * const s3: S = { a: 1 }
   *
   * assert.deepStrictEqual(optional.set(2)(s1), s1)
   * assert.deepStrictEqual(optional.set(2)(s2), s2)
   * assert.deepStrictEqual(optional.set(2)(s3), { a: 2 })
   *
   * @since 1.0.0
   */
  static fromNullableProp<S>(): <K extends keyof S>(
    k: K
  ) => Optional<S, NonNullable<S[K]>> {
    return (k) =>
      new Optional(
        (s: any) => fromNullable(s[k]),
        (a) => (s) => (s[k] == null ? s : update(s, k, a))
      )
  }

  /**
   * Returns an `Optional` from an option (`Option<A>`) prop
   *
   * @example
   * import { Optional } from 'monocle-ts'
   * import * as O from 'fp-ts/lib/Option'
   *
   * interface S {
   *   a: O.Option<number>
   * }
   *
   * const optional = Optional.fromOptionProp<S>()('a')
   * const s1: S = { a: O.none }
   * const s2: S = { a: O.some(1) }
   * assert.deepStrictEqual(optional.set(2)(s1), s1)
   * assert.deepStrictEqual(optional.set(2)(s2), { a: O.some(2) })
   *
   * @since 1.0.0
   */
  static fromOptionProp<S>(): <P extends OptionPropertyNames<S>>(
    prop: P
  ) => Optional<S, OptionPropertyType<S, P>> {
    const formProp = Lens.fromProp<S>()
    return (prop) => formProp(prop).composePrism(somePrism as any)
  }

  /**
   * @since 1.0.0
   */
  modify(f: (a: A) => A): (s: S) => S {
    return (s) => {
      const os = this.modifyOption(f)(s)
      if (isNone(os)) {
        return s
      } else {
        return os.value
      }
    }
  }

  /**
   * @since 1.0.0
   */
  modifyOption(f: (a: A) => A): (s: S) => Option<S> {
    return (s) =>
      map_(this.getOption(s), (a) => {
        const n = f(a)
        return n === a ? s : this.set(n)(s)
      })
  }

  /**
   * view a `Optional` as a `Traversal`
   *
   * @since 1.0.0
   */
  asTraversal(): Traversal<S, A> {
    return new Traversal(
      <F>(F: Applicative<F>) => (f: (a: A) => HKT<F, A>) => (s: S) => {
        const oa = this.getOption(s)
        if (isNone(oa)) {
          return F.of(s)
        } else {
          return F.map(f(oa.value), (a: A) => this.set(a)(s))
        }
      }
    )
  }

  /**
   * view an `Optional` as a `Fold`
   *
   * @since 1.0.0
   */
  asFold(): Fold<S, A> {
    return new Fold((M) => (f) => (s) => {
      const oa = this.getOption(s)
      return isNone(oa) ? (M.empty as any) : f(oa.value)
    })
  }

  /**
   * view an `Optional` as a `Setter`
   *
   * @since 1.0.0
   */
  asSetter(): Setter<S, A> {
    return new Setter((f) => this.modify(f))
  }

  /**
   * compose a `Optional` with a `Optional`
   *
   * @since 1.0.0
   */
  compose<B>(ab: Optional<A, B>): Optional<S, B> {
    return new Optional<S, B>(
      (s) => chain_(this.getOption(s), (a) => ab.getOption(a)),
      (b) => this.modify(ab.set(b))
    )
  }

  /**
   * Alias of `compose`
   *
   * @since 1.0.0
   */
  composeOptional<B>(ab: Optional<A, B>): Optional<S, B> {
    return this.compose(ab)
  }

  /**
   * compose an `Optional` with a `Traversal`
   *
   * @since 1.0.0
   */
  composeTraversal<B>(ab: Traversal<A, B>): Traversal<S, B> {
    return this.asTraversal().compose(ab)
  }

  /**
   * compose an `Optional` with a `Fold`
   *
   * @since 1.0.0
   */
  composeFold<B>(ab: Fold<A, B>): Fold<S, B> {
    return this.asFold().compose(ab)
  }

  /**
   * compose an `Optional` with a `Setter`
   *
   * @since 1.0.0
   */
  composeSetter<B>(ab: Setter<A, B>): Setter<S, B> {
    return this.asSetter().compose(ab)
  }

  /**
   * compose an `Optional` with a `Lens`
   *
   * @since 1.0.0
   */
  composeLens<B>(ab: Lens<A, B>): Optional<S, B> {
    return this.compose(ab.asOptional())
  }

  /**
   * compose an `Optional` with a `Prism`
   *
   * @since 1.0.0
   */
  composePrism<B>(ab: Prism<A, B>): Optional<S, B> {
    return this.compose(ab.asOptional())
  }

  /**
   * compose an `Optional` with a `Iso`
   *
   * @since 1.0.0
   */
  composeIso<B>(ab: Iso<A, B>): Optional<S, B> {
    return this.compose(ab.asOptional())
  }

  /**
   * compose an `Optional` with a `Getter`
   *
   * @since 1.0.0
   */
  composeGetter<B>(ab: Getter<A, B>): Fold<S, B> {
    return this.asFold().compose(ab.asFold())
  }
}

/**
 * @since 1.0.0
 */
export interface ModifyF<S, A> {
  <F extends URIS3>(F: Applicative3<F>): <U, L>(
    f: (a: A) => Kind3<F, U, L, A>
  ) => (s: S) => Kind3<F, U, L, S>
  <F extends URIS2>(F: Applicative2<F>): <L>(
    f: (a: A) => Kind2<F, L, A>
  ) => (s: S) => Kind2<F, L, S>
  <F extends URIS2, L>(F: Applicative2C<F, L>): (
    f: (a: A) => Kind2<F, L, A>
  ) => (s: S) => Kind2<F, L, S>
  <F extends URIS>(F: Applicative1<F>): (
    f: (a: A) => Kind<F, A>
  ) => (s: S) => Kind<F, S>
  <F>(F: Applicative<F>): (f: (a: A) => HKT<F, A>) => (s: S) => HKT<F, S>
}

/**
 * @since 1.0.0
 */
export class Traversal<S, A> {
  /**
   * @since 1.0.0
   */
  readonly _tag: "Traversal" = "Traversal"
  constructor(
    // Van Laarhoven representation
    readonly modifyF: ModifyF<S, A>
  ) {}

  /**
   * @since 1.0.0
   */
  modify(f: (a: A) => A): (s: S) => S {
    return this.modifyF(id)(f)
  }

  /**
   * @since 1.0.0
   */
  set(a: A): (s: S) => S {
    return this.modify(constant(a))
  }

  /**
   * focus the items matched by a `traversal` to those that match a predicate
   *
   * @example
   * import { fromTraversable, Lens } from 'monocle-ts'
   * import { array } from 'fp-ts/lib/Array'
   *
   * interface Person {
   *   name: string;
   *   cool: boolean;
   * }
   *
   * const peopleTraversal = fromTraversable(array)<Person>()
   * const coolLens = Lens.fromProp<Person>()('cool')
   * const people = [{name: 'bill', cool: false}, {name: 'jill', cool: true}]
   *
   * const actual = peopleTraversal.filter(p => p.name === 'bill').composeLens(coolLens)
   *   .set(true)(people)
   *
   * assert.deepStrictEqual(actual, [{name: 'bill', cool: true}, {name: 'jill', cool: true}])
   *
   * @since 1.0.0
   */
  filter<B extends A>(refinement: Refinement<A, B>): Traversal<S, B>
  filter(predicate: Predicate<A>): Traversal<S, A>
  filter(predicate: Predicate<A>): Traversal<S, A> {
    return this.composePrism(Prism.fromPredicate(predicate))
  }

  /**
   * view a `Traversal` as a `Fold`
   *
   * @since 1.0.0
   */
  asFold(): Fold<S, A> {
    return new Fold((M) => (f) =>
      this.modifyF(getApplicative(M))((a) => make(f(a) as any)) as any
    )
  }

  /**
   * view a `Traversal` as a `Setter`
   *
   * @since 1.0.0
   */
  asSetter(): Setter<S, A> {
    return new Setter((f) => this.modify(f))
  }

  /**
   * compose a `Traversal` with a `Traversal`
   *
   * @since 1.0.0
   */
  compose<B>(ab: Traversal<A, B>): Traversal<S, B> {
    return new Traversal<S, B>(<F>(F: Applicative<F>) => (f: (a: B) => HKT<F, B>) =>
      this.modifyF(F)(ab.modifyF(F)(f))
    )
  }

  /**
   * Alias of `compose`
   *
   * @since 1.0.0
   */
  composeTraversal<B>(ab: Traversal<A, B>): Traversal<S, B> {
    return this.compose(ab)
  }

  /**
   * compose a `Traversal` with a `Fold`
   *
   * @since 1.0.0
   */
  composeFold<B>(ab: Fold<A, B>): Fold<S, B> {
    return this.asFold().compose(ab)
  }

  /**
   * compose a `Traversal` with a `Setter`
   *
   * @since 1.0.0
   */
  composeSetter<B>(ab: Setter<A, B>): Setter<S, B> {
    return this.asSetter().compose(ab)
  }

  /**
   * compose a `Traversal` with a `Optional`
   *
   * @since 1.0.0
   */
  composeOptional<B>(ab: Optional<A, B>): Traversal<S, B> {
    return this.compose(ab.asTraversal())
  }

  /**
   * compose a `Traversal` with a `Lens`
   *
   * @since 1.0.0
   */
  composeLens<B>(ab: Lens<A, B>): Traversal<S, B> {
    return this.compose(ab.asTraversal())
  }

  /**
   * compose a `Traversal` with a `Prism`
   *
   * @since 1.0.0
   */
  composePrism<B>(ab: Prism<A, B>): Traversal<S, B> {
    return this.compose(ab.asTraversal())
  }

  /**
   * compose a `Traversal` with a `Iso`
   *
   * @since 1.0.0
   */
  composeIso<B>(ab: Iso<A, B>): Traversal<S, B> {
    return this.compose(ab.asTraversal())
  }

  /**
   * compose a `Traversal` with a `Getter`
   *
   * @since 1.0.0
   */
  composeGetter<B>(ab: Getter<A, B>): Fold<S, B> {
    return this.asFold().compose(ab.asFold())
  }
}

/**
 * @since 1.2.0
 */
export class At<S, I, A> {
  /**
   * @since 1.0.0
   */
  readonly _tag: "At" = "At"
  constructor(readonly at: (i: I) => Lens<S, A>) {}

  /**
   * lift an instance of `At` using an `Iso`
   *
   * @since 1.2.0
   */
  fromIso<T>(iso: Iso<T, S>): At<T, I, A> {
    return new At((i) => iso.composeLens(this.at(i)))
  }
}

/**
 * @since 1.2.0
 */
export class Index<S, I, A> {
  /**
   * @since 1.0.0
   */
  readonly _tag: "Index" = "Index"
  constructor(readonly index: (i: I) => Optional<S, A>) {}

  /**
   * @since 1.2.0
   */
  static fromAt<T, J, B>(at: At<T, J, Option<B>>): Index<T, J, B> {
    return new Index((i) => at.at(i).composePrism(Prism.some()))
  }

  /**
   * lift an instance of `Index` using an `Iso`
   *
   * @since 1.2.0
   */
  fromIso<T>(iso: Iso<T, S>): Index<T, I, A> {
    return new Index((i) => iso.composeOptional(this.index(i)))
  }
}

/**
 * @since 1.0.0
 */
export class Getter<S, A> {
  /**
   * @since 1.0.0
   */
  readonly _tag: "Getter" = "Getter"
  constructor(readonly get: (s: S) => A) {}

  /**
   * view a `Getter` as a `Fold`
   *
   * @since 1.0.0
   */
  asFold(): Fold<S, A> {
    return new Fold(() => (f) => (s) => f(this.get(s)))
  }

  /**
   * compose a `Getter` with a `Getter`
   *
   * @since 1.0.0
   */
  compose<B>(ab: Getter<A, B>): Getter<S, B> {
    return new Getter((s) => ab.get(this.get(s)))
  }

  /**
   * Alias of `compose`
   *
   * @since 1.0.0
   */
  composeGetter<B>(ab: Getter<A, B>): Getter<S, B> {
    return this.compose(ab)
  }

  /**
   * compose a `Getter` with a `Fold`
   *
   * @since 1.0.0
   */
  composeFold<B>(ab: Fold<A, B>): Fold<S, B> {
    return this.asFold().compose(ab)
  }

  /**
   * compose a `Getter` with a `Lens`
   *
   * @since 1.0.0
   */
  composeLens<B>(ab: Lens<A, B>): Getter<S, B> {
    return this.compose(ab.asGetter())
  }

  /**
   * compose a `Getter` with a `Iso`
   *
   * @since 1.0.0
   */
  composeIso<B>(ab: Iso<A, B>): Getter<S, B> {
    return this.compose(ab.asGetter())
  }

  /**
   * compose a `Getter` with a `Optional`
   *
   * @since 1.0.0
   */
  composeTraversal<B>(ab: Traversal<A, B>): Fold<S, B> {
    return this.asFold().compose(ab.asFold())
  }

  /**
   * compose a `Getter` with a `Optional`
   *
   * @since 1.0.0
   */
  composeOptional<B>(ab: Optional<A, B>): Fold<S, B> {
    return this.asFold().compose(ab.asFold())
  }

  /**
   * compose a `Getter` with a `Prism`
   *
   * @since 1.0.0
   */
  composePrism<B>(ab: Prism<A, B>): Fold<S, B> {
    return this.asFold().compose(ab.asFold())
  }
}

/**
 * @since 1.0.0
 */
export class Fold<S, A> {
  /**
   * @since 1.0.0
   */
  readonly _tag: "Fold" = "Fold"
  /**
   * get all the targets of a `Fold`
   *
   * @since 1.0.0
   */
  readonly getAll: (s: S) => Array<A>
  /**
   * check if at least one target satisfies the predicate
   *
   * @since 1.0.0
   */
  readonly exist: (p: Predicate<A>) => Predicate<S>
  /**
   * check if all targets satisfy the predicate
   *
   * @since 1.0.0
   */
  readonly all: (p: Predicate<A>) => Predicate<S>
  private foldMapFirst: (f: (a: A) => Option<A>) => (s: S) => Option<A>
  constructor(readonly foldMap: <M>(M: Monoid<M>) => (f: (a: A) => M) => (s: S) => M) {
    this.getAll = foldMap(getMonoid<A>())((a) => [a])
    this.exist = foldMap(monoidAny)
    this.all = foldMap(monoidAll)
    this.foldMapFirst = foldMap(getFirstMonoid())
  }

  /**
   * compose a `Fold` with a `Fold`
   *
   * @since 1.0.0
   */
  compose<B>(ab: Fold<A, B>): Fold<S, B> {
    return new Fold(<M>(M: Monoid<M>) => (f: (b: B) => M) =>
      this.foldMap(M)(ab.foldMap(M)(f))
    )
  }

  /**
   * Alias of `compose`
   *
   * @since 1.0.0
   */
  composeFold<B>(ab: Fold<A, B>): Fold<S, B> {
    return this.compose(ab)
  }

  /**
   * compose a `Fold` with a `Getter`
   *
   * @since 1.0.0
   */
  composeGetter<B>(ab: Getter<A, B>): Fold<S, B> {
    return this.compose(ab.asFold())
  }

  /**
   * compose a `Fold` with a `Traversal`
   *
   * @since 1.0.0
   */
  composeTraversal<B>(ab: Traversal<A, B>): Fold<S, B> {
    return this.compose(ab.asFold())
  }

  /**
   * compose a `Fold` with a `Optional`
   *
   * @since 1.0.0
   */
  composeOptional<B>(ab: Optional<A, B>): Fold<S, B> {
    return this.compose(ab.asFold())
  }

  /**
   * compose a `Fold` with a `Lens`
   *
   * @since 1.0.0
   */
  composeLens<B>(ab: Lens<A, B>): Fold<S, B> {
    return this.compose(ab.asFold())
  }

  /**
   * compose a `Fold` with a `Prism`
   *
   * @since 1.0.0
   */
  composePrism<B>(ab: Prism<A, B>): Fold<S, B> {
    return this.compose(ab.asFold())
  }

  /**
   * compose a `Fold` with a `Iso`
   *
   * @since 1.0.0
   */
  composeIso<B>(ab: Iso<A, B>): Fold<S, B> {
    return this.compose(ab.asFold())
  }

  /**
   * find the first target of a `Fold` matching the predicate
   *
   * @since 1.0.0
   */
  find<B extends A>(p: Refinement<A, B>): (s: S) => Option<B>
  find(p: Predicate<A>): (s: S) => Option<A>
  find(p: Predicate<A>): (s: S) => Option<A> {
    return this.foldMapFirst(fromPredicate(p))
  }

  /**
   * get the first target of a `Fold`
   *
   * @since 1.0.0
   */
  headOption(s: S): Option<A> {
    return this.find(() => true)(s)
  }
}

/**
 * @since 1.0.0
 */
export class Setter<S, A> {
  /**
   * @since 1.0.0
   */
  readonly _tag: "Setter" = "Setter"
  constructor(readonly modify: (f: (a: A) => A) => (s: S) => S) {}

  /**
   * @since 1.0.0
   */
  set(a: A): (s: S) => S {
    return this.modify(constant(a))
  }

  /**
   * compose a `Setter` with a `Setter`
   *
   * @since 1.0.0
   */
  compose<B>(ab: Setter<A, B>): Setter<S, B> {
    return new Setter((f) => this.modify(ab.modify(f)))
  }

  /**
   * Alias of `compose`
   *
   * @since 1.0.0
   */
  composeSetter<B>(ab: Setter<A, B>): Setter<S, B> {
    return this.compose(ab)
  }

  /**
   * compose a `Setter` with a `Traversal`
   *
   * @since 1.0.0
   */
  composeTraversal<B>(ab: Traversal<A, B>): Setter<S, B> {
    return this.compose(ab.asSetter())
  }

  /**
   * compose a `Setter` with a `Optional`
   *
   * @since 1.0.0
   */
  composeOptional<B>(ab: Optional<A, B>): Setter<S, B> {
    return this.compose(ab.asSetter())
  }

  /**
   * compose a `Setter` with a `Lens`
   *
   * @since 1.0.0
   */
  composeLens<B>(ab: Lens<A, B>): Setter<S, B> {
    return this.compose(ab.asSetter())
  }

  /**
   * compose a `Setter` with a `Prism`
   *
   * @since 1.0.0
   */
  composePrism<B>(ab: Prism<A, B>): Setter<S, B> {
    return this.compose(ab.asSetter())
  }

  /**
   * compose a `Setter` with a `Iso`
   *
   * @since 1.0.0
   */
  composeIso<B>(ab: Iso<A, B>): Setter<S, B> {
    return this.compose(ab.asSetter())
  }
}

/**
 * create a `Traversal` from a `Traversable`
 *
 * @example
 * import { Lens, fromTraversable } from 'monocle-ts'
 * import { array } from 'fp-ts/lib/Array'
 *
 * interface Tweet {
 *   text: string
 * }
 *
 * interface Tweets {
 *   tweets: Tweet[]
 * }
 *
 * const tweetsLens = Lens.fromProp<Tweets>()('tweets')
 * const tweetTextLens = Lens.fromProp<Tweet>()('text')
 * const tweetTraversal = fromTraversable(array)<Tweet>()
 * const composedTraversal = tweetsLens.composeTraversal(tweetTraversal).composeLens(tweetTextLens)
 *
 * const tweet1: Tweet = { text: 'hello world' }
 * const tweet2: Tweet = { text: 'foobar' }
 * const model: Tweets = { tweets: [tweet1, tweet2] }
 *
 * const actual = composedTraversal.modify(text =>
 *   text
 *     .split('')
 *     .reverse()
 *     .join('')
 * )(model)
 *
 * assert.deepStrictEqual(actual, { tweets: [ { text: 'dlrow olleh' }, { text: 'raboof' } ] })
 *
 * @since 1.0.0
 */
export function fromTraversable<T extends URIS3>(
  T: Traversable3<T>
): <U, L, A>() => Traversal<Kind3<T, U, L, A>, A>
export function fromTraversable<T extends URIS2>(
  T: Traversable2<T>
): <L, A>() => Traversal<Kind2<T, L, A>, A>
export function fromTraversable<T extends URIS>(
  T: Traversable1<T>
): <A>() => Traversal<Kind<T, A>, A>
export function fromTraversable<T>(T: Traversable<T>): <A>() => Traversal<HKT<T, A>, A>
export function fromTraversable<T>(
  T: Traversable<T>
): <A>() => Traversal<HKT<T, A>, A> {
  return <A>() =>
    new Traversal(<F>(F: Applicative<F>) => {
      const traverseF = T.traverse(F)
      return (f: (a: A) => HKT<F, A>) => (s: HKT<T, A>) => traverseF(s, f)
    })
}

/**
 * create a `Fold` from a `Foldable`
 *
 * @since 1.0.0
 */
export function fromFoldable<F extends URIS3>(
  F: Foldable3<F>
): <U, L, A>() => Fold<Kind3<F, U, L, A>, A>
export function fromFoldable<F extends URIS2>(
  F: Foldable2<F>
): <L, A>() => Fold<Kind2<F, L, A>, A>
export function fromFoldable<F extends URIS>(
  F: Foldable1<F>
): <A>() => Fold<Kind<F, A>, A>
export function fromFoldable<F>(F: Foldable<F>): <A>() => Fold<HKT<F, A>, A>
export function fromFoldable<F>(F: Foldable<F>): <A>() => Fold<HKT<F, A>, A> {
  return <A>() =>
    new Fold<HKT<F, A>, A>(<M>(M: Monoid<M>) => {
      const foldMapFM = F.foldMap(M)
      return (f: (a: A) => M) => (s) => foldMapFM(s, f)
    })
}
