/**
 * @since 1.0.0
 */
import { identity } from "./Function"
import type { Kind, TypeLambda } from "./HKT"

/**
 * @category symbols
 * @since 1.0.0
 */
export const GenKindTypeId = Symbol.for("effect/Gen/GenKind")

/**
 * @category symbols
 * @since 1.0.0
 */
export type GenKindTypeId = typeof GenKindTypeId

/**
 * @category models
 * @since 1.0.0
 */
export interface GenKind<F extends TypeLambda, R, O, E, A> extends Variance<F, R, O, E> {
  readonly value: Kind<F, R, O, E, A>

  [Symbol.iterator](): Generator<GenKind<F, R, O, E, A>, A>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export class GenKindImpl<F extends TypeLambda, R, O, E, A> implements GenKind<F, R, O, E, A> {
  constructor(
    /**
     * @since 1.0.0
     */
    readonly value: Kind<F, R, O, E, A>
  ) {}

  /**
   * @since 1.0.0
   */
  get _F() {
    return identity
  }

  /**
   * @since 1.0.0
   */
  get _R() {
    return (_: R) => _
  }

  /**
   * @since 1.0.0
   */
  get _O() {
    return (_: never): O => _
  }

  /**
   * @since 1.0.0
   */
  get _E() {
    return (_: never): E => _
  }

  /**
   * @since 1.0.0
   */
  readonly [GenKindTypeId]: typeof GenKindTypeId = GenKindTypeId;

  /**
   * @since 1.0.0
   */
  [Symbol.iterator](): Generator<GenKind<F, R, O, E, A>, A> {
    return new SingleShotGen<GenKind<F, R, O, E, A>, A>(this as any)
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export class SingleShotGen<T, A> implements Generator<T, A> {
  private called = false

  constructor(readonly self: T) {}

  /**
   * @since 1.0.0
   */
  next(a: A): IteratorResult<T, A> {
    return this.called ?
      ({
        value: a,
        done: true
      }) :
      (this.called = true,
        ({
          value: this.self,
          done: false
        }))
  }

  /**
   * @since 1.0.0
   */
  return(a: A): IteratorResult<T, A> {
    return ({
      value: a,
      done: true
    })
  }

  /**
   * @since 1.0.0
   */
  throw(e: unknown): IteratorResult<T, A> {
    throw e
  }

  /**
   * @since 1.0.0
   */
  [Symbol.iterator](): Generator<T, A> {
    return new SingleShotGen<T, A>(this.self)
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const makeGenKind = <F extends TypeLambda, R, O, E, A>(
  kind: Kind<F, R, O, E, A>
): GenKind<F, R, O, E, A> => new GenKindImpl(kind)

/**
 * @category models
 * @since 1.0.0
 */
export interface Variance<F extends TypeLambda, R, O, E> {
  readonly [GenKindTypeId]: GenKindTypeId
  readonly _F: (_: F) => F
  readonly _R: (_: R) => unknown
  readonly _O: (_: never) => O
  readonly _E: (_: never) => E
}

/**
 * @category models
 * @since 1.0.0
 */
export interface Gen<F extends TypeLambda, Z> {
  <K extends Variance<F, any, any, any>, A>(
    body: (resume: Z) => Generator<K, A>
  ): Kind<
    F,
    [K] extends [Variance<F, infer R, any, any>] ? R : never,
    [K] extends [Variance<F, any, infer O, any>] ? O : never,
    [K] extends [Variance<F, any, any, infer E>] ? E : never,
    A
  >
}

/**
 * @category models
 * @since 1.0.0
 */
export interface Adapter<Z extends TypeLambda> {
  <_R, _O, _E, _A>(
    self: Kind<Z, _R, _O, _E, _A>
  ): GenKind<Z, _R, _O, _E, _A>
  <A, _R, _O, _E, _A>(a: A, ab: (a: A) => Kind<Z, _R, _O, _E, _A>): GenKind<Z, _R, _O, _E, _A>
  <A, B, _R, _O, _E, _A>(a: A, ab: (a: A) => B, bc: (b: B) => Kind<Z, _R, _O, _E, _A>): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => Kind<Z, _R, _O, _E, _A>
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => Kind<Z, _R, _O, _E, _A>
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => Kind<Z, _R, _O, _E, _A>
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => Kind<Z, _R, _O, _E, _A>
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: F) => Kind<Z, _R, _O, _E, _A>
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (g: H) => Kind<Z, _R, _O, _E, _A>
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => Kind<Z, _R, _O, _E, _A>
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => Kind<Z, _R, _O, _E, _A>
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => Kind<Z, _R, _O, _E, _A>
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => Kind<Z, _R, _O, _E, _A>
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => Kind<Z, _R, _O, _E, _A>
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => Kind<Z, _R, _O, _E, _A>
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => Kind<Z, _R, _O, _E, _A>
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Kind<Z, _R, _O, _E, _A>
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Q,
    qr: (q: Q) => Kind<Z, _R, _O, _E, _A>
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Q,
    qr: (q: Q) => R,
    rs: (r: R) => Kind<Z, _R, _O, _E, _A>
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Q,
    qr: (q: Q) => R,
    rs: (r: R) => S,
    st: (s: S) => Kind<Z, _R, _O, _E, _A>
  ): GenKind<Z, _R, _O, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, _R, _O, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Q,
    qr: (q: Q) => R,
    rs: (r: R) => S,
    st: (s: S) => T,
    tu: (s: T) => Kind<Z, _R, _O, _E, _A>
  ): GenKind<Z, _R, _O, _E, _A>
}

/**
 * @category adapters
 * @since 1.0.0
 */
export const adapter: <F extends TypeLambda>() => Adapter<F> = () =>
  // @ts-expect-error
  function() {
    let x = arguments[0]
    for (let i = 1; i < arguments.length; i++) {
      x = arguments[i](x)
    }
    return new GenKindImpl(x)
  }
