/*
  based on: https://github.com/rzeigler/waveguide/blob/master/src/wave.ts
 */
import {
  array as Ar,
  bifunctor as Bif,
  functor as Fun,
  either as Ei,
  function as F,
  monoid as Mon,
  option as Op,
  pipeable as P,
  semigroup as Sem,
  taskEither as TE,
  task as TA
} from "fp-ts";
import * as ex from "./original/exit";
import { Runtime } from "./original/runtime";
import { fst, snd, tuple2 } from "./original/support/util";
import { Deferred, makeDeferred } from "./deferred";
import { Driver, DriverImpl } from "./driver";
import { Alt3EC, Monad3E, Monad3EC, MonadThrow3E, MonadThrow3EC, Alt3E } from "./overload";
import { makeRef, Ref } from "./ref";
import * as S from "./semaphore";
import { mergeDeep } from "./utils/merge";
import { DriverSyncImpl } from "./driverSync";
import { pipe } from "fp-ts/lib/pipeable";

export enum EffectTag {
  Pure,
  PureOption,
  PureEither,
  Raised,
  Completed,
  Suspended,
  Async,
  Chain,
  Collapse,
  InterruptibleRegion,
  AccessInterruptible,
  AccessRuntime,
  AccessEnv,
  ProvideEnv,
  Map
}

export type NoEnv = unknown;
export type NoErr = never;

export const noEnv: {} = {};

/**
 * A description of an effect to perform
 */
export interface Effect<R, E, A> {
  _tag: EffectTag;

  _TAG: () => "Effect";
  _E: () => E;
  _A: () => A;
  _R: (_: R) => void;

  fluent: <K extends R>() => EffectIO<K, E, A>;
}

export type IO<E, A> = Effect<NoEnv, E, A>;

export type UIO<A> = Effect<NoEnv, NoErr, A>;

export type RUIO<R, A> = Effect<R, NoErr, A>;

export type Strip<R, R2 extends Partial<R>> = {
  [k in Exclude<keyof R, keyof R2>]: R[k];
};

export type OrVoid<R> = R extends {} & infer A ? (unknown extends A ? void : A) : void;

export class EffectIO<R, E, A> implements Effect<R, E, A> {
  static fromEffect<R, E, A>(eff: Effect<R, E, A>): EffectIO<R, E, A> {
    return eff as any;
  }

  constructor(
    readonly _tag: EffectTag,
    readonly f0: any = undefined,
    readonly f1: any = undefined,
    readonly f2: any = undefined
  ) {}

  done(): Effect<R, E, A> {
    return this as any;
  }

  // @ts-ignore
  private effect(): Effect<R, E, A> {
    return this as any;
  }

  fluent<K extends R>(): EffectIO<K, E, A> {
    return this as any;
  }

  /* istanbul ignore next */
  _TAG(): "Effect" {
    return undefined as any;
  }

  /* istanbul ignore next */
  _A(): A {
    return undefined as any;
  }

  /* istanbul ignore next */
  _E(): E {
    return undefined as any;
  }

  /* istanbul ignore next */
  _R(_: R): void {
    return undefined as any;
  }

  chain<R2, E2, A2>(f: (s: A) => Effect<R2, E2, A2>): EffectIO<R & R2, E | E2, A2> {
    return this._tag === EffectTag.Pure
      ? (f(this.f0) as any)
      : new EffectIO(EffectTag.Chain as const, this, f);
  }

  chainEither<E2, A2>(f: (s: A) => Ei.Either<E2, A2>): EffectIO<R, E | E2, A2> {
    return this.chain((s: A) => encaseEither(f(s)));
  }

  chainTaskEither<E2, A2>(f: (s: A) => TE.TaskEither<E2, A2>): EffectIO<R, E | E2, A2> {
    return this.chain((s: A) => encaseTaskEither(f(s)));
  }

  chainTask<A2>(f: (s: A) => TA.Task<A2>): EffectIO<R, E, A2> {
    return this.chain((s: A) => encaseTask(f(s)));
  }

  chainOption<E2>(
    onEmpty: F.Lazy<E2>
  ): <A2>(f: (s: A) => Op.Option<A2>) => EffectIO<R, E | E2, A2> {
    return (f) => this.chain((s: A) => encaseOption(f(s), onEmpty));
  }

  chainW<R3, E3, A3>(
    w: Effect<R3, E3, A3>
  ): <R2, E2, A2>(
    f: (wa: A3, s: A) => Effect<R2, E2, A2>
  ) => EffectIO<R & R2 & R3, E | E2 | E3, A2> {
    return <R2, E2, A2>(
      f: (wa: A3, s: A) => Effect<R2, E2, A2>
    ): EffectIO<R & R2 & R3, E | E2 | E3, A2> =>
      new EffectIO(EffectTag.Chain as const, w, (wa: any) => this.chain((s) => f(wa, s)));
  }

  chainEnv<R2, E2, A2>(f: (s: A, r: R) => Effect<R2, E2, A2>): EffectIO<R & R2, E | E2, A2> {
    return this.chain(
      (x) =>
        new EffectIO(
          EffectTag.Chain as const,
          new EffectIO(EffectTag.AccessEnv),
          (r: any) => f(x, r) as any
        )
    );
  }

  chainAccess<R3, R2, E2, A2>(
    f: (s: A, r: R3) => Effect<R2, E2, A2>
  ): EffectIO<R & R3 & R2, E | E2, A2> {
    return this.chain(
      (x) =>
        new EffectIO(
          EffectTag.Chain as const,
          new EffectIO(EffectTag.AccessEnv),
          (r: any) => f(x, r) as any
        )
    );
  }

  chainError<R2, E2, A2>(f: (r: E) => Effect<R2, E2, A2>): EffectIO<R & R2, E2, A | A2> {
    return this.foldExit(
      (cause) => (cause._tag === "Raise" ? f(cause.error) : completed(cause)),
      pure
    );
  }

  tap<R2, E2, A2>(f: (s: A) => Effect<R2, E2, A2>): EffectIO<R & R2, E | E2, A> {
    return this.chain((x) => new EffectIO(EffectTag.Map as const, f(x), () => x));
  }

  provideS<R2 extends Partial<R>>(r: R2): EffectIO<Strip<R, R2>, E, A> {
    return provideR((k: any) => ({ ...k, ...r }))(this as any) as any;
  }

  provide(r: R): EffectIO<unknown, E, A> {
    return provideAll(r)(this as any) as any;
  }

  foldExit<R2, E2, A2, A3, R3, E3>(
    failure: F.FunctionN<[ex.Cause<E>], Effect<R2, E2, A2>>,
    success: F.FunctionN<[A], Effect<R3, E3, A3>>
  ): EffectIO<R & R2 & R3, E2 | E3, A2 | A3> {
    return new EffectIO(EffectTag.Collapse as const, this, failure, success);
  }

  result(): EffectIO<R, NoErr, ex.Exit<E, A>> {
    return this.foldExit(
      (c) => pure(c) as Effect<R, NoErr, ex.Exit<E, A>>,
      (d) => pure(ex.done(d))
    );
  }

  as<B>(b: B): EffectIO<R, E, B> {
    return new EffectIO(EffectTag.Map as const, this, () => b);
  }

  asM<R2, E2, B>(b: Effect<R2, E2, B>): EffectIO<R & R2, E | E2, B> {
    return this.chain(() => b);
  }

  map<B>(f: (a: A) => B): EffectIO<R, E, B> {
    return this._tag === EffectTag.Pure
      ? new EffectIO(EffectTag.Pure, f(this.f0))
      : new EffectIO(EffectTag.Map as const, this, f);
  }

  bimap<E2, B>(leftMap: F.FunctionN<[E], E2>, rightMap: F.FunctionN<[A], B>): EffectIO<R, E2, B> {
    return this.foldExit(
      (cause) => (cause._tag === "Raise" ? raiseError(leftMap(cause.error)) : completed(cause)),
      F.flow(rightMap, pure)
    );
  }

  mapError<E2>(f: F.FunctionN<[E], E2>): EffectIO<R, E2, A> {
    return this.bimap(f, F.identity);
  }

  asUnit(): EffectIO<R, E, void> {
    return this.as(undefined as any);
  }

  runToPromiseExit(r: OrVoid<R>): Promise<ex.Exit<E, A>> {
    return runToPromiseExit(
      (r
        ? provideAll(r as any)((this as any) as Effect<R, E, A>)
        : ((this as any) as Effect<R, E, A>)) as any
    );
  }

  runToPromise(r: OrVoid<R>): Promise<A> {
    return runToPromise(
      (r
        ? provideAll(r as any)((this as any) as Effect<R, E, A>)
        : ((this as any) as Effect<R, E, A>)) as any
    );
  }

