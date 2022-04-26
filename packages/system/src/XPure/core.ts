// ets_tracing: off

/* eslint-disable prefer-const */
import * as Chunk from "../Collections/Immutable/Chunk/core.js"
import * as Tp from "../Collections/Immutable/Tuple/index.js"
import { _A, _E, _R, _S1, _S2, _U, _W } from "../Effect/commons.js"
import type { EffectURI } from "../Effect/effect.js"
import * as E from "../Either/core.js"
import { Stack } from "../Stack/index.js"
import type { HasUnify } from "../Utils/index.js"

/**
 * `XPure[W, S1, S2, R, E, A]` is a purely functional description of a
 * computation that requires an environment `R` and an initial state `S1` and
 * may either fail with an `E` or succeed with an updated state `S2` and an `A`
 * along with in either case a log with entries of type `W`. Because of its
 * polymorphism `ZPure` can be used to model a variety of effects including
 * context, state, failure, and logging.
 */
export interface XPure<W, S1, S2, R, E, A> extends HasUnify {
  readonly _tag: "XPure"
  readonly [_S1]: (_: S1) => void
  readonly [_S2]: () => S2

  readonly [_U]: EffectURI
  readonly [_W]: () => W
  readonly [_E]: () => E
  readonly [_A]: () => A
  readonly [_R]: (_: R) => void
}

export abstract class XPureBase<W, S1, S2, R, E, A>
  implements XPure<W, S1, S2, R, E, A>
{
  readonly _tag = "XPure";

  readonly [_S1]!: (_: S1) => void;
  readonly [_S2]!: () => S2;

  readonly [_U]!: EffectURI;
  readonly [_W]!: () => W;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A;
  readonly [_R]!: (_: R) => void
}

/**
 * @ets_optimize remove
 */
function concrete<W, S1, S2, R, E, A>(
  _: XPure<W, S1, S2, R, E, A>
): asserts _ is Concrete<W, S1, S2, R, E, A> {
  //
}

class Succeed<A> extends XPureBase<never, unknown, never, unknown, never, A> {
  readonly _xptag = "Succeed"

  constructor(readonly a: A) {
    super()
  }
}

class Log<W> extends XPureBase<W, unknown, never, unknown, never, never> {
  readonly _xptag = "Log"

  constructor(readonly w: W) {
    super()
  }
}

class Suspend<W, S1, S2, R, E, A> extends XPureBase<W, S1, S2, R, E, A> {
  readonly _xptag = "Suspend"

  constructor(readonly f: () => XPure<W, S1, S2, R, E, A>) {
    super()
  }
}

class Fail<E> extends XPureBase<never, unknown, never, unknown, E, never> {
  readonly _xptag = "Fail"

  constructor(readonly e: E) {
    super()
  }
}

class Modify<S1, S2, E, A> extends XPureBase<never, S1, S2, unknown, E, A> {
  readonly _xptag = "Modify"

  constructor(readonly run: (s1: S1) => Tp.Tuple<[S2, A]>) {
    super()
  }
}

class FlatMap<W, W2, S1, S2, S3, R, R1, E, E1, A, B> extends XPureBase<
  W | W2,
  S1,
  S3,
  R & R1,
  E1 | E,
  B
> {
  readonly _xptag = "FlatMap"

  constructor(
    readonly value: XPure<W, S1, S2, R, E, A>,
    readonly cont: (a: A) => XPure<W2, S2, S3, R1, E1, B>
  ) {
    super()
  }
}

class Fold<W, W1, W2, S1, S2, S3, R, E1, E2, A, B> extends XPureBase<
  W | W1 | W2,
  S1,
  S3,
  R,
  E2,
  B
> {
  readonly _xptag = "Fold"

  constructor(
    readonly value: XPure<W, S1, S2, R, E1, A>,
    readonly failure: (e: E1) => XPure<W1, S1, S3, R, E2, B>,
    readonly success: (a: A) => XPure<W2, S2, S3, R, E2, B>
  ) {
    super()
  }
}

class Get<W, S1, S2, R, E, A> extends XPureBase<W, S1, S2, R, E, A> {
  readonly _xptag = "Get"

  constructor(readonly get: (s: S1) => XPure<W, S1, S2, R, E, A>) {
    super()
  }
}

class Access<W, S1, S2, R, E, A> extends XPureBase<W, S1, S2, R, E, A> {
  readonly _xptag = "Access"