  run(cb: (ex: ex.Exit<E, A>) => void, r: OrVoid<R>): F.Lazy<void> {
    return run(
      (r
        ? provideAll(r as any)((this as any) as Effect<R, E, A>)
        : ((this as any) as Effect<R, E, A>)) as any,
      cb
    );
  }

  fork(): EffectIO<R, never, Fiber<E, A>> {
    return fork((this as any) as Effect<R, E, A>) as any;
  }

  flow<R2, E2, A2>(f: (e: Effect<R, E, A>) => Effect<R2, E2, A2>): EffectIO<R2, E2, A2> {
    return f((this as any) as Effect<R, E, A>) as any;
  }
}

export function fluent<R, E, A>(eff: Effect<R, E, A>): EffectIO<R, E, A> {
  return eff as any;
}

export type Instructions =
  | Pure
  | PureOption
  | PureEither
  | Raised
  | Completed
  | Suspended
  | Async
  | Chain
  | Collapse
  | InterruptibleRegion
  | AccessInterruptible
  | AccessRuntime
  | AccessEnv
  | ProvideEnv
  | Map;

export interface Pure<A = unknown> {
  readonly _tag: EffectTag.Pure;
  readonly f0: A;
}

export interface PureOption<A = unknown, E = never> {
  readonly _tag: EffectTag.PureOption;
  readonly f0: Op.Option<A>;
  readonly f1: F.Lazy<E>;
}

export interface PureEither<A = unknown, E = never> {
  readonly _tag: EffectTag.PureEither;
  readonly f0: Ei.Either<E, A>;
}

export interface Raised<E = unknown> {
  readonly _tag: EffectTag.Raised;
  readonly f0: ex.Cause<E>;
}

export interface Completed<E = unknown, A = unknown> {
  readonly _tag: EffectTag.Completed;
  readonly f0: ex.Exit<E, A>;
}

export interface Suspended {
  readonly _tag: EffectTag.Suspended;
  readonly f0: F.Lazy<Instructions>;
}

export type AsyncContFn<E, A> = F.FunctionN<[Ei.Either<E, A>], void>;
export type AsyncCancelContFn = F.FunctionN<[(error?: Error) => void], void>;
export type AsyncFn<E, A> = F.FunctionN<[AsyncContFn<E, A>], AsyncCancelContFn>;

export interface Async<E = unknown, A = unknown> {
  readonly _tag: EffectTag.Async;
  readonly f0: AsyncFn<E, A>;
}

export interface Chain<Z = unknown> {
  readonly _tag: EffectTag.Chain;
  readonly f0: Instructions;
  readonly f1: F.FunctionN<[Z], Instructions>;
}

export interface Map<A = unknown, B = unknown> {
  readonly _tag: EffectTag.Map;
  readonly f0: Instructions;
  readonly f1: F.FunctionN<[A], B>;
}

export interface Collapse<E1 = unknown, A1 = unknown> {
  readonly _tag: EffectTag.Collapse;
  readonly f0: Instructions;
  readonly f1: F.FunctionN<[ex.Cause<E1>], Instructions>;
  readonly f2: F.FunctionN<[A1], Instructions>;
}

export interface InterruptibleRegion {
  readonly _tag: EffectTag.InterruptibleRegion;
  readonly f0: boolean;
  readonly f1: Instructions;
}

export interface AccessInterruptible<A = unknown> {
  readonly _tag: EffectTag.AccessInterruptible;
  readonly f0: F.FunctionN<[boolean], A>;
}

export interface AccessRuntime<A = unknown> {
  readonly _tag: EffectTag.AccessRuntime;
  readonly f0: F.FunctionN<[Runtime], A>;
}

export interface ProvideEnv<R = unknown> {
  readonly _tag: EffectTag.ProvideEnv;
  readonly f0: Instructions;
  readonly f1: R;
}

export interface AccessEnv<R = unknown> {
  readonly _tag: EffectTag.AccessEnv;
  readonly f0: R;
}

/**
 * An IO has succeeded
 * @param a the value
 */
export function pure<A>(a: A): Effect<NoEnv, NoErr, A> {
  return new EffectIO(EffectTag.Pure as const, a);
}

/**
 * An IO that is failed
 *
 * Prefer raiseError or raiseAbort
 * @param e
 */
export function raised<E, A = never>(e: ex.Cause<E>): Effect<NoEnv, E, A> {
  return new EffectIO(EffectTag.Raised as const, e);
}

/**
 * An IO that is failed with a checked error
 * @param e
 */
export function raiseError<E, A = never>(e: E): Effect<NoEnv, E, A> {
  return raised(ex.raise(e));
}

/**
 * An IO that is failed with an unchecked error
 * @param u
 */
export function raiseAbort(u: unknown): Effect<NoEnv, NoErr, never> {
  return raised(ex.abort(u));
}

/**
 * An IO that is already interrupted
 */
export const raiseInterrupt: Effect<NoEnv, NoErr, never> = raised(ex.interrupt);

/**
 * An IO that is completed with the given exit
 * @param exit
 */
export function completed<E, A>(exit: ex.Exit<E, A>): Effect<NoEnv, E, A> {
  return new EffectIO(EffectTag.Completed as const, exit);
}

/**
 * Wrap a block of impure code that returns an IO into an IO
 *
 * When evaluated this IO will run the given thunk to produce the next IO to execute.
 * @param thunk
 */
export function suspended<R, E, A>(thunk: F.Lazy<Effect<R, E, A>>): Effect<R, E, A> {
  return new EffectIO(EffectTag.Suspended as const, thunk);
}

/**
 * Wrap a block of impure code in an IO
 *
 * When evaluated the this will produce a value or throw
 * @param thunk
 */
export function sync<E = NoErr, A = unknown>(thunk: F.Lazy<A>): Effect<NoEnv, E, A> {
  return suspended(() => pure(thunk()));
}

export function trySync<E = unknown, A = unknown>(thunk: F.Lazy<A>): Effect<NoEnv, E, A> {
  return suspended(() => {
    try {
      return pure(thunk());
    } catch (e) {
      return raiseError(e);
    }
  });
}

export function trySyncMap<E = unknown>(
  onError: (e: unknown) => E
): <A = unknown>(thunk: F.Lazy<A>) => Effect<NoEnv, E, A> {
  return (thunk) =>
    suspended(() => {
      try {
        return pure(thunk());
      } catch (e) {
        return raiseError(onError(e));
      }
    });
}

/**
 * Wrap an impure callback in an IO
 *
 * The provided function must accept a callback to report results to and return a cancellation action.
 * If your action is uncancellable for some reason, you should return an empty thunk and wrap the created IO
 * in uninterruptible
 * @param op
 */
export function async<E, A>(op: AsyncFn<E, A>): Effect<NoEnv, E, A> {
  return new EffectIO(EffectTag.Async as const, op);
}

/**
 * Wrap an impure callback in IO
 *
 * This is a variant of async where the effect cannot fail with a checked exception.
 * @param op
 */
export function asyncTotal<A>(
  op: F.FunctionN<[F.FunctionN<[A], void>], AsyncCancelContFn>
): Effect<NoEnv, NoErr, A> {
  return async((callback) => op((a) => callback(Ei.right(a))));
}

/**
 * Demarcate a region of interruptible state
 * @param inner
 * @param flag
 */
export function interruptibleRegion<R, E, A>(
  inner: Effect<R, E, A>,
  flag: boolean
): Effect<R, E, A> {
  return new EffectIO(EffectTag.InterruptibleRegion as const, flag, inner);
}

/**
 * Produce an new IO that will use the value produced by inner to produce the next IO to evaluate
 * @param inner
 * @param bind
 */
function chain_<R, E, A, R2, E2, B>(
  inner: Effect<R, E, A>,
  bind: F.FunctionN<[A], Effect<R2, E2, B>>
): Effect<R & R2, E | E2, B> {
  return inner._tag === EffectTag.Pure
    ? bind((inner as any).f0)
    : new EffectIO(EffectTag.Chain as const, inner, bind);
}

export function chainOption<E>(
  onEmpty: F.Lazy<E>
): <A, B>(
  bind: F.FunctionN<[A], Op.Option<B>>
) => <R, E2>(eff: Effect<R, E2, A>) => Effect<R, E | E2, B> {
  return (bind) => (inner) => chain_(inner, (a) => encaseOption(bind(a), onEmpty));
}

export function chainEither<A, E, B>(
  bind: F.FunctionN<[A], Ei.Either<E, B>>
): <R, E2>(eff: Effect<R, E2, A>) => Effect<R, E | E2, B> {
  return (inner) => chain_(inner, (a) => encaseEither(bind(a)));
}

export function chainTask<A, B>(
  bind: F.FunctionN<[A], TA.Task<B>>
): <R, E2>(eff: Effect<R, E2, A>) => Effect<R, E2, B> {
  return (inner) => chain_(inner, (a) => encaseTask(bind(a)));
}

export function chainTaskEither<A, E, B>(
  bind: F.FunctionN<[A], TE.TaskEither<E, B>>
): <R, E2>(eff: Effect<R, E2, A>) => Effect<R, E | E2, B> {
  return (inner) => chain_(inner, (a) => encaseTaskEither(bind(a)));
}

/**
 * Lift an Either into an IO
 * @param e
 */
export function encaseEither<E, A>(e: Ei.Either<E, A>): Effect<NoEnv, E, A> {
  return new EffectIO(EffectTag.PureEither, e);
}

/**
 * Lift an Option into an IO
 * @param o
 * @param onError
 */
export function encaseOption<E, A>(o: Op.Option<A>, onError: F.Lazy<E>): Effect<NoEnv, E, A> {
  return new EffectIO(EffectTag.PureOption, o, onError);
}

/**
 * Curried form of foldExit
 * @param failure
 * @param success
 */
export function foldExit<E1, RF, E2, A1, E3, A2, RS>(
  failure: F.FunctionN<[ex.Cause<E1>], Effect<RF, E2, A2>>,
  success: F.FunctionN<[A1], Effect<RS, E3, A2>>
): <R>(io: Effect<R, E1, A1>) => Effect<RF & RS & R, E2 | E3, A2> {
  return (io) => foldExit_(io, failure, success);
}

/**
 * Get the interruptible state of the current fiber
 */
export const accessInterruptible: Effect<NoEnv, NoErr, boolean> = new EffectIO(
  EffectTag.AccessInterruptible as const,
  F.identity
);

/**
 * Get the runtime of the current fiber
 */
export const accessRuntime: Effect<NoEnv, NoErr, Runtime> = new EffectIO(
  EffectTag.AccessRuntime as const,
  F.identity
);

/**
 * Access the runtime then provide it to the provided function
 * @param f
 */
export function withRuntime<E, A>(
  f: F.FunctionN<[Runtime], Effect<NoEnv, E, A>>
): Effect<NoEnv, E, A> {
  return chain_(accessRuntime as Effect<NoEnv, E, Runtime>, f);
}

export function accessEnvironment<R>(): Effect<R, NoErr, R> {
  return new EffectIO(EffectTag.AccessEnv);
}

export function accessM<R, R2, E, A>(f: F.FunctionN<[R], Effect<R2, E, A>>): Effect<R & R2, E, A> {
  return chain_(accessEnvironment<R>(), f);
}

export function access<R, A, E = NoErr>(f: F.FunctionN<[R], A>): Effect<R, E, A> {
  return map_(accessEnvironment<R>(), f);
}

export function mergeEnv<A>(a: A): <B>(b: B) => A & B {
  return (b) => mergeDeep(a, b);
}

/**
 * Provides partial environment, to be used only in top-level
 * for deeper level is better to use provideR or provideAll
 */

export const provide = <R>(r: R) => <R2, E, A>(ma: Effect<R2 & R, E, A>): Effect<R2, E, A> =>
  accessM((r2: R2) => provideAll(mergeEnv(r2)(r))(ma));

export const provideStruct = <R>(r: R) => <
  T,
  R2 = T extends Effect<infer R3, infer __, infer ___> ? Omit<R3, keyof R> : never,
  E = T extends Effect<R2 & R, infer EE, infer ____> ? EE : never,
  A = T extends Effect<R2 & R, E, infer AE> ? AE : never
>(
  eff: T extends Effect<R2 & R, E, A> ? T : never
): Effect<R2, E, A> => accessM((r2: R2) => provideAll(mergeEnv(r2)(r))(eff));

/**
 * Provides partial environment, via direct transformation
 * safe to use in non top-level scenarios
 */

export const provideR = <R2, R>(f: (r2: R2) => R) => <E, A>(
  ma: Effect<R, E, A>
): Effect<R2, E, A> => accessM((r2: R2) => provideAll(f(r2))(ma));

/**
 * Provides partial environment, like provide() but via direct transformation
 * safe to use in non top-level scenarios
 * Inference only works if R is bound to a non intersection type.
 * If you need to provide an intersection, (several Envs), then you may better do several unary injections OR explicitly specify the R type parameter.
 */
export function provideS<R>(r: R): Provider<unknown, R, never> {
  return <R2, E, A>(eff: Effect<R2 & R, E, A>): Effect<R2, E, A> =>
    provideR((r2: R2) => ({ ...r2, ...r }))(eff);
}

export function provideSO<R>(r: R): Provider<unknown, R, never> {
  return <R2, E, A>(eff: Effect<R2 & R, E, A>): Effect<R2, E, A> =>
    provideR((r2: R2) => ({ ...r, ...r2 }))(eff);
}

/**
 * Provides partial environment, like provide() but via direct transformation
 * safe to use in non top-level scenarios.
 *
 * Higher order. Interpret "M" in terms of "R" through "A".
 */
export const provideSW = <M>() => <R, E, A>(res: Effect<R, E, A>) => (
  f: (a: A) => M
): Provider<R, M, E> => <R2, E2, A2>(eff: Effect<R2 & M, E2, A2>): Effect<R2 & R, E | E2, A2> =>
  chain_(res, (a) => provideS<M>(f(a))(eff));

/**
 * Provides structural partial environment, like provideStruct() but via direct transformation
 * safe to use in non top-level scenarios
 */
export function provideStructS<R>(r: R) {
  return <
    T,
    R2 = T extends Effect<infer R3, infer __, infer ___> ? Omit<R3, keyof R> : never,
    E = T extends Effect<R2 & R, infer EE, infer ____> ? EE : never,
    A = T extends Effect<R2 & R, E, infer AE> ? AE : never
  >(
    eff: T extends Effect<R2 & R, E, A> ? T : never
  ): Effect<R2, E, A> => provideR((r2: R2) => ({ ...r2, ...r }))(eff);
}

/**
 * Provides partial environment, like provideSomeM() but via direct transformation
 * safe to use in non top-level scenarios
 */
export function provideSM<R, R3, E2>(rm: Effect<R3, E2, R>): Provider<R3, R, E2> {
  return <R2, E, A>(eff: Effect<R2 & R, E, A>): Effect<R2 & R3, E | E2, A> =>
    chain_(rm, (r) => provideR((r2: R2) => ({ ...r2, ...r }))(eff));
}

/**
 * Provides partial environment, like provideStructSomeM() but via direct transformation
 * safe to use in non top-level scenarios
 */

export function provideStructSM<R, R3, E2>(rm: Effect<R3, E2, R>) {
  return <
    T,
    R2 = T extends Effect<infer R3, infer __, infer ___> ? Omit<R3, keyof R> : never,
    E = T extends Effect<R2 & R, infer EE, infer ____> ? EE : never,
    A = T extends Effect<R2 & R, E, infer AE> ? AE : never
  >(
    eff: T extends Effect<R2 & R, E, A> ? T : never
  ): Effect<R2 & R3, E | E2, A> => chain_(rm, (r) => provideR((r2: R2) => ({ ...r2, ...r }))(eff));
}

/**
 * Provides all environment to the child
 */

export const provideAll = <R>(r: R) => <E, A>(ma: Effect<R, E, A>) =>
  new EffectIO(EffectTag.ProvideEnv as const, ma, r) as Effect<unknown, E, A>;

/**
 * Provides all environment necessary to the child effect via an effect
 *
 * Note that this ***should*** be typically used at ***startup time***, not dynamically
 */

export const provideM = <R2, R, E2>(f: Effect<R2, E2, R>): Provider<R2, R, E2> => (ma) =>
  chain_(f, (r) => provide(r)(ma));

/**
 * Provides some of the environment necessary to the child effect via an effect
 *
 * Note that this should be typically used at startup time, not dynamically
 */
export const provideSomeM = <R2, R, E2>(f: Effect<R2, E2, R>): Provider<R2, R, E2> => <E, A, R3>(
  ma: Effect<R & R3, E, A>
): Effect<R2 & R3, E | E2, A> => chain_(f, (r) => provide(r)(ma));

/**
 * Provides some structural environment necessary to the child effect via an effect
 *
 * Note that this should be typically used at startup time, not dynamically
 */