  constructor(readonly access: (r: R) => XPure<W, S1, S2, R, E, A>) {
    super()
  }
}

class Provide<W, S1, S2, R, E, A> extends XPureBase<W, S1, S2, unknown, E, A> {
  readonly _xptag = "Provide"

  constructor(readonly r: R, readonly cont: XPure<W, S1, S2, R, E, A>) {
    super()
  }
}

type Concrete<W, S1, S2, R, E, A> =
  | Succeed<A>
  | Fail<E>
  | Log<W>
  | Get<W, S1, S2, R, E, A>
  | Modify<S1, S2, E, A>
  | FlatMap<W, W, S1, unknown, S2, R, R, E, E, unknown, A>
  | Fold<W, W, W, S1, unknown, S2, R, unknown, E, unknown, A>
  | Access<W, S1, S2, R, E, A>
  | Provide<W, S1, S2, R, E, A>
  | Suspend<W, S1, S2, R, E, A>

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export function chain<W, A, S2, S3, R1, E1, B>(
  f: (a: A) => XPure<W, S2, S3, R1, E1, B>
) {
  return <W1, S1, R, E>(
    self: XPure<W1, S1, S2, R, E, A>
  ): XPure<W | W1, S1, S3, R & R1, E | E1, B> => new FlatMap(self, f)
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export function chain_<W, W1, S1, R, E, A, S2, S3, R1, E1, B>(
  self: XPure<W, S1, S2, R, E, A>,
  f: (a: A) => XPure<W1, S2, S3, R1, E1, B>
): XPure<W | W1, S1, S3, R & R1, E | E1, B> {
  return new FlatMap(self, f)
}

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 */
export function tap<W, A, S2, S3, R1, E1, X>(f: (a: A) => XPure<W, S2, S3, R1, E1, X>) {
  return <W1, S1, R, E>(
    self: XPure<W1, S1, S2, R, E, A>
  ): XPure<W | W1, S1, S3, R & R1, E | E1, A> => tap_(self, f)
}

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 */
export function tap_<W, W1, S1, R, E, A, S2, S3, R1, E1, X>(
  self: XPure<W, S1, S2, R, E, A>,
  f: (a: A) => XPure<W1, S2, S3, R1, E1, X>
): XPure<W | W1, S1, S3, R & R1, E | E1, A> {
  return chain_(self, (a) => map_(f(a), () => a))
}

/**
 * Constructs a computation that always succeeds with the specified value,
 * passing the state through unchanged.
 */
export function succeed<S, A>(a: A): XPure<never, S, S, unknown, never, A> {
  return new Succeed(a)
}

/**
 * Constructs a computation that logs w.
 */
export function log<S, W>(w: W): XPure<W, S, S, unknown, never, never> {
  return new Log(w)
}

/**
 * Constructs a computation that logs w.
 */
export function logWith<S, W>(f: () => W) {
  return suspend(() => log<S, W>(f()))
}

/**
 * Constructs a computation that always succeeds with the specified value,
 * passing the state through unchanged.
 */
export function fail<E>(a: E): XPure<never, unknown, never, unknown, E, never> {
  return new Fail(a)
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export function map_<W, S1, R, E, A, S2, B>(
  self: XPure<W, S1, S2, R, E, A>,
  f: (a: A) => B
) {
  return chain_(self, (a) => succeed(f(a)))
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export function map<A, B>(f: (a: A) => B) {
  return <W, S1, S2, R, E>(self: XPure<W, S1, S2, R, E, A>) =>
    chain_(self, (a) => succeed(f(a)))
}

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 */
export function foldM_<W, W1, W2, S1, S2, S3, S4, S5, R, E, A, R1, E1, B, R2, E2, C>(
  self: XPure<W, S1, S2, R, E, A>,
  failure: (e: E) => XPure<W1, S5, S3, R1, E1, B>,
  success: (a: A) => XPure<W2, S2, S4, R2, E2, C>
): XPure<W | W1 | W2, S1 & S5, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return new Fold<W, W1, W2, S1 & S5, S2, S3 | S4, R & R1 & R2, E, E1 | E2, A, B | C>(
    self,
    failure,
    success
  )
}

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 */
export function foldM<W2, W3, S5, S2, E, A, S3, R1, E1, B, S4, R2, E2, C>(
  failure: (e: E) => XPure<W2, S5, S3, R1, E1, B>,
  success: (a: A) => XPure<W3, S2, S4, R2, E2, C>
) {
  return <W1, S1, R>(self: XPure<W1, S1, S2, R, E, A>) => foldM_(self, failure, success)
}

/**
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or righr function passed to `fold`.
 */
export function fold<E, A, B, C>(failure: (e: E) => B, success: (a: A) => C) {
  return <W, S1, S2, R>(self: XPure<W, S1, S2, R, E, A>) =>
    fold_(self, failure, success)
}

/**
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or righr function passed to `fold`.
 */
export function fold_<W, S1, S2, R, E, A, B, C>(
  self: XPure<W, S1, S2, R, E, A>,
  failure: (e: E) => B,
  success: (a: A) => C
): XPure<W, S1 & S2, S1 | S2, R, never, B | C> {
  return foldM_(
    self,
    (e) => succeed(failure(e)),
    (a) => succeed(success(a))
  )
}

/**
 * Recovers from all errors.
 */
export function catchAll<W, S1, E, S3, R1, E1, B>(
  failure: (e: E) => XPure<W, S1, S3, R1, E1, B>
) {
  return <W1, S2, R, A>(self: XPure<W1, S1, S2, R, E, A>) => catchAll_(self, failure)
}

/**
 * Recovers from all errors.
 */
export function catchAll_<W, W1, S1, S2, R, E, A, S3, R1, E1, B>(
  self: XPure<W, S1, S2, R, E, A>,
  failure: (e: E) => XPure<W1, S1, S3, R1, E1, B>
) {
  return foldM_(self, failure, (a) => succeed(a))
}

/**
 * Returns a computation whose error and success channels have been mapped
 * by the specified functions, `f` and `g`.
 */
export function bimap<E, A, E1, A1>(f: (e: E) => E1, g: (a: A) => A1) {
  return <W, S1, S2, R>(self: XPure<W, S1, S2, R, E, A>) => bimap_(self, f, g)
}

/**
 * Returns a computation whose error and success channels have been mapped
 * by the specified functions, `f` and `g`.
 */
export function bimap_<W, S1, S2, R, E, A, E1, A1>(
  self: XPure<W, S1, S2, R, E, A>,
  f: (e: E) => E1,
  g: (a: A) => A1
) {
  return foldM_(
    self,
    (e) => fail(f(e)),
    (a) => succeed(g(a))
  )
}

/**
 * Transforms the error type of this computation with the specified
 * function.
 */
export function mapError<E, E1>(f: (e: E) => E1) {
  return <W, S1, S2, R, A>(self: XPure<W, S1, S2, R, E, A>) => mapError_(self, f)
}

/**
 * Transforms the error type of this computation with the specified
 * function.
 */
export function mapError_<W, S1, S2, R, E, A, E1>(
  self: XPure<W, S1, S2, R, E, A>,
  f: (e: E) => E1
) {
  return catchAll_(self, (e) => fail(f(e)))
}

/**
 * Constructs a computation from the specified modify function.
 */
export function modify<S1, S2, A>(
  f: (s: S1) => Tp.Tuple<[S2, A]>
): XPure<never, S1, S2, unknown, never, A> {
  return new Modify(f)
}

/**
 * Constructs a computation from the specified modify function.
 */
export function set<S>(s: S) {
  return modify(() => Tp.tuple<[S, void]>(s, undefined))
}

/**
 * Constructs a computation from the specified update function.
 */
export function update<W, S1, S2>(
  f: (s: S1) => S2
): XPure<W, S1, S2, unknown, never, void> {
  return modify((s) => Tp.tuple(f(s), undefined))
}

/**
 * Constructs a computation that always returns the `Unit` value, passing the
 * state through unchanged.
 */
export const unit = succeed(undefined as void)

/**
 * Transforms the initial state of this computation` with the specified
 * function.
 */
export function contramapInput<S0, S1>(f: (s: S0) => S1) {
  return <W, S2, R, E, A>(self: XPure<W, S1, S2, R, E, A>) =>
    chain_(update(f), () => self)
}

/**
 * Transforms the initial state of this computation` with the specified
 * function.
 */
export function provideSome<R0, R1>(f: (s: R0) => R1) {
  return <W, S1, S2, E, A>(self: XPure<W, S1, S2, R1, E, A>) =>
    accessM((r: R0) => provideAll(f(r))(self))
}

/**
 * Provides this computation with its required environment.
 */
export function provideAll<R>(r: R) {
  return <W, S1, S2, E, A>(
    self: XPure<W, S1, S2, R, E, A>
  ): XPure<W, S1, S2, unknown, E, A> => new Provide(r, self)
}

/**
 * Provides this computation with its required environment.
 */
export function provideAll_<W, S1, S2, R, E, A>(
  self: XPure<W, S1, S2, R, E, A>,
  r: R
): XPure<W, S1, S2, unknown, E, A> {
  return new Provide(r, self)
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0` and combining it automatically using spread.
 */
export function provide<R>(r: R) {
  return <W, SI, SO, E, A, R0>(
    next: XPure<W, SI, SO, R & R0, E, A>
  ): XPure<W, SI, SO, R0, E, A> => provideSome((r0: R0) => ({ ...r0, ...r }))(next)
}

/**
 * Get the state monadically
 */
export function getM<W, R, S1, S2, R1, E, A>(
  f: (_: S1) => XPure<W, S1, S2, R1, E, A>
): XPure<W, S1, S2, R1 & R, E, A> {
  return new Get<W, S1, S2, R1 & R, E, A>(f)
}

/**
 * Get the state with the function f
 */
export function get<A, S>(f: (_: S) => A): XPure<never, S, S, unknown, never, A> {
  return getM((s: S) => succeed(f(s)))
}

/**
 * Access the environment monadically
 */
export function accessM<W, R, S1, S2, R1, E, A>(
  f: (_: R) => XPure<W, S1, S2, R1, E, A>
): XPure<W, S1, S2, R1 & R, E, A> {
  return new Access<W, S1, S2, R1 & R, E, A>(f)
}

/**
 * Access the environment with the function f
 */
export function access<R, A, S>(f: (_: R) => A): XPure<never, S, S, R, never, A> {
  return accessM((r: R) => succeed(f(r)))
}

/**
 * Access the environment
 */
export function environment<R>(): XPure<never, unknown, unknown, R, never, R> {
  return accessM((r: R) => succeed(r))
}

/**
 * Returns a computation whose failure and success have been lifted into an
 * `Either`. The resulting computation cannot fail, because the failure case
 * has been exposed as part of the `Either` success case.
 */
export function either<W, S1, S2, R, E, A>(
  self: XPure<W, S1, S2, R, E, A>
): XPure<W, S1 & S2, S1 | S2, R, never, E.Either<E, A>> {
  return fold_(self, E.left, E.right)
}

/**
 * Executes this computation and returns its value, if it succeeds, but
 * otherwise executes the specified computation.
 */
export function orElseEither<W, S3, S4, R2, E2, A2>(
  that: () => XPure<W, S3, S4, R2, E2, A2>
) {
  return <W1, S1, S2, R, E, A>(
    self: XPure<W1, S1, S2, R, E, A>
  ): XPure<W | W1, S3 & S1, S4 | S2, R & R2, E2, E.Either<A, A2>> =>
    orElseEither_(self, that)
}

/**
 * Executes this computation and returns its value, if it succeeds, but
 * otherwise executes the specified computation.
 */
export function orElseEither_<W, W1, S1, S2, R, E, A, S3, S4, R2, E2, A2>(
  self: XPure<W, S1, S2, R, E, A>,
  that: () => XPure<W1, S3, S4, R2, E2, A2>
): XPure<W | W1, S3 & S1, S4 | S2, R & R2, E2, E.Either<A, A2>> {
  return foldM_(
    self,
    () => map_(that(), (a) => E.right(a)),
    (a) => succeed(E.left(a))
  )
}

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both using the specified function.
 */
export function zipWith<W, S2, S3, R1, E1, A, B, C>(
  that: XPure<W, S2, S3, R1, E1, B>,
  f: (a: A, b: B) => C
) {
  return <W1, S1, R, E>(
    self: XPure<W1, S1, S2, R, E, A>
  ): XPure<W | W1, S1, S3, R & R1, E1 | E, C> => zipWith_(self, that, f)
}

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both using the specified function.
 */
export function zipWith_<W, W1, S1, S2, R, E, A, S3, R1, E1, B, C>(
  self: XPure<W, S1, S2, R, E, A>,
  that: XPure<W1, S2, S3, R1, E1, B>,
  f: (a: A, b: B) => C
) {
  return chain_(self, (a) => map_(that, (b) => f(a, b)))
}

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both into a tuple.
 */
export function zip<W, S2, S3, R1, E1, B>(that: XPure<W, S2, S3, R1, E1, B>) {
  return <W1, S1, R, E, A>(self: XPure<W1, S1, S2, R, E, A>) => zip_(self, that)
}

/**
 * Combines this computation with the specified computation, passing the
 * updated state from this computation to that computation and combining the
 * results of both into a tuple.
 */
export function zip_<W, W1, S1, S2, R, E, A, S3, R1, E1, B>(
  self: XPure<W, S1, S2, R, E, A>,
  that: XPure<W1, S2, S3, R1, E1, B>
) {
  return zipWith_(self, that, Tp.tuple)
}

/**
 * Suspend a computation, useful in recursion
 */
export function suspend<W, S1, S2, R, E, A>(
  f: () => XPure<W, S1, S2, R, E, A>
): XPure<W, S1, S2, R, E, A> {
  return new Suspend(f)
}

/**
 * Lift a sync (non failable) computation
 */
export function succeedWith<W, A>(f: () => A) {
  return suspend(() => succeed<W, A>(f()))
}

/**
 * Lift a sync (non failable) computation
 */
export function tryCatch<E>(onThrow: (u: unknown) => E) {
  return <A>(f: () => A) =>
    suspend(() => {
      try {
        return succeed(f())
      } catch (u) {
        return fail(onThrow(u))
      }
    })
}

class FoldFrame {
  readonly _xptag = "FoldFrame"
  constructor(
    readonly failure: (e: any) => XPure<any, any, any, any, any, any>,
    readonly apply: (e: any) => XPure<any, any, any, any, any, any>
  ) {}
}

class ApplyFrame {
  readonly _xptag = "ApplyFrame"
  constructor(readonly apply: (e: any) => XPure<any, any, any, any, any, any>) {}
}

type Frame = FoldFrame | ApplyFrame

class Runtime {
  stack: Stack<Frame> | undefined = undefined

  pop() {
    const nextInstr = this.stack
    if (nextInstr) {
      this.stack = this.stack?.previous
    }
    return nextInstr?.value
  }

  push(cont: Frame) {
    this.stack = new Stack(cont, this.stack)
  }

  findNextErrorHandler() {
    let unwinding = true
    while (unwinding) {
      const nextInstr = this.pop()

      if (nextInstr == null) {
        unwinding = false
      } else {
        if (nextInstr._xptag === "FoldFrame") {
          unwinding = false
          this.push(new ApplyFrame(nextInstr.failure))
        }
      }
    }
  }

  runAll<W, S1, S2, E, A>(
    self: XPure<W, S1, S2, unknown, E, A>,
    s: S1
  ): Tp.Tuple<[Chunk.Chunk<W>, E.Either<E, Tp.Tuple<[S2, A]>>]> {
    let s0 = s as any
    let a: any = undefined
    let environments: Stack<any> | undefined = undefined
    let failed = false
    let curXPure = self as XPure<any, any, any, any, any, any> | undefined
    let logs = Chunk.empty<W>()

    while (curXPure != null) {
      concrete(curXPure)
      const xp = curXPure

      switch (xp._xptag) {
        case "FlatMap": {
          concrete(xp.value)
          const nested = xp.value
          const continuation = xp.cont

          switch (nested._xptag) {
            case "Succeed": {
              curXPure = continuation(nested.a)
              break
            }
            case "Modify": {
              const updated = nested.run(s0)

              s0 = updated.get(0)
              a = updated.get(1)

              curXPure = continuation(a)
              break
            }
            default: {
              curXPure = nested
              this.push(new ApplyFrame(continuation))
            }
          }

          break
        }
        case "Log": {
          logs = Chunk.append_(logs, xp.w)
          a = undefined
          const nextInstr = this.pop()
          curXPure = nextInstr?.apply(a)
          break
        }
        case "Suspend": {
          curXPure = xp.f()
          break
        }
        case "Succeed": {
          a = xp.a
          const nextInstr = this.pop()
          if (nextInstr) {
            curXPure = nextInstr.apply(a)
          } else {
            curXPure = undefined
          }
          break
        }
        case "Fail": {
          this.findNextErrorHandler()
          const nextInst = this.pop()
          if (nextInst) {
            curXPure = nextInst.apply(xp.e)
          } else {
            failed = true
            a = xp.e
            curXPure = undefined
          }
          break
        }
        case "Fold": {
          const state = s0
          this.push(
            new FoldFrame((c) => chain_(set(state), () => xp.failure(c)), xp.success)
          )
          curXPure = xp.value
          break
        }
        case "Access": {
          curXPure = xp.access(environments?.value || {})
          break
        }
        case "Get": {
          curXPure = xp.get(s0)
          break
        }
        case "Provide": {
          environments = new Stack(xp.r, environments)
          curXPure = foldM_(
            xp.cont,
            (e) =>
              chain_(
                succeedWith(() => {
                  environments = environments?.previous
                }),
                () => fail(e)
              ),
            (a) =>
              chain_(
                succeedWith(() => {
                  environments = environments?.previous
                }),
                () => succeed(a)
              )
          )
          break
        }
        case "Modify": {
          const updated = xp.run(s0)
          s0 = updated.get(0)
          a = updated.get(1)
          const nextInst = this.pop()
          if (nextInst) {
            curXPure = nextInst.apply(a)
          } else {
            curXPure = undefined
          }
          break
        }
      }
    }

    if (failed) {
      return Tp.tuple(logs, E.left(a))
    }

    return Tp.tuple(logs, E.right(Tp.tuple(s0, a)))
  }
}

/**
 * Runs this computation with the specified initial state, returning both the
 * log and either all the failures that occurred or the updated state and the
 * result.
 */
export function runAll_<W, S1, S2, E, A>(
  self: XPure<W, S1, S2, unknown, E, A>,
  s: S1
): Tp.Tuple<[Chunk.Chunk<W>, E.Either<E, Tp.Tuple<[S2, A]>>]> {
  return new Runtime().runAll(self, s)
}

/**
 * Runs this computation with the specified initial state, returning either a
 * failure or the updated state and the result
 */
export function runAll<S1>(
  s: S1
): <W, S2, E, A>(
  self: XPure<W, S1, S2, unknown, E, A>
) => Tp.Tuple<[Chunk.Chunk<W>, E.Either<E, Tp.Tuple<[S2, A]>>]> {
  return (self) => runAll_(self, s)
}

/**
 * Runs this computation to produce its result.
 */
export function run<W, S2, A>(self: XPure<W, unknown, S2, unknown, never, A>): A {
  return runState_(self, undefined).get(1)
}

/**
 * Runs this computation with the specified initial state, returning both
 * the updated state and the result.
 */
export function runState_<W, S1, S2, A>(
  self: XPure<W, S1, S2, unknown, never, A>,
  s: S1
): Tp.Tuple<[S2, A]> {
  const result = new Runtime().runAll(self, s).get(1)
  if (result._tag === "Left") {
    throw result.left
  }
  return result.right
}

/**
 * Runs this computation with the specified initial state, returning both
 * the updated state and the result.
 *
 * @ets_data_first runState_
 */
export function runState<S1>(
  s: S1
): <W, S2, A>(self: XPure<W, S1, S2, unknown, never, A>) => Tp.Tuple<[S2, A]> {
  return (self) => runState_(self, s)
}

/**
 * Runs this computation to produce its result or the first failure to
 * occur.
 */
export function runEither<W, S2, E, A>(
  self: XPure<W, unknown, S2, unknown, E, A>
): E.Either<E, A> {
  return E.map_(new Runtime().runAll(self, undefined).get(1), (x) => x.get(1))
}

/**
 * Runs this computation to produce its result and the log.
 */
export function runLog<W, S2, E, A>(
  self: XPure<W, unknown, S2, unknown, E, A>
): Tp.Tuple<[Chunk.Chunk<W>, A]> {
  const result = new Runtime().runAll(self, undefined)
  const e = result.get(1)
  if (e._tag === "Left") {
    throw e.left
  }
  return Tp.tuple(result.get(0), e.right.get(1))
}

/**
 * Runs this computation with the specified initial state, returning the
 * result and discarding the updated state.
 */
export function runResult_<W, S1, S2, A>(
  self: XPure<W, S1, S2, unknown, never, A>,
  s: S1
): A {
  return runState_(self, s)[1]
}

/**
 * Runs this computation with the specified initial state, returning the
 * result and discarding the updated state.
 */
export function runResult<S1>(
  s: S1
): <W, S2, A>(self: XPure<W, S1, S2, unknown, never, A>) => A {
  return (self) => runResult_(self, s)
}