export const provideStructSomeM = <R2, R, E2>(f: Effect<R2, E2, R>) => <
  T,
  R3 = T extends Effect<infer R4, infer __, infer ___> ? Omit<R4, keyof R> : never,
  E = T extends Effect<R3 & R, infer EE, infer ____> ? EE : never,
  A = T extends Effect<R3 & R, E, infer AE> ? AE : never
>(
  ma: T extends Effect<R3 & R, E, A> ? T : never
): Effect<R3 & R2, E | E2, A> => chain_(f, (r) => provide(r)(ma));

/**
 * Map the value produced by an IO
 * @param io
 * @param f
 */
function map_<R, E, A, B>(base: Effect<R, E, A>, f: F.FunctionN<[A], B>): Effect<R, E, B> {
  return base._tag === EffectTag.Pure
    ? new EffectIO(EffectTag.Pure as const, f(((base as any) as Pure<any>).f0))
    : new EffectIO(EffectTag.Map as const, base, f);
}

/**
 * Lift a function on values to a function on IOs
 * @param f
 */
export function lift<A, B>(f: F.FunctionN<[A], B>): <R, E>(io: Effect<R, E, A>) => Effect<R, E, B> {
  return <R, E>(io: Effect<R, E, A>) => map_(io, f);
}

export function liftEither<A, E, B>(
  f: F.FunctionN<[A], Ei.Either<E, B>>
): F.FunctionN<[A], IO<E, B>> {
  return (a) => fromEither(f(a));
}

/**
 * Map the value produced by an IO to the constant b
 * @param io
 * @param b
 */
export function as<R, E, A, B>(io: Effect<R, E, A>, b: B): Effect<R, E, B> {
  return map_(io, F.constant(b));
}

/**
 * Curried form of as
 * @param b
 */
export function to<B>(b: B): <R, E, A>(io: Effect<R, E, A>) => Effect<R, E, B> {
  return (io) => as(io, b);
}

export function chainTap<R, E, A>(
  bind: F.FunctionN<[A], Effect<R, E, unknown>>
): <R2, E2>(inner: Effect<R2, E2, A>) => Effect<R & R2, E | E2, A> {
  return (inner) => chainTap_(inner, bind);
}

const chainTap_ = <R, E, A, R2, E2>(
  inner: Effect<R, E, A>,
  bind: F.FunctionN<[A], Effect<R2, E2, unknown>>
): Effect<R & R2, E | E2, A> => chain_(inner, (a) => as(bind(a), a));

/**
 * Map the value produced by an IO to void
 * @param io
 */
export function asUnit<R, E, A>(io: Effect<R, E, A>): Effect<R, E, void> {
  return as(io, undefined);
}

/**
 * An IO that succeeds immediately with void
 */
export const unit: Effect<NoEnv, NoErr, void> = pure(undefined);

export const fluentUnit = fluent(unit);

/**
 * Curriend form of chainError
 * @param f
 */
export function chainError<R, E1, E2, A>(
  f: F.FunctionN<[E1], Effect<R, E2, A>>
): <R2>(rio: Effect<R2, E1, A>) => Effect<R & R2, E2, A> {
  return (io) => chainError_(io, f);
}

/**
 * Map the error produced by an IO
 * @param f
 */
export function mapError<E1, E2>(
  f: F.FunctionN<[E1], E2>
): <R, A>(io: Effect<R, E1, A>) => Effect<R, E2, A> {
  return <R, A>(io: Effect<R, E1, A>) => mapLeft_(io, f);
}

function bimap_<R, E1, E2, A, B>(
  io: Effect<R, E1, A>,
  leftMap: F.FunctionN<[E1], E2>,
  rightMap: F.FunctionN<[A], B>
): Effect<R, E2, B> {
  return foldExit_(
    io,
    (cause) => (cause._tag === "Raise" ? raiseError(leftMap(cause.error)) : completed(cause)),
    F.flow(rightMap, pure)
  );
}

/**
 * Zip the result of two IOs together using the provided function
 * @param first
 * @param second
 * @param f
 */
export function zipWith<R, E, A, R2, E2, B, C>(
  first: Effect<R, E, A>,
  second: Effect<R2, E2, B>,
  f: F.FunctionN<[A, B], C>
): Effect<R & R2, E | E2, C> {
  return chain_(first, (a) => map_(second, (b) => f(a, b)));
}

/**
 * Zip the result of two IOs together into a tuple type
 * @param first
 * @param second
 */
export function zip<R, E, A, R2, E2, B>(
  first: Effect<R, E, A>,
  second: Effect<R2, E2, B>
): Effect<R & R2, E | E2, readonly [A, B]> {
  return zipWith(first, second, tuple2);
}

/**
 * Evaluate two IOs in sequence and produce the value produced by the first
 * @param first
 * @param second
 */
export function applyFirst<R, E, A, R2, E2, B>(
  first: Effect<R, E, A>,
  second: Effect<R2, E2, B>
): Effect<R & R2, E | E2, A> {
  return zipWith(first, second, fst);
}

/**
 * Evaluate two IOs in sequence and produce the value produced by the second
 * @param first
 * @param second
 */
export function applySecond<R, E, A, R2, E2, B>(
  first: Effect<R, E, A>,
  second: Effect<R2, E2, B>
): Effect<R & R2, E | E2, B> {
  return zipWith(first, second, snd);
}

/**
 * Evaluate two IOs in sequence and produce the value of the second.
 * This is suitable for cases where second is recursively defined
 * @param first
 * @param second
 */
export function applySecondL<R, E, A, R2, E2, B>(
  first: Effect<R, E, A>,
  second: F.Lazy<Effect<R2, E2, B>>
): Effect<R & R2, E | E2, B> {
  return chain_(first, second);
}

/**
 * Flipped argument form of ap
 * @param ioa
 * @param iof
 */
export function ap__<R, E, A, R2, E2, B>(
  ioa: Effect<R, E, A>,
  iof: Effect<R2, E2, F.FunctionN<[A], B>>
): Effect<R & R2, E | E2, B> {
  // Find the apply/thrush operator I'm sure exists in fp-ts somewhere
  return zipWith(ioa, iof, (a, f) => f(a));
}

/**
 * Applicative ap
 * @param iof
 * @param ioa
 */
function ap_<R, E, A, B, R2, E2>(
  iof: Effect<R, E, F.FunctionN<[A], B>>,
  ioa: Effect<R2, E2, A>
): Effect<R & R2, E | E2, B> {
  return zipWith(iof, ioa, (f, a) => f(a));
}

/**
 * Flip the error and success channels in an IO
 * @param io
 */
export function flip<R, E, A>(io: Effect<R, E, A>): Effect<R, A, E> {
  return foldExit_(
    io,
    (error) => (error._tag === "Raise" ? pure(error.error) : completed(error)),
    raiseError
  );
}

/**
 * Execute the provided IO forever (or until it errors)
 * @param io
 */
export function forever<R, E, A>(io: Effect<R, E, A>): Effect<R, E, never> {
  return chain_(io, () => forever(io));
}

/**
 * Create an IO that traps all exit states of io.
 *
 * Note that interruption will not be caught unless in an uninterruptible region
 * @param io
 */
export function result<R, E, A>(io: Effect<R, E, A>): Effect<R, NoErr, ex.Exit<E, A>> {
  return foldExit_(
    io,
    (c) => pure(c) as Effect<R, NoErr, ex.Exit<E, A>>,
    (d) => pure(ex.done(d))
  );
}

/**
 * Create an interruptible region around the evalution of io
 * @param io
 */
export function interruptible<R, E, A>(io: Effect<R, E, A>): Effect<R, E, A> {
  return interruptibleRegion(io, true);
}

/**
 * Create an uninterruptible region around the evaluation of io
 * @param io
 */
export function uninterruptible<R, E, A>(io: Effect<R, E, A>): Effect<R, E, A> {
  return interruptibleRegion(io, false);
}

/**
 * Create an IO that produces void after ms milliseconds
 * @param ms
 */
export function after(ms: number): Effect<NoEnv, NoErr, void> {
  return chain_(accessRuntime, (runtime) =>
    asyncTotal((callback) => runtime.dispatchLater(callback, undefined, ms))
  );
}

/**
 * The type of a function that can restore outer interruptible state
 */
export type InterruptMaskCutout<R, E, A> = F.FunctionN<[Effect<R, E, A>], Effect<R, E, A>>;

function makeInterruptMaskCutout<R, E, A>(state: boolean): InterruptMaskCutout<R, E, A> {
  return (inner: Effect<R, E, A>) => interruptibleRegion(inner, state);
}

/**
 * Create an uninterruptible masked region
 *
 * When the returned IO is evaluated an uninterruptible region will be created and , f will receive an InterruptMaskCutout that can be used to restore the
 * interruptible status of the region above the one currently executing (which is uninterruptible)
 * @param f
 */
export function uninterruptibleMask<R, E, A>(
  f: F.FunctionN<[InterruptMaskCutout<R, E, A>], Effect<R, E, A>>
): Effect<R, E, A> {
  return chain_(accessInterruptible, (flag) => {
    const cutout = makeInterruptMaskCutout<R, E, A>(flag);
    return uninterruptible(f(cutout));
  });
}

/**
 * Create an interruptible masked region
 *
 * Similar to uninterruptibleMask
 * @param f
 */
export function interruptibleMask<R, E, A>(
  f: F.FunctionN<[InterruptMaskCutout<R, E, A>], Effect<R, E, A>>
): Effect<R, E, A> {
  return chain_(accessInterruptible, (flag) => interruptible(f(makeInterruptMaskCutout(flag))));
}

function combineFinalizerExit<E, A>(
  fiberExit: ex.Exit<E, A>,
  releaseExit: ex.Exit<E, unknown>
): ex.Exit<E, A> {
  if (fiberExit._tag === "Done" && releaseExit._tag === "Done") {
    return fiberExit;
  } else if (fiberExit._tag === "Done") {
    return releaseExit as ex.Cause<E>;
  } else if (releaseExit._tag === "Done") {
    return fiberExit;
  } else {
    // TODO: Figure out how to sanely report both of these, we swallow them currently
    // This would affect chainError (i.e. assume multiples are actually an abort condition that happens to be typed)
    return fiberExit;
  }
}

/**
 * Resource acquisition and release construct.
 *
 * Once acquire completes successfully, release is guaranteed to execute following the evaluation of the IO produced by use.
 * Release receives the exit state of use along with the resource.
 * @param acquire
 * @param release
 * @param use
 */

export function bracketExit<R, E, A, B, R2, E2, R3, E3>(
  acquire: Effect<R, E, A>,
  release: F.FunctionN<[A, ex.Exit<E | E3, B>], Effect<R2, E2, unknown>>,
  use: F.FunctionN<[A], Effect<R3, E3, B>>
): Effect<R & R2 & R3, E | E2 | E3, B> {
  return uninterruptibleMask((cutout) =>
    chain_(acquire, (a) =>
      chain_(result(cutout(use(a))), (exit) =>
        chain_(result(release(a, exit as ex.Exit<E | E3, B>)), (finalize) =>
          completed(combineFinalizerExit(exit, finalize))
        )
      )
    )
  );
}

/**
 * Weaker form of bracketExit where release does not receive the exit status of use
 * @param acquire
 * @param release
 * @param use
 */
export function bracket<R, E, A, R2, E2, R3, E3, B>(
  acquire: Effect<R, E, A>,
  release: F.FunctionN<[A], Effect<R2, E2, unknown>>,
  use: F.FunctionN<[A], Effect<R3, E3, B>>
): Effect<R & R2 & R3, E | E2 | E3, B> {
  // tslint:disable-next-line: no-unnecessary-callback-wrapper
  return bracketExit(acquire, (e) => release(e), use);
}

/**
 * Guarantee that once ioa begins executing the finalizer will execute.
 * @param ioa
 * @param finalizer
 */
function onComplete_<R, E, A, R2, E2>(
  ioa: Effect<R, E, A>,
  finalizer: Effect<R2, E2, unknown>
): Effect<R & R2, E | E2, A> {
  return uninterruptibleMask((cutout) =>
    chain_(result(cutout(ioa)), (exit) =>
      chain_(result(finalizer), (finalize) => completed(combineFinalizerExit(exit, finalize)))
    )
  );
}

export function onComplete<R2, E2>(finalizer: Effect<R2, E2, unknown>) {
  return <R, E, A>(ioa: Effect<R, E, A>) => onComplete_(ioa, finalizer);
}

/**
 * Guarantee that once ioa begins executing if it is interrupted finalizer will execute
 * @param ioa
 * @param finalizer
 */
function onInterrupted_<R, E, A, R2, E2>(
  ioa: Effect<R, E, A>,
  finalizer: Effect<R2, E2, unknown>
): Effect<R & R2, E | E2, A> {
  return uninterruptibleMask((cutout) =>
    chain_(result(cutout(ioa)), (exit) =>
      exit._tag === "Interrupt"
        ? chain_(result(finalizer), (finalize) => completed(combineFinalizerExit(exit, finalize)))
        : completed(exit)
    )
  );
}

export function onInterrupted<R2, E2>(finalizer: Effect<R2, E2, unknown>) {
  return <R, E, A>(ioa: Effect<R, E, A>) => onInterrupted_(ioa, finalizer);
}

export function combineInterruptExit<R, E, A, R2, E2>(
  ioa: Effect<R, E, A>,
  finalizer: Effect<R2, E2, ex.Interrupt[]>
): Effect<R & R2, E | E2, A> {
  return uninterruptibleMask((cutout) =>
    chain_(result(cutout(ioa)), (exit) =>
      exit._tag === "Interrupt"
        ? chain_(result(finalizer), (finalize) => {
            /* istanbul ignore else */
            if (finalize._tag === "Done") {
              const errors = pipe(
                [exit.error, ...finalize.value.map((x) => x.error)],
                Ar.filter((x): x is Error => x !== undefined)
              );

              return errors.length > 0
                ? completed(ex.interruptWithErrorAndOthers(errors[0], Ar.dropLeft(1)(errors)))
                : completed(exit);
            } else {
              console.warn("BUG: interrupt finalizer should not fail");
              return completed(exit);
            }
          })
        : completed(exit)
    )
  );
}

/**
 * Introduce a gap in executing to allow other fibers to execute (if any are pending)
 */
export const shifted: Effect<NoEnv, NoErr, void> = uninterruptible(
  chain_(accessRuntime, (runtime) =>
    asyncTotal<void>((callback) => runtime.dispatchLater(callback, undefined, 0))
  )
);

/**
 * Introduce asynchronous gap before io that will allow other fibers to execute (if any are pending)
 * @param io
 */
export function shiftBefore<R, E, A>(io: Effect<R, E, A>): Effect<R, E, A> {
  return applySecond(shifted, io);
}

/**
 * Introduce asynchronous gap after an io that will allow other fibers to execute (if any are pending)
 * @param io
 */
export function shiftAfter<E, A>(io: Effect<NoEnv, E, A>): Effect<NoEnv, E, A> {
  return applyFirst(io, shifted as Effect<NoEnv, E, void>);
}

/**
 * Introduce an asynchronous gap that will suspend the runloop and return control to the javascript vm
 */
export const shiftedAsync: Effect<NoEnv, NoErr, void> = uninterruptible(
  chain_(accessRuntime, (runtime) =>
    asyncTotal<void>((callback) => runtime.dispatchLater(callback, undefined, 0))
  )
);

/**
 * Introduce an asynchronous gap before IO
 * @param io
 */
export function shiftAsyncBefore<R, E, A>(io: Effect<R, E, A>): Effect<R, E, A> {
  return applySecond(shiftedAsync, io);
}

/**
 * Introduce asynchronous gap after an IO
 * @param io
 */
export function shiftAsyncAfter<R, E, A>(io: Effect<R, E, A>): Effect<R, E, A> {
  return applyFirst(io, shiftedAsync);
}

/**
 * An IO that never produces a value or an error.
 *
 * This IO will however prevent a javascript runtime such as node from exiting by scheduling an interval for 60s
 */
export const never: Effect<NoEnv, NoErr, never> = asyncTotal(() => {
  const handle = setInterval(() => {
    //
  }, 60000);
  /* istanbul ignore next */
  return (cb) => {
    clearInterval(handle);
    cb();
  };
});

/**
 * Delay evaluation of inner by some amount of time
 * @param inner
 * @param ms
 */
export function delay<R, E, A>(inner: Effect<R, E, A>, ms: number): Effect<R, E, A> {
  return applySecond(after(ms), inner);
}

/**
 * Curried form of delay
 */
export function liftDelay(ms: number): <R, E, A>(io: Effect<R, E, A>) => Effect<R, E, A> {
  return (io) => delay(io, ms);
}

export interface Fiber<E, A> {
  /**
   * The name of the fiber
   */
  readonly name: Op.Option<string>;
  /**
   * Send an interrupt signal to this fiber.
   *
   * The this will complete execution once the target fiber has halted.
   * Does nothing if the target fiber is already complete
   */
  readonly interrupt: Effect<NoEnv, NoErr, ex.Interrupt>;
  /**
   * Await the result of this fiber
   */
  readonly wait: Effect<NoEnv, NoErr, ex.Exit<E, A>>;
  /**
   * Join with this fiber.
   * This is equivalent to fiber.wait.chain(io.completeWith)
   */
  readonly join: Effect<NoEnv, E, A>;
  /**
   * Poll for a fiber result
   */
  readonly result: Effect<NoEnv, E, Op.Option<A>>;
  /**
   * Determine if the fiber is complete
   */
  readonly isComplete: Effect<NoEnv, NoErr, boolean>;
}

export class FiberImpl<E, A> implements Fiber<E, A> {
  name = Op.fromNullable(this.n);

  sendInterrupt = sync(() => {
    this.driver.interrupt();
  });
  wait = asyncTotal((f: F.FunctionN<[ex.Exit<E, A>], void>) => this.driver.onExit(f));
  interrupt = applySecond(this.sendInterrupt, this.wait as Effect<unknown, never, ex.Interrupt>);
  join = chain_(this.wait, completed);
  result = chain_(
    sync(() => this.driver.completed),
    (opt) => (opt === null ? pureNone : map_(completed(opt), Op.some))
  );
  isComplete = sync(() => this.driver.completed !== null);

  constructor(readonly driver: Driver<E, A>, readonly n?: string) {}
}

const pureNone = pure(Op.none);

/**
 * Implementation of Stack/waver fork. Creates an IO that will fork a fiber in the background
 * @param init
 * @param name
 */
export function makeFiber<R, E, A>(
  init: Effect<R, E, A>,
  name?: string
): Effect<R, NoErr, Fiber<E, A>> {
  return accessM((r: R) =>
    chain_(accessRuntime, (runtime) =>
      sync(() => {
        const driver = new DriverImpl<E, A>(runtime);
        const fiber = new FiberImpl(driver, name);
        driver.start(provideAll(r)(init));
        return fiber;
      })
    )
  );
}

/**
 * Fork the program described by IO in a separate fiber.
 *
 * This fiber will begin executing once the current fiber releases control of the runloop.
 * If you need to begin the fiber immediately you should use applyFirst(forkIO, shifted)
 * @param io
 * @param name
 */
export function fork<R, E, A>(io: Effect<R, E, A>, name?: string): Effect<R, NoErr, Fiber<E, A>> {
  return makeFiber(io, name);
}

function completeLatched<E1, E2, E3, A, B, C, R>(
  latch: Ref<boolean>,
  channel: Deferred<R, E3, C>,
  combine: F.FunctionN<[ex.Exit<E1, A>, Fiber<E2, B>], Effect<R, E3, C>>,
  other: Fiber<E2, B>
): F.FunctionN<[ex.Exit<E1, A>], Effect<R, NoErr, void>> {
  return (exit) => {
    const act: Effect<NoEnv, never, Effect<R, NoErr, void>> = latch.modify((flag) =>
      !flag ? ([channel.from(combine(exit, other)), true] as const) : ([unit, flag] as const)
    );
    return flatten(act);
  };
}

/**
 * Race two fibers together and combine their results.
 *
 * This is the primitive from which all other racing and timeout operators are built and you should favor those unless you have very specific needs.
 * @param first
 * @param second
 * @param onFirstWon
 * @param onSecondWon
 */
export function raceFold<R, R2, R3, R4, E1, E2, E3, A, B, C>(
  first: Effect<R, E1, A>,
  second: Effect<R2, E2, B>,
  onFirstWon: F.FunctionN<[ex.Exit<E1, A>, Fiber<E2, B>], Effect<R3, E3, C>>,
  onSecondWon: F.FunctionN<[ex.Exit<E2, B>, Fiber<E1, A>], Effect<R4, E3, C>>
): Effect<R & R2 & R3 & R4, E3, C> {
  return accessM((r: R & R2) =>
    uninterruptibleMask<R3 & R4, E3, C>((cutout) =>
      chain_<NoEnv, E3, Ref<boolean>, R3 & R4, E3, C>(makeRef<boolean>(false), (latch) =>
        chain_<R3 & R4, E3, Deferred<R3 & R4, E3, C>, R3 & R4, E3, C>(
          makeDeferred<R3 & R4, E3, C>(),
          (channel) =>
            chain_(fork(provideAll(r)(first)), (fiber1) =>
              chain_(fork(provideAll(r)(second)), (fiber2) =>
                chain_(
                  fork(
                    chain_(
                      fiber1.wait as Effect<NoEnv, NoErr, ex.Exit<E1, A>>,
                      completeLatched(latch, channel, onFirstWon, fiber2)
                    )
                  ),
                  () =>
                    chain_(
                      fork(
                        chain_(
                          fiber2.wait as Effect<NoEnv, NoErr, ex.Exit<E2, B>>,
                          completeLatched(latch, channel, onSecondWon, fiber1)
                        )
                      ),
                      () =>
                        combineInterruptExit(
                          cutout(channel.wait),
                          chain_(fiber1.interrupt, (i1) => map_(fiber2.interrupt, (i2) => [i1, i2]))
                        )
                    )
                )
              )
            )
        )
      )
    )
  );
}

/**
 * Execute an IO and produce the next IO to run based on whether it completed successfully in the alotted time or not
 * @param source
 * @param ms
 * @param onTimeout
 * @param onCompleted
 */
export function timeoutFold<R, E1, E2, A, B>(
  source: Effect<R, E1, A>,
  ms: number,
  onTimeout: F.FunctionN<[Fiber<E1, A>], Effect<NoEnv, E2, B>>,
  onCompleted: F.FunctionN<[ex.Exit<E1, A>], Effect<NoEnv, E2, B>>
): Effect<R, E2, B> {
  return raceFold(
    source,
    after(ms),
    /* istanbul ignore next */
    (exit, delayFiber) => applySecond(delayFiber.interrupt, onCompleted(exit)),
    (_, fiber) => onTimeout(fiber)
  );
}

function interruptLoser<R, E, A>(exit: ex.Exit<E, A>, loser: Fiber<E, A>): Effect<R, E, A> {
  return applySecond(loser.interrupt, completed(exit));
}

/**
 * Return the reuslt of the first IO to complete or error successfully
 * @param io1
 * @param io2
 */
export function raceFirst<R, R2, E, A>(
  io1: Effect<R, E, A>,
  io2: Effect<R2, E, A>
): Effect<R & R2, E, A> {
  return raceFold(io1, io2, interruptLoser, interruptLoser);
}

function fallbackToLoser<R, E, A>(exit: ex.Exit<E, A>, loser: Fiber<E, A>): Effect<R, E, A> {
  return exit._tag === "Done" ? applySecond(loser.interrupt, completed(exit)) : loser.join;
}

/**
 * Return the result of the first IO to complete successfully.
 *
 * If an error occurs, fall back to the other IO.
 * If both error, then fail with the second errors
 * @param io1
 * @param io2
 */
export function race<R, R2, E, A>(
  io1: Effect<R, E, A>,
  io2: Effect<R2, E, A>
): Effect<R & R2, E, A> {
  return raceFold(io1, io2, fallbackToLoser, fallbackToLoser);
}

/**
 * Zip the result of 2 ios executed in parallel together with the provided function.
 * @param ioa
 * @param iob
 * @param f
 */
export function parZipWith<R, R2, E, E2, A, B, C>(
  ioa: Effect<R, E, A>,
  iob: Effect<R2, E2, B>,
  f: F.FunctionN<[A, B], C>
): Effect<R & R2, E | E2, C> {
  return raceFold(
    ioa,
    iob,
    (aExit, bFiber) => zipWith(completed(aExit), bFiber.join, f),
    (bExit, aFiber) => zipWith(aFiber.join, completed(bExit), f)
  );
}

/**
 * Tuple the result of 2 ios executed in parallel
 * @param ioa
 * @param iob
 */
export function parZip<R, R2, E, A, B>(
  ioa: Effect<R, E, A>,
  iob: Effect<R2, E, B>
): Effect<R & R2, E, readonly [A, B]> {
  return parZipWith(ioa, iob, tuple2);
}

/**
 * Execute two ios in parallel and take the result of the first.
 * @param ioa
 * @param iob
 */
export function parApplyFirst<R, R2, E, A, B>(
  ioa: Effect<R, E, A>,
  iob: Effect<R2, E, B>
): Effect<R & R2, E, A> {
  return parZipWith(ioa, iob, fst);
}

/**
 * Exeute two IOs in parallel and take the result of the second
 * @param ioa
 * @param iob
 */
export function parApplySecond<R, R2, E, A, B>(
  ioa: Effect<R, E, A>,
  iob: Effect<R2, E, B>
): Effect<R & R2, E, B> {
  return parZipWith(ioa, iob, snd);
}

/**
 * Parallel form of ap
 * @param ioa
 * @param iof
 */
export function parAp<R, R2, E, A, B>(
  ioa: Effect<R, E, A>,
  iof: Effect<R2, E, F.FunctionN<[A], B>>
): Effect<R & R2, E, B> {
  return parZipWith(ioa, iof, (a, f) => f(a));
}

/**
 * Parallel form of ap_
 * @param iof
 * @param ioa
 */
export function parAp_<R, R2, E, E2, A, B>(
  iof: Effect<R, E, F.FunctionN<[A], B>>,
  ioa: Effect<R2, E2, A>
): Effect<R & R2, E | E2, B> {
  return parZipWith(iof, ioa, (f, a) => f(a));
}

/**
 * Convert an error into an unchecked error.
 * @param io
 */
export function orAbort<R, E, A>(io: Effect<R, E, A>): Effect<R, NoErr, A> {
  return chainError_(io, raiseAbort);
}

/**
 * Run source for a maximum amount of ms.
 *
 * If it completes succesfully produce a some, if not interrupt it and produce none
 * @param source
 * @param ms
 */
export function timeoutOption<R, E, A>(
  source: Effect<R, E, A>,
  ms: number
): Effect<R, E, Op.Option<A>> {
  return timeoutFold(
    source,
    ms,
    (actionFiber) => applySecond(actionFiber.interrupt, pureNone),
    (exit) => map_(completed(exit), Op.some)
  );
}

/**
 * Create an IO from a Promise factory.
 * @param thunk
 */
export function fromPromise<A>(thunk: F.Lazy<Promise<A>>): Effect<NoEnv, unknown, A> {
  return uninterruptible(
    async<unknown, A>((callback) => {
      thunk()
        .then((v) => callback(Ei.right(v)))
        .catch((e) => callback(Ei.left(e)));
      /* istanbul ignore next */
      return (cb) => {
        cb();
      };
    })
  );
}

export function encaseTask<A>(task: TA.Task<A>): Effect<NoEnv, NoErr, A> {
  return orAbort(fromPromise(task));
}

export function encaseTaskEither<E, A>(taskEither: TE.TaskEither<E, A>): Effect<NoEnv, E, A> {
  return async<E, A>((callback) => {
    taskEither().then(callback);
    /* istanbul ignore next */
    return (cb) => {
      cb();
    };
  });
}

export function fromPromiseMap<E>(
  onError: (e: unknown) => E
): <A>(thunk: F.Lazy<Promise<A>>) => Effect<NoEnv, E, A> {
  return <A>(thunk: F.Lazy<Promise<A>>) =>
    async<E, A>((callback) => {
      thunk()
        .then((v) => callback(Ei.right(v)))
        .catch((e) => callback(Ei.left(onError(e))));
      /* istanbul ignore next */
      return (cb) => {
        cb();
      };
    });
}

/**
 * Run the given IO with the provided environment.
 * @param io
 * @param r
 * @param callback
 */
export function run<E, A>(
  io: Effect<{}, E, A>,
  callback?: F.FunctionN<[ex.Exit<E, A>], void>
): F.Lazy<void> {
  const driver = new DriverImpl<E, A>();
  if (callback) {
    driver.onExit(callback);
  }
  driver.start(io);
  return () => driver.interrupt();
}

/**
 * Run the given IO syncroniously
 * returns left if any async operation
 * is found
 * @param io
 */
export function runSync<E, A>(io: Effect<{}, E, A>): Ei.Either<Error, ex.Exit<E, A>> {
  return new DriverSyncImpl<E, A>().start(io);
}

/* istanbul skip next */
export function runUnsafeSync<E, A>(io: Effect<{}, E, A>): A {
  const result = runSync(io);

  if (result._tag === "Left") {
    throw result.left;
  }
  if (result.right._tag !== "Done") {
    throw result.right._tag === "Raise"
      ? result.right.error
      : result.right._tag === "Abort"
      ? result.right.abortedWith
      : result.right;
  }
  return result.right.value;
}

/**
 * Run an IO and return a Promise of its result
 *
 * Allows providing an environment parameter directly
 * @param io
 * @param r
 */
export function runToPromise<E, A>(io: Effect<{}, E, A>): Promise<A> {
  return new Promise((resolve, reject) =>
    run(io, (exit) => {
      switch (exit._tag) {
        case "Done":
          resolve(exit.value);
          return;
        case "Abort":
          reject(exit.abortedWith);
          return;
        case "Raise":
          reject(exit.error);
          return;
        case "Interrupt":
          reject();
          return;
      }
    })
  );
}

/**
 * Run an IO returning a promise of an Exit.
 *
 * The Promise will not reject.
 * Allows providing an environment parameter directly
 * @param io
 * @param r
 */
export function runToPromiseExit<E, A>(io: Effect<{}, E, A>): Promise<ex.Exit<E, A>> {
  return new Promise((result) => run(io, result));
}

export const URI = "matechs/Effect";
export type URI = typeof URI;
declare module "fp-ts/lib/HKT" {
  interface URItoKind3<R, E, A> {
    [URI]: Effect<R, E, A>;
  }
}

function chainError_<R, E1, R2, E2, A, A2>(
  io: Effect<R, E1, A>,
  f: F.FunctionN<[E1], Effect<R2, E2, A2>>
): Effect<R & R2, E2, A | A2> {
  return foldExit_(
    io,
    (cause) => (cause._tag === "Raise" ? f(cause.error) : completed(cause)),
    pure
  );
}

export interface EffectMonad
  extends Monad3E<URI>,
    Bif.Bifunctor3<URI>,
    MonadThrow3E<URI>,
    Alt3E<URI>,
    Fun.Functor3<URI> {
  /**
   * Produce an new IO that will use the error produced by inner to produce a recovery program
   * @param io
   * @param f
   */
  chainError<R, E1, R2, E2, A, A2>(
    io: Effect<R, E1, A>,
    f: F.FunctionN<[E1], Effect<R2, E2, A2>>
  ): Effect<R & R2, E2, A | A2>;

  /**
   * Fold the result of an IO into a new IO.
   *
   * This can be thought of as a more powerful form of chain
   * where the computation continues with a new IO depending on the result of inner.
   * @param inner The IO to fold the exit of
   * @param failure
   * @param success
   */
  foldExit<R, E1, R2, E2, A1, A2, A3, R3, E3>(
    inner: Effect<R, E1, A1>,
    failure: F.FunctionN<[ex.Cause<E1>], Effect<R2, E2, A2>>,
    success: F.FunctionN<[A1], Effect<R3, E3, A3>>
  ): Effect<R & R2 & R3, E2 | E3, A2 | A3>;

  /**
   * Sequence a Stack and then produce an effect based on the produced value for observation.
   *
   * Produces the result of the iniital Stack
   * @param inner
   * @param bind
   */
  chainTap<R, E, A, R2, E2>(
    inner: Effect<R, E, A>,
    bind: F.FunctionN<[A], Effect<R2, E2, unknown>>
  ): Effect<R & R2, E | E2, A>;

  /**
   * Map over either the error or value produced by an IO
   * @param io
   * @param leftMap
   * @param rightMap
   */
  bimap<R, E1, E2, A, B>(
    io: Effect<R, E1, A>,
    leftMap: F.FunctionN<[E1], E2>,
    rightMap: F.FunctionN<[A], B>
  ): Effect<R, E2, B>;

  /**
   * Map the error produced by an IO
   * @param io
   * @param f
   */
  mapError: EffectMonad["mapLeft"];

  onInterrupted<R, E, A, R2, E2>(
    ioa: Effect<R, E, A>,
    finalizer: Effect<R2, E2, unknown>
  ): Effect<R & R2, E | E2, A>;

  onComplete<R, E, A, R2, E2>(
    ioa: Effect<R, E, A>,
    finalizer: Effect<R2, E2, unknown>
  ): Effect<R & R2, E | E2, A>;
}

const foldExit_: EffectMonad["foldExit"] = (inner, failure, success) =>
  new EffectIO(EffectTag.Collapse as const, inner, failure, success);

const mapLeft_: EffectMonad["mapLeft"] = (io, f) => chainError_(io, F.flow(f, raiseError));

const alt_: EffectMonad["alt"] = chainError_;

export function alt<R2, E2, A>(
  fy: () => Effect<R2, E2, A>
): <R, E>(fx: Effect<R, E, A>) => Effect<R & R2, E2, A> {
  return (fx) => alt_(fx, fy);
}

export const effect: EffectMonad = {
  URI,
  map: map_,
  of: pure,
  ap: ap_,
  chain: chain_,
  bimap: bimap_,
  mapLeft: mapLeft_,
  mapError: mapLeft_,
  throwError: raiseError,
  chainError: chainError_,
  foldExit: foldExit_,
  chainTap: chainTap_,
  alt: alt_,
  onInterrupted: onInterrupted_,
  onComplete: onComplete_
};

export const parEffect: Monad3E<URI> & Bif.Bifunctor3<URI> & MonadThrow3E<URI> = {
  URI,
  map: map_,
  of: pure,
  ap: parAp_,
  chain: chain_,
  bimap: bimap_,
  mapLeft: mapLeft_,
  throwError: raiseError
};

const {
  ap,
  apFirst,
  apSecond,
  // toto
  bimap,
  chain,
  chainFirst,
  filterOrElse,
  flatten,
  fromEither,
  fromOption,
  fromPredicate,
  map,
  mapLeft
} = P.pipeable(effect);

export {
  ap,
  apFirst,
  apSecond,
  bimap,
  chain,
  chainFirst,
  filterOrElse,
  flatten,
  fromEither,
  fromOption,
  fromPredicate,
  map,
  mapLeft
};

export function getSemigroup<R, E, A>(s: Sem.Semigroup<A>): Sem.Semigroup<Effect<R, E, A>> {
  return {
    concat(x: Effect<R, E, A>, y: Effect<R, E, A>): Effect<R, E, A> {
      return zipWith(x, y, s.concat);
    }
  };
}

export function getMonoid<R, E, A>(m: Mon.Monoid<A>): Mon.Monoid<Effect<R, E, A>> {
  return {
    ...getSemigroup(m),
    empty: pure(m.empty)
  };
}

/* conditionals */

export function when(
  predicate: boolean
): <R, E, A>(ma: Effect<R, E, A>) => Effect<R, E, Op.Option<A>> {
  return (ma) => (predicate ? map_(ma, Op.some) : pure(Op.none));
}

export function or_(
  predicate: boolean
): <R, E, A>(
  ma: Effect<R, E, A>
) => <R2, E2, B>(mb: Effect<R2, E2, B>) => Effect<R & R2, E | E2, Ei.Either<A, B>> {
  return (ma) => (mb) => (predicate ? map_(ma, Ei.left) : map_(mb, Ei.right));
}

export function or<R, E, A>(
  ma: Effect<R, E, A>
): <R2, E2, B>(
  mb: Effect<R2, E2, B>
) => (predicate: boolean) => Effect<R & R2, E | E2, Ei.Either<A, B>> {
  return (mb) => (predicate) => (predicate ? map_(ma, Ei.left) : map_(mb, Ei.right));
}

export function condWith(
  predicate: boolean
): <R, E, A>(
  ma: Effect<R, E, A>
) => <R2, E2, B>(mb: Effect<R2, E2, B>) => Effect<R & R2, E | E2, A | B> {
  return (ma) => (mb) => (predicate ? ma : mb);
}

export function cond<R, E, A>(
  ma: Effect<R, E, A>
): <R2, E2, B>(mb: Effect<R2, E2, B>) => (predicate: boolean) => Effect<R & R2, E | E2, A | B> {
  return (mb) => (predicate) => (predicate ? ma : mb);
}

export function fromNullableM<R, E, A>(ma: Effect<R, E, A>): Effect<R, E, Op.Option<A>> {
  return map_(ma, Op.fromNullable);
}

export function sequenceP(
  n: number
): <R, E, A>(ops: Array<Effect<R, E, A>>) => Effect<R, E, Array<A>> {
  return (ops) =>
    effect.chain(S.makeSemaphore(n), (sem) =>
      Ar.array.traverse(parEffect)(ops, (op) => sem.withPermit(op))
    );
}

export const traverseAS = <A, R, E, B>(f: (a: A) => Effect<R, E, B>) => (
  arr: Array<A>
): Effect<R, E, Array<B>> => Ar.array.traverse(effect)(arr, f);

export const traverseAP = <A, R, E, B>(f: (a: A) => Effect<R, E, B>) => (
  arr: Array<A>
): Effect<R, E, Array<B>> => Ar.array.traverse(effect)(arr, f);

export function getCauseSemigroup<E>(S: Sem.Semigroup<E>): Sem.Semigroup<ex.Cause<E>> {
  return {
    concat: (ca, cb): ex.Cause<E> => {
      if (ca._tag === "Interrupt" || cb._tag === "Interrupt") {
        return ca;
      }
      if (ca._tag === "Abort") {
        return ca;
      }
      if (cb._tag === "Abort") {
        return cb;
      }
      return ex.raise(S.concat(ca.error, cb.error));
    }
  };
}

export function getValidationM<E>(S: Sem.Semigroup<E>) {
  return getCauseValidationM(getCauseSemigroup(S));
}

export function getCauseValidationM<E>(
  S: Sem.Semigroup<ex.Cause<E>>
): Monad3EC<URI, E> & MonadThrow3EC<URI, E> & Alt3EC<URI, E> {
  return {
    URI,
    // @ts-ignore
    _E: undefined as any,
    of: pure,
    map: map_,
    chain: chain_,
    ap: <R, R2, A, B>(fab: Effect<R, E, (a: A) => B>, fa: Effect<R2, E, A>): Effect<R & R2, E, B> =>
      foldExit_(
        fab,
        (fabe) =>
          foldExit_(
            fa,
            (fae) => raised(S.concat(fabe, fae)),
            (_) => raised(fabe)
          ),
        (f) => map_(fa, f)
      ),
    throwError: raiseError as <R, A>(e: E) => Effect<R, E, A>,
    alt: <R, R2, A>(fa: Effect<R, E, A>, fb: () => Effect<R2, E, A>): Effect<R & R2, E, A> =>
      foldExit_(fa, (e) => foldExit_(fb(), (fbe) => raised(S.concat(e, fbe)), pure), pure)
  };
}

/**
 * This is directly ported from excellent `fp-ts` `taskify`
 *
 * Convert a node style callback function to one returning an `Effect`
 *
 * **Note**. If the function `f` admits multiple overloadings, `effectify` will pick last one. If you want a different
 * behaviour, add an explicit type annotation
 *
 * ```ts
 * // readFile admits multiple overloadings
 *
 * // const readFile: (a: string) => Effect<NoEnv,NodeJS.ErrnoException, Buffer>
 * const readFile = effectify(fs.readFile)
 *
 * const readFile2: (filename: string, encoding: string) => Effect<NoEnv,NodeJS.ErrnoException, Buffer> = effectify(
 *   fs.readFile
 * )
 * ```
 *
 * @example
 * import { effectify } from '@matechs/effect'
 * import * as fs from '
 *
 * // const stat: (a: string | Buffer) => Effect<NoEnv,NodeJS.ErrnoException, fs.Stats>
 * const stat = effectify(fs.stat)
 * assert.strictEqual(stat.length, 0)
 *
 */
export function effectify<L, R>(
  f: (cb: (e: L | null | undefined, r?: R) => void) => void
): () => Effect<NoEnv, L, R>;
export function effectify<A, L, R>(
  f: (a: A, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A) => Effect<NoEnv, L, R>;
export function effectify<A, B, L, R>(
  f: (a: A, b: B, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B) => Effect<NoEnv, L, R>;
export function effectify<A, B, C, L, R>(
  f: (a: A, b: B, c: C, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C) => Effect<NoEnv, L, R>;
export function effectify<A, B, C, D, L, R>(
  f: (a: A, b: B, c: C, d: D, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C, d: D) => Effect<NoEnv, L, R>;
export function effectify<A, B, C, D, E, L, R>(
  f: (a: A, b: B, c: C, d: D, e: E, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C, d: D, e: E) => Effect<NoEnv, L, R>;
export function effectify<L, R>(f: Function): () => Effect<NoEnv, L, R> {
  return function () {
    const args = Array.prototype.slice.call(arguments);
    return async<L, R>((cb) => {
      const cbResolver = (e: L, r: R) =>
        // tslint:disable-next-line: triple-equals
        e != null ? cb(Ei.left(e)) : cb(Ei.right(r));
      f.apply(null, args.concat(cbResolver));
      /* istanbul ignore next */
      return (cb) => {
        cb();
      };
    });
  };
}

export const patch = <R>() => <E, R2>(f: (_: R) => Effect<R2, E, R>) => <R3, E3, A>(
  eff: Effect<R3 & R, E3, A>
) => chain_(accessEnvironment<R>(), (r) => chain_(f(r), (rn) => provideS(rn)(eff)));

export interface Provider<Environment, Module, E2 = never> {
  <R, E, A>(e: Effect<Module & R, E, A>): Effect<Environment & R, E | E2, A>;
}

export { Erase } from "./erase";
