import {
  either as Ei,
  function as F,
  option as Op,
  task as TA,
  taskEither as TE,
  array as Ar,
  semigroup as Sem,
  monoid as Mon,
  tree as TR,
  record as RE
} from "fp-ts";
import { pipeable, pipe } from "fp-ts/lib/pipeable";
import * as ex from "./original/exit";
import { Runtime } from "./original/runtime";
import {
  Monad4E,
  MonadThrow4E,
  Alt4E,
  Monad4EC,
  Monad4ECP,
  MonadThrow4EC,
  MonadThrow4ECP,
  Alt4EC,
  Monad4EP,
  MonadThrow4EP
} from "./overloadEff";
import { Bifunctor4 } from "fp-ts/lib/Bifunctor";
import { Functor4 } from "fp-ts/lib/Functor";
import { DriverSyncImpl } from "./driverSync";
import { Driver, DriverImpl } from "./driver";
import { fst, snd, tuple2 } from "./original/support/util";
import { Effect, EffectTag, Provider } from "./defs";
import { Ref, makeRef } from "./ref";
import { Deferred, makeDeferred } from "./deferred";
import { Do as DoG } from "fp-ts-contrib/lib/Do";
import { sequenceS as SS, sequenceT as ST } from "fp-ts/lib/Apply";
import { Separated } from "fp-ts/lib/Compactable";

// WIP
/* istanbul ignore file */

export { Effect, EffectTag, Provider };

export type Async<A> = Effect<unknown, unknown, never, A>;
export type AsyncE<E, A> = Effect<unknown, unknown, E, A>;
export type AsyncR<R, A> = Effect<unknown, R, never, A>;
export type AsyncRE<R, E, A> = Effect<unknown, R, E, A>;

export type Sync<A> = Effect<never, unknown, never, A>;
export type SyncE<E, A> = Effect<never, unknown, E, A>;
export type SyncR<R, A> = Effect<never, R, never, A>;
export type SyncRE<R, E, A> = Effect<never, R, E, A>;

export const URI = "matechs/Effect";
export type URI = typeof URI;
declare module "fp-ts/lib/HKT" {
  interface URItoKind4<S, R, E, A> {
    [URI]: Effect<S, R, E, A>;
  }
}

export type Instructions =
  | Pure<any>
  | PureOption<any, any>
  | PureEither<any, any>
  | Raised<any>
  | Completed<any, any>
  | Suspended<any, any, any, any>
  | IAsync<any, any>
  | IChain<any, any, any, any, any, any, any, any>
  | ICollapse<any, any, any, any, any, any, any, any, any, any, any, any>
  | IInterruptibleRegion<any, any, any, any>
  | IAccessInterruptible<any>
  | IAccessRuntime<any>
  | IAccessEnv<any>
  | IProvideEnv<any, any, any, any>
  | IMap<any, any, any, any, any>;

export class Pure<A> implements Effect<never, unknown, never, A> {
  constructor(readonly a: A) {}

  /* istanbul ignore next */
  _TAG(): "Effect" {
    return undefined as any;
  }

  /* istanbul ignore next */
  _A(): A {
    return undefined as any;
  }

  /* istanbul ignore next */
  _E(): never {
    return (undefined as any) as never;
  }

  /* istanbul ignore next */
  _S(): never {
    return (undefined as any) as never;
  }

  /* istanbul ignore next */
  _R(_: unknown): void {
    return undefined as any;
  }
}

export class PureOption<E, A> implements Effect<never, unknown, E, A> {
  constructor(readonly a: Op.Option<A>, readonly onEmpty: () => E) {}

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
  _S(): never {
    return (undefined as any) as never;
  }

  /* istanbul ignore next */
  _R(_: unknown): void {
    return undefined as any;
  }
}

export class PureEither<E, A> implements Effect<never, unknown, E, A> {
  constructor(readonly a: Ei.Either<E, A>) {}

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
  _S(): never {
    return (undefined as any) as never;
  }

  /* istanbul ignore next */
  _R(_: unknown): void {
    return undefined as any;
  }
}

export class Raised<E> implements Effect<never, unknown, E, never> {
  constructor(readonly e: ex.Cause<E>) {}

  /* istanbul ignore next */
  _TAG(): "Effect" {
    return undefined as any;
  }

  /* istanbul ignore next */
  _A(): never {
    return (undefined as any) as never;
  }

  /* istanbul ignore next */
  _E(): E {
    return undefined as any;
  }

  /* istanbul ignore next */
  _S(): never {
    return (undefined as any) as never;
  }

  /* istanbul ignore next */
  _R(_: unknown): void {
    return undefined as any;
  }
}

export class Completed<E, A> implements Effect<never, unknown, E, A> {
  constructor(readonly e: ex.Exit<E, A>) {}

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
  _S(): never {
    return (undefined as any) as never;
  }

  /* istanbul ignore next */
  _R(_: unknown): void {
    return undefined as any;
  }
}

export class Suspended<S, R, E, A> implements Effect<S, R, E, A> {
  constructor(readonly e: F.Lazy<Effect<S, R, E, A>>) {}

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
  _S(): S {
    return undefined as any;
  }

  /* istanbul ignore next */
  _R(_: R): void {
    return undefined as any;
  }
}

export type AsyncContFn<E, A> = F.FunctionN<[Ei.Either<E, A>], void>;
export type AsyncCancelContFn = F.FunctionN<[(error?: Error, others?: Error[]) => void], void>;
export type AsyncFn<E, A> = F.FunctionN<[AsyncContFn<E, A>], AsyncCancelContFn>;

export class IAsync<E, A> implements Effect<unknown, unknown, E, A> {
  constructor(readonly e: AsyncFn<E, A>) {}

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
  _S(): unknown {
    return undefined as any;
  }

  /* istanbul ignore next */
  _R(_: unknown): void {
    return undefined as any;
  }
}

export class IChain<S, R, E, A, S1, R1, E1, B> implements Effect<S | S1, R & R1, E | E1, B> {
  constructor(readonly e: Effect<S, R, E, A>, readonly f: (a: A) => Effect<S1, R1, E1, B>) {}

  /* istanbul ignore next */
  _TAG(): "Effect" {
    return undefined as any;
  }

  /* istanbul ignore next */
  _A(): B {
    return undefined as any;
  }

  /* istanbul ignore next */
  _E(): E {
    return undefined as any;
  }

  /* istanbul ignore next */
  _S(): S | S1 {
    return undefined as any;
  }

  /* istanbul ignore next */
  _R(_: R & R1): void {
    return undefined as any;
  }
}

export class IMap<S, R, E, A, B> implements Effect<S, R, E, B> {
  constructor(readonly e: Effect<S, R, E, A>, readonly f: (a: A) => B) {}

  /* istanbul ignore next */
  _TAG(): "Effect" {
    return undefined as any;
  }

  /* istanbul ignore next */
  _A(): B {
    return undefined as any;
  }

  /* istanbul ignore next */
  _E(): E {
    return undefined as any;
  }

  /* istanbul ignore next */
  _S(): S {
    return undefined as any;
  }

  /* istanbul ignore next */
  _R(_: R): void {
    return undefined as any;
  }
}

export class ICollapse<S1, S2, S3, R, R2, R3, E1, E2, E3, A1, A2, A3>
  implements Effect<S1 | S2 | S3, R & R2 & R3, E2 | E3, A2 | A3> {
  constructor(
    readonly inner: Effect<S1, R, E1, A1>,
    readonly failure: F.FunctionN<[ex.Cause<E1>], Effect<S2, R2, E2, A2>>,
    readonly success: F.FunctionN<[A1], Effect<S3, R3, E3, A3>>
  ) {}

  /* istanbul ignore next */
  _TAG(): "Effect" {
    return undefined as any;
  }

  /* istanbul ignore next */
  _A(): A2 | A3 {
    return undefined as any;
  }

  /* istanbul ignore next */
  _E(): E2 | E3 {
    return undefined as any;
  }

  /* istanbul ignore next */
  _S(): S1 | S2 | S3 {
    return undefined as any;
  }

  /* istanbul ignore next */
  _R(_: R & R2 & R3): void {
    return undefined as any;
  }
}

export class IInterruptibleRegion<S, R, E, A> implements Effect<S, R, E, A> {
  constructor(readonly e: Effect<S, R, E, A>, readonly int: boolean) {}

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
  _S(): S {
    return undefined as any;
  }

  /* istanbul ignore next */
  _R(_: R): void {
    return undefined as any;
  }
}

export class IAccessInterruptible<A> implements Effect<never, unknown, never, A> {
  constructor(readonly f: (_: boolean) => A) {}

  /* istanbul ignore next */
  _TAG(): "Effect" {
    return undefined as any;
  }

  /* istanbul ignore next */
  _A(): A {
    return undefined as any;
  }

  /* istanbul ignore next */
  _E(): never {
    return (undefined as any) as never;
  }

  /* istanbul ignore next */
  _S(): never {
    return (undefined as any) as never;
  }

  /* istanbul ignore next */
  _R(_: unknown): void {
    return undefined as any;
  }
}

export class IAccessRuntime<A> implements Effect<never, unknown, never, A> {
  constructor(readonly f: (_: Runtime) => A) {}

  /* istanbul ignore next */
  _TAG(): "Effect" {
    return undefined as any;
  }

  /* istanbul ignore next */
  _A(): A {
    return undefined as any;
  }

  /* istanbul ignore next */
  _E(): never {
    return (undefined as any) as never;
  }

  /* istanbul ignore next */
  _S(): never {
    return (undefined as any) as never;
  }

  /* istanbul ignore next */
  _R(_: unknown): void {
    return undefined as any;
  }
}

export class IProvideEnv<S, R, E, A> implements Effect<S, unknown, E, A> {
  constructor(readonly e: Effect<S, R, E, A>, readonly r: R) {}

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
  _S(): S {
    return undefined as any;
  }

  /* istanbul ignore next */
  _R(_: unknown): void {
    return undefined as any;
  }
}

export class IAccessEnv<R> implements Effect<never, R, never, R> {
  /* istanbul ignore next */
  _TAG(): "Effect" {
    return undefined as any;
  }

  /* istanbul ignore next */
  _A(): R {
    return undefined as any;
  }

  /* istanbul ignore next */
  _E(): never {
    return (undefined as any) as never;
  }

  /* istanbul ignore next */
  _S(): never {
    return (undefined as any) as never;
  }

  /* istanbul ignore next */
  _R(_: R): void {
    return undefined as any;
  }
}

/**
 * An IO has succeeded
 * @param a the value
 */
export function pure<A>(a: A): Sync<A> {
  return new Pure(a);
}

/**
 * An IO that is failed
 *
 * Prefer raiseError or raiseAbort
 * @param e
 */
export function raised<E, A = never>(e: ex.Cause<E>): SyncE<E, A> {
  return new Raised(e);
}

/**
 * An IO that is failed with a checked error
 * @param e
 */
export function raiseError<E>(e: E): SyncE<E, never> {
  return raised(ex.raise(e));
}

/**
 * An IO that is failed with an unchecked error
 * @param u
 */
export function raiseAbort(u: unknown): Sync<never> {
  return raised(ex.abort(u));
}

/**
 * An IO that is already interrupted
 */
export const raiseInterrupt: Sync<never> = raised(ex.interrupt);

/**
 * An IO that is completed with the given exit
 * @param exit
 */
export function completed<E = never, A = never>(exit: ex.Exit<E, A>): SyncE<E, A> {
  return new Completed(exit);
}

/**
 * Wrap a block of impure code that returns an IO into an IO
 *
 * When evaluated this IO will run the given thunk to produce the next IO to execute.
 * @param thunk
 */
export function suspended<S, R, E, A>(thunk: F.Lazy<Effect<S, R, E, A>>): Effect<S, R, E, A> {
  return new Suspended(thunk);
}

/**
 * Wrap a block of impure code in an IO
 *
 * When evaluated the this will produce a value or throw
 * @param thunk
 */
export function sync<A>(thunk: F.Lazy<A>): Sync<A> {
  return suspended(() => pure(thunk()));
}

export function trySync<A = unknown>(thunk: F.Lazy<A>): SyncE<unknown, A> {
  return suspended(() => {
    try {
      return pure(thunk());
    } catch (e) {
      return raiseError(e);
    }
  });
}

export function trySyncMap<E>(
  onError: (e: unknown) => E
): <A = unknown>(thunk: F.Lazy<A>) => SyncE<E, A> {
  return (thunk) =>
    suspended(() => {
      try {
        return pure(thunk());
      } catch (e) {
        return raiseError(onError(e));
      }
    });
}

export function tryEffect<S, R, E, A>(thunk: F.Lazy<Effect<S, R, E, A>>): Effect<S, R, unknown, A> {
  return flatten(trySync(thunk));
}

export function tryEffectMap<E>(
  onError: (e: unknown) => E
): <S, R, E2, A>(thunk: F.Lazy<Effect<S, R, E2, A>>) => Effect<S, R, E | E2, A> {
  return (thunk) => flatten(trySyncMap(onError)(thunk));
}

/**
 * Wrap an impure callback in an IO
 *
 * The provided function must accept a callback to report results to and return a cancellation action.
 * If your action is uncancellable for some reason, you should return an empty thunk and wrap the created IO
 * in uninterruptible
 * @param op
 */
export function async<E, A>(op: AsyncFn<E, A>): AsyncE<E, A> {
  return new IAsync(op);
}

/**
 * Wrap an impure callback in IO
 *
 * This is a variant of async where the effect cannot fail with a checked exception.
 * @param op
 */
export function asyncTotal<A>(
  op: F.FunctionN<[F.FunctionN<[A], void>], AsyncCancelContFn>
): Async<A> {
  return async((callback) => op((a) => callback(Ei.right(a))));
}

/**
 * Demarcate a region of interruptible state
 * @param inner
 * @param flag
 */
export function interruptibleRegion<S, R, E, A>(
  inner: Effect<S, R, E, A>,
  flag: boolean
): Effect<S, R, E, A> {
  return new IInterruptibleRegion(inner, flag);
}

/**
 * Produce an new IO that will use the value produced by inner to produce the next IO to evaluate
 * @param inner
 * @param bind
 */
function chain_<S, R, E, A, S2, R2, E2, B>(
  inner: Effect<S, R, E, A>,
  bind: F.FunctionN<[A], Effect<S2, R2, E2, B>>
): Effect<S | S2, R & R2, E | E2, B> {
  return inner instanceof Pure ? bind(inner.a) : new IChain(inner, bind);
}

export function chainOption<E>(
  onEmpty: F.Lazy<E>
): <A, B>(
  bind: F.FunctionN<[A], Op.Option<B>>
) => <S, R, E2>(eff: Effect<S, R, E2, A>) => Effect<S, R, E | E2, B> {
  return (bind) => (inner) => chain_(inner, (a) => encaseOption(bind(a), onEmpty));
}

export function chainEither<A, E, B>(
  bind: F.FunctionN<[A], Ei.Either<E, B>>
): <S, R, E2>(eff: Effect<S, R, E2, A>) => Effect<S, R, E | E2, B> {
  return (inner) => chain_(inner, (a) => encaseEither(bind(a)));
}

export function chainTask<A, B>(
  bind: F.FunctionN<[A], TA.Task<B>>
): <S, R, E2>(eff: Effect<S, R, E2, A>) => AsyncRE<R, E2, B> {
  return (inner) => chain_(inner, (a) => encaseTask(bind(a)));
}

export function chainTaskEither<A, E, B>(
  bind: F.FunctionN<[A], TE.TaskEither<E, B>>
): <S, R, E2>(eff: Effect<S, R, E2, A>) => AsyncRE<R, E | E2, B> {
  return (inner) => chain_(inner, (a) => encaseTaskEither(bind(a)));
}

/**
 * Lift an Either into an IO
 * @param e
 */
export function encaseEither<E, A>(e: Ei.Either<E, A>): SyncE<E, A> {
  return new PureEither(e);
}

/**
 * Lift an Option into an IO
 * @param o
 * @param onError
 */
export function encaseOption<E, A>(o: Op.Option<A>, onError: F.Lazy<E>): SyncE<E, A> {
  return new PureOption(o, onError);
}

/**
 * Curried form of foldExit
 * @param failure
 * @param success
 */
export function foldExit<S1, E1, RF, E2, A1, S2, E3, A2, RS>(
  failure: F.FunctionN<[ex.Cause<E1>], Effect<S1, RF, E2, A2>>,
  success: F.FunctionN<[A1], Effect<S2, RS, E3, A2>>
): <S, R>(io: Effect<S, R, E1, A1>) => Effect<S | S1 | S2, RF & RS & R, E2 | E3, A2> {
  return (io) => foldExit_(io, failure, success);
}

/**
 * Get the interruptible state of the current fiber
 */
export const accessInterruptible: Sync<boolean> = new IAccessInterruptible(F.identity);

/**
 * Get the runtime of the current fiber
 */
export const accessRuntime: Sync<Runtime> = new IAccessRuntime(F.identity);

/**
 * Access the runtime then provide it to the provided function
 * @param f
 */
export function withRuntime<S, R, E, A>(
  f: F.FunctionN<[Runtime], Effect<S, R, E, A>>
): Effect<S, R, E, A> {
  return chain_(accessRuntime, f);
}

export function accessEnvironment<R>(): SyncR<R, R> {
  return new IAccessEnv();
}

export function accessM<S, R, R2, E, A>(
  f: F.FunctionN<[R], Effect<S, R2, E, A>>
): Effect<S, R & R2, E, A> {
  return chain_(accessEnvironment<R>(), f);
}

export function access<R, A>(f: F.FunctionN<[R], A>): SyncR<R, A> {
  return map_(accessEnvironment<R>(), f);
}

/**
 * Provides partial environment via the spread operator, providing several environment is possible via:
 * pipe(eff, provide(env1), provide(env2)) or pipe(eff, provide<Env1 & Env2>({...env1, ...env2}))
 *
 * the second parameter is used to invert the priority of newly provided environment
 * and should be used when you want subsequent providers to take precedence (i.e. having currently provided env as default)
 */
export function provide<R>(
  r: R,
  inverted: "regular" | "inverted" = "regular"
): Provider<unknown, R, never> {
  return <S, R2, E, A>(eff: Effect<S, R2 & R, E, A>): Effect<S, R2, E, A> =>
    provideR((r2: R2) => (inverted === "inverted" ? { ...r, ...r2 } : { ...r2, ...r }))(eff);
}

/**
 * Like provide where environment is resolved monadically
 */
export function provideM<S, R, R3, E2>(
  rm: Effect<S, R3, E2, R>,
  inverted: "regular" | "inverted" = "regular"
): Provider<R3, R, E2, S> {
  return <S2, R2, E, A>(eff: Effect<S2, R2 & R, E, A>): Effect<S | S2, R2 & R3, E | E2, A> =>
    chain_(rm, (r) =>
      provideR((r2: R2) => (inverted === "inverted" ? { ...r, ...r2 } : { ...r2, ...r }))(eff)
    );
}

const provideR = <R2, R>(f: (r2: R2) => R) => <S, E, A>(
  ma: Effect<S, R, E, A>
): Effect<S, R2, E, A> => accessM((r2: R2) => new IProvideEnv(ma, f(r2)));

/**
 * Map the value produced by an IO
 * @param io
 * @param f
 */
function map_<S, R, E, A, B>(base: Effect<S, R, E, A>, f: F.FunctionN<[A], B>): Effect<S, R, E, B> {
  return base instanceof Pure ? new Pure(f(base.a)) : new IMap(base, f);
}

/**
 * Lift a function on values to a function on IOs
 * @param f
 */
export function lift<A, B>(
  f: F.FunctionN<[A], B>
): <S, R, E>(io: Effect<S, R, E, A>) => Effect<S, R, E, B> {
  return (io) => map_(io, f);
}

export function liftEither<A, E, B>(
  f: F.FunctionN<[A], Ei.Either<E, B>>
): F.FunctionN<[A], SyncE<E, B>> {
  return (a) => suspended(() => fromEither(f(a)));
}

export function liftOption<E>(
  onNone: () => E
): <A, B>(f: F.FunctionN<[A], Op.Option<B>>) => F.FunctionN<[A], SyncE<E, B>> {
  return (f) => (a) => suspended(() => encaseOption(f(a), onNone));
}

/**
 * Combines T.chain and T.fromOption
 */
export const flattenOption = <E>(onNone: () => E) => <S, R, E2, A>(
  eff: Effect<S, R, E2, Op.Option<A>>
): Effect<S, R, E | E2, A> => chain_(eff, (x) => encaseOption(x, onNone));

export const flattenEither = <S, R, E, E2, A>(
  eff: Effect<S, R, E, Ei.Either<E2, A>>
): Effect<S, R, E | E2, A> => chain_(eff, encaseEither);

/**
 * Map the value produced by an IO to the constant b
 * @param io
 * @param b
 */
export function as<S, R, E, A, B>(io: Effect<S, R, E, A>, b: B): Effect<S, R, E, B> {
  return map_(io, F.constant(b));
}

/**
 * Curried form of as
 * @param b
 */
export function to<B>(b: B): <S, R, E, A>(io: Effect<S, R, E, A>) => Effect<S, R, E, B> {
  return (io) => as(io, b);
}

export function chainTap<S, R, E, A>(
  bind: F.FunctionN<[A], Effect<S, R, E, unknown>>
): <S2, R2, E2>(inner: Effect<S2, R2, E2, A>) => Effect<S | S2, R & R2, E | E2, A> {
  return (inner) => chainTap_(inner, bind);
}

const chainTap_ = <S, R, E, A, S2, R2, E2>(
  inner: Effect<S, R, E, A>,
  bind: F.FunctionN<[A], Effect<S2, R2, E2, unknown>>
): Effect<S | S2, R & R2, E | E2, A> => chain_(inner, (a) => as(bind(a), a));

/**
 * Map the value produced by an IO to void
 * @param io
 */
export function asUnit<S, R, E, A>(io: Effect<S, R, E, A>): Effect<S, R, E, void> {
  return as(io, undefined);
}

/**
 * An IO that succeeds immediately with void
 */
export const unit: Sync<void> = pure(undefined);

/**
 * Curriend form of chainError
 * @param f
 */
export function chainError<S, R, E1, E2, A>(
  f: F.FunctionN<[E1], Effect<S, R, E2, A>>
): <S2, A2, R2>(rio: Effect<S2, R2, E1, A2>) => Effect<S | S2, R & R2, E2, A | A2> {
  return (io) => chainError_(io, f);
}

/**
 * Map the error produced by an IO
 * @param f
 */
export function mapError<E1, E2>(
  f: F.FunctionN<[E1], E2>
): <S, R, A>(io: Effect<S, R, E1, A>) => Effect<S, R, E2, A> {
  return (io) => mapLeft_(io, f);
}

function bimap_<S, R, E1, E2, A, B>(
  io: Effect<S, R, E1, A>,
  leftMap: F.FunctionN<[E1], E2>,
  rightMap: F.FunctionN<[A], B>
): Effect<S, R, E2, B> {
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
function zipWith_<S, R, E, A, S2, R2, E2, B, C>(
  first: Effect<S, R, E, A>,
  second: Effect<S2, R2, E2, B>,
  f: F.FunctionN<[A, B], C>
): Effect<S | S2, R & R2, E | E2, C> {
  return chain_(first, (a) => map_(second, (b) => f(a, b)));
}

export function zipWith<S, A, R2, E2, B, C>(
  second: Effect<S, R2, E2, B>,
  f: F.FunctionN<[A, B], C>
): <S2, R, E>(first: Effect<S2, R, E, A>) => Effect<S | S2, R & R2, E | E2, C> {
  return (first) => zipWith_(first, second, f);
}

/**
 * Zip the result of two IOs together into a tuple type
 * @param first
 * @param second
 */
function zip_<S, R, E, A, S2, R2, E2, B>(
  first: Effect<S, R, E, A>,
  second: Effect<S2, R2, E2, B>
): Effect<S | S2, R & R2, E | E2, readonly [A, B]> {
  return zipWith_(first, second, tuple2);
}

export function zip<S2, R2, E2, B>(
  second: Effect<S2, R2, E2, B>
): <S, R, E, A>(first: Effect<S, R, E, A>) => Effect<S | S2, R & R2, E | E2, readonly [A, B]> {
  return (first) => zip_(first, second);
}

/**
 * Evaluate two IOs in sequence and produce the value produced by the first
 * @param first
 * @param second
 */
export function applyFirst<S, R, E, A, S2, R2, E2, B>(
  first: Effect<S, R, E, A>,
  second: Effect<S2, R2, E2, B>
): Effect<S | S2, R & R2, E | E2, A> {
  return zipWith_(first, second, fst);
}

/**
 * Evaluate two IOs in sequence and produce the value produced by the second
 * @param first
 * @param second
 */
export function applySecond<S, R, E, A, S2, R2, E2, B>(
  first: Effect<S, R, E, A>,
  second: Effect<S2, R2, E2, B>
): Effect<S | S2, R & R2, E | E2, B> {
  return zipWith_(first, second, snd);
}

/**
 * Evaluate two IOs in sequence and produce the value of the second.
 * This is suitable for cases where second is recursively defined
 * @param first
 * @param second
 */
export function applySecondL<S, R, E, A, S2, R2, E2, B>(
  first: Effect<S, R, E, A>,
  second: F.Lazy<Effect<S2, R2, E2, B>>
): Effect<S | S2, R & R2, E | E2, B> {
  return chain_(first, second);
}

/**
 * Flipped argument form of ap
 * @param ioa
 * @param iof
 */
export function ap__<S, R, E, A, S2, R2, E2, B>(
  ioa: Effect<S, R, E, A>,
  iof: Effect<S2, R2, E2, F.FunctionN<[A], B>>
): Effect<S | S2, R & R2, E | E2, B> {
  // Find the apply/thrush operator I'm sure exists in fp-ts somewhere
  return zipWith_(ioa, iof, (a, f) => f(a));
}

/**
 * Applicative ap
 * @param iof
 * @param ioa
 */
function ap_<S, R, E, A, B, S2, R2, E2>(
  iof: Effect<S, R, E, F.FunctionN<[A], B>>,
  ioa: Effect<S2, R2, E2, A>
): Effect<S | S2, R & R2, E | E2, B> {
  return zipWith_(iof, ioa, (f, a) => f(a));
}

/**
 * Flip the error and success channels in an IO
 * @param io
 */
export function flip<S, R, E, A>(io: Effect<S, R, E, A>): Effect<S, R, A, E> {
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
export function forever<S, R, E, A>(io: Effect<S, R, E, A>): Effect<S, R, E, never> {
  return chain_(io, () => forever(io));
}

/**
 * Create an IO that traps all exit states of io.
 *
 * Note that interruption will not be caught unless in an uninterruptible region
 * @param io
 */
export function result<S, R, E, A>(io: Effect<S, R, E, A>): Effect<S, R, never, ex.Exit<E, A>> {
  return foldExit_(io, pure, (d) => pure(ex.done(d)));
}

/**
 * Create an interruptible region around the evalution of io
 * @param io
 */
export function interruptible<S, R, E, A>(io: Effect<S, R, E, A>): Effect<S, R, E, A> {
  return interruptibleRegion(io, true);
}

/**
 * Create an uninterruptible region around the evaluation of io
 * @param io
 */
export function uninterruptible<S, R, E, A>(io: Effect<S, R, E, A>): Effect<S, R, E, A> {
  return interruptibleRegion(io, false);
}

/**
 * Create an IO that produces void after ms milliseconds
 * @param ms
 */
export function after(ms: number): Async<void> {
  return chain_(accessRuntime, (runtime) =>
    asyncTotal((callback) => runtime.dispatchLater(callback, undefined, ms))
  );
}

/**
 * The type of a function that can restore outer interruptible state
 */
export type InterruptMaskCutout<S, R, E, A> = F.FunctionN<[Effect<S, R, E, A>], Effect<S, R, E, A>>;

function makeInterruptMaskCutout<S, R, E, A>(state: boolean): InterruptMaskCutout<S, R, E, A> {
  return (inner) => interruptibleRegion(inner, state);
}

/**
 * Create an uninterruptible masked region
 *
 * When the returned IO is evaluated an uninterruptible region will be created and , f will receive an InterruptMaskCutout that can be used to restore the
 * interruptible status of the region above the one currently executing (which is uninterruptible)
 * @param f
 */
export function uninterruptibleMask<S, R, E, A>(
  f: F.FunctionN<[InterruptMaskCutout<S, R, E, A>], Effect<S, R, E, A>>
): Effect<S, R, E, A> {
  return chain_(accessInterruptible, (flag) => {
    const cutout = makeInterruptMaskCutout<S, R, E, A>(flag);
    return uninterruptible(f(cutout));
  });
}

/**
 * Create an interruptible masked region
 *
 * Similar to uninterruptibleMask
 * @param f
 */
export function interruptibleMask<S, R, E, A>(
  f: F.FunctionN<[InterruptMaskCutout<S, R, E, A>], Effect<S, R, E, A>>
): Effect<S, R, E, A> {
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

export function bracketExit<S, R, E, A, B, S2, R2, E2, S3, R3, E3>(
  acquire: Effect<S, R, E, A>,
  release: F.FunctionN<[A, ex.Exit<E | E3, B>], Effect<S2, R2, E2, unknown>>,
  use: F.FunctionN<[A], Effect<S3, R3, E3, B>>
): Effect<S | S2 | S3, R & R2 & R3, E | E2 | E3, B> {
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
export function bracket<S, R, E, A, S2, R2, E2, S3, R3, E3, B>(
  acquire: Effect<S, R, E, A>,
  release: F.FunctionN<[A], Effect<S2, R2, E2, unknown>>,
  use: F.FunctionN<[A], Effect<S3, R3, E3, B>>
): Effect<S | S2 | S3, R & R2 & R3, E | E2 | E3, B> {
  // tslint:disable-next-line: no-unnecessary-callback-wrapper
  return bracketExit(acquire, (e) => release(e), use);
}

/**
 * Guarantee that once ioa begins executing the finalizer will execute.
 * @param ioa
 * @param finalizer
 */
function onComplete_<S, R, E, A, S2, R2, E2>(
  ioa: Effect<S, R, E, A>,
  finalizer: Effect<S2, R2, E2, unknown>
): Effect<S | S2, R & R2, E | E2, A> {
  return uninterruptibleMask((cutout) =>
    chain_(result(cutout(ioa)), (exit) =>
      chain_(result(finalizer), (finalize) => completed(combineFinalizerExit(exit, finalize)))
    )
  );
}

export function onComplete<S2, R2, E2>(finalizer: Effect<S2, R2, E2, unknown>) {
  return <S, R, E, A>(ioa: Effect<S, R, E, A>) => onComplete_(ioa, finalizer);
}

/**
 * Guarantee that once ioa begins executing if it is interrupted finalizer will execute
 * @param ioa
 * @param finalizer
 */
function onInterrupted_<S, R, E, A, S2, R2, E2>(
  ioa: Effect<S, R, E, A>,
  finalizer: Effect<S2, R2, E2, unknown>
): Effect<S | S2, R & R2, E | E2, A> {
  return uninterruptibleMask((cutout) =>
    chain_(result(cutout(ioa)), (exit) =>
      exit._tag === "Interrupt"
        ? chain_(result(finalizer), (finalize) => completed(combineFinalizerExit(exit, finalize)))
        : completed(exit)
    )
  );
}

export function onInterrupted<S2, R2, E2>(finalizer: Effect<S2, R2, E2, unknown>) {
  return <S, R, E, A>(ioa: Effect<S, R, E, A>) => onInterrupted_(ioa, finalizer);
}

export function combineInterruptExit<S, R, E, A, S2, R2, E2>(
  ioa: Effect<S, R, E, A>,
  finalizer: Effect<S2, R2, E2, ex.Interrupt[]>
): Effect<S | S2, R & R2, E | E2, A> {
  return uninterruptibleMask((cutout) =>
    chain_(result(cutout(ioa)), (exit) =>
      exit._tag === "Interrupt"
        ? chain_(result(finalizer), (finalize) => {
            /* istanbul ignore else */
            if (finalize._tag === "Done") {
              const errors = pipe(
                [
                  exit.error,
                  ...(exit.others ? exit.others : []),
                  ...Ar.flatten(finalize.value.map((x) => [x.error, ...(x.others ? x.others : [])]))
                ],
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
export const shifted: Async<void> = uninterruptible(
  chain_(accessRuntime, (runtime) =>
    asyncTotal<void>((callback) => {
      runtime.dispatch(callback, undefined);
      return (cb) => {
        cb();
      };
    })
  )
);

/**
 * Introduce asynchronous gap before io that will allow other fibers to execute (if any are pending)
 * @param io
 */
export function shiftBefore<S, R, E, A>(io: Effect<S, R, E, A>): AsyncRE<R, E, A> {
  return applySecond(shifted, io);
}

/**
 * Introduce asynchronous gap after an io that will allow other fibers to execute (if any are pending)
 * @param io
 */
export function shiftAfter<S, R, E, A>(io: Effect<S, R, E, A>): AsyncRE<R, E, A> {
  return applyFirst(io, shifted);
}

/**
 * Introduce an asynchronous gap that will suspend the runloop and return control to the javascript vm
 */
export const shiftedAsync: Async<void> = uninterruptible(
  chain_(accessRuntime, (runtime) =>
    asyncTotal<void>((callback) => runtime.dispatchLater(callback, undefined, 0))
  )
);

/**
 * Introduce an asynchronous gap before IO
 * @param io
 */
export function shiftAsyncBefore<S, R, E, A>(io: Effect<S, R, E, A>): AsyncRE<R, E, A> {
  return applySecond(shiftedAsync, io);
}

/**
 * Introduce asynchronous gap after an IO
 * @param io
 */
export function shiftAsyncAfter<S, R, E, A>(io: Effect<S, R, E, A>): AsyncRE<R, E, A> {
  return applyFirst(io, shiftedAsync);
}

/**
 * An IO that never produces a value or an error.
 *
 * This IO will however prevent a javascript runtime such as node from exiting by scheduling an interval for 60s
 */
export const never: Async<never> = asyncTotal(() => {
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
 * An IO that produces a void result when res is involed.
 *
 * This IO will however prevent a javascript runtime such as node from exiting by scheduling an interval for 60s
 *
 * Example usage:
 *
 * until((cb) => {
 *    process.on("SIGINT", () => {
 *      cb();
 *    });
 *    process.on("SIGTERM", () => {
 *      cb();
 *    });
 * })
 *
 */
export const until = (f: (res: () => void) => void) =>
  asyncTotal<void>((res) => {
    const handle = setInterval(() => {
      // keep process going
    }, 60000);
    f(() => {
      res(undefined);
      clearInterval(handle);
    });
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
export function delay<S, R, E, A>(inner: Effect<S, R, E, A>, ms: number): AsyncRE<R, E, A> {
  return applySecond(after(ms), inner);
}

/**
 * Curried form of delay
 */
export function liftDelay(ms: number): <S, R, E, A>(io: Effect<S, R, E, A>) => AsyncRE<R, E, A> {
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
  readonly interrupt: Async<ex.Interrupt>;
  /**
   * Await the result of this fiber
   */
  readonly wait: Async<ex.Exit<E, A>>;
  /**
   * Join with this fiber.
   * This is equivalent to fiber.wait.chain(io.completeWith)
   */
  readonly join: AsyncE<E, A>;
  /**
   * Poll for a fiber result
   */
  readonly result: SyncE<E, Op.Option<A>>;
  /**
   * Determine if the fiber is complete
   */
  readonly isComplete: Sync<boolean>;
}

export class FiberImpl<E, A> implements Fiber<E, A> {
  name = Op.fromNullable(this.n);

  sendInterrupt = sync(() => {
    this.driver.interrupt();
  });
  wait = asyncTotal((f: F.FunctionN<[ex.Exit<E, A>], void>) => this.driver.onExit(f));
  interrupt = applySecond(this.sendInterrupt, this.wait as Async<ex.Interrupt>);
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
export function makeFiber<S, R, E, A>(
  init: Effect<S, R, E, A>,
  name?: string
): SyncR<R, Fiber<E, A>> {
  return access((r: R) => {
    const driver = new DriverImpl<E, A>();
    const fiber = new FiberImpl(driver, name);
    driver.start(provide(r)(init));
    return fiber;
  });
}

/**
 * Fork the program described by IO in a separate fiber.
 *
 * This fiber will begin executing once the current fiber releases control of the runloop.
 * If you need to begin the fiber immediately you should use applyFirst(forkIO, shifted)
 * @param io
 * @param name
 */
export function fork<S, R, E, A>(io: Effect<S, R, E, A>, name?: string): SyncR<R, Fiber<E, A>> {
  return makeFiber(io, name);
}

function completeLatched<E1, E2, E3, A, B, C, R>(
  latch: Ref<boolean>,
  channel: Deferred<unknown, R, E3, C>,
  combine: F.FunctionN<[ex.Exit<E1, A>, Fiber<E2, B>], AsyncRE<R, E3, C>>,
  other: Fiber<E2, B>
): F.FunctionN<[ex.Exit<E1, A>], AsyncR<R, void>> {
  return (exit) => {
    const act: Async<AsyncR<R, void>> = latch.modify((flag) =>
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
export function raceFold<S, S2, S3, S4, R, R2, R3, R4, E1, E2, E3, A, B, C>(
  first: Effect<S, R, E1, A>,
  second: Effect<S2, R2, E2, B>,
  onFirstWon: F.FunctionN<[ex.Exit<E1, A>, Fiber<E2, B>], Effect<S3, R3, E3, C>>,
  onSecondWon: F.FunctionN<[ex.Exit<E2, B>, Fiber<E1, A>], Effect<S4, R4, E3, C>>
): AsyncRE<R & R2 & R3 & R4, E3, C> {
  return accessM((r: R & R2) =>
    uninterruptibleMask<unknown, R3 & R4, E3, C>((cutout) =>
      chain_(makeRef<boolean>(false), (latch) =>
        chain_(makeDeferred<unknown, R3 & R4, E3, C>(), (channel) =>
          chain_(fork(provide(r)(first)), (fiber1) =>
            chain_(fork(provide(r)(second)), (fiber2) =>
              chain_(
                fork(chain_(fiber1.wait, completeLatched(latch, channel, onFirstWon, fiber2))),
                () =>
                  chain_(
                    fork(chain_(fiber2.wait, completeLatched(latch, channel, onSecondWon, fiber1))),
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
export function timeoutFold<S, S1, S2, R, R2, R3, E1, E2, A, B>(
  source: Effect<S, R, E1, A>,
  ms: number,
  onTimeout: F.FunctionN<[Fiber<E1, A>], Effect<S1, R2, E2, B>>,
  onCompleted: F.FunctionN<[ex.Exit<E1, A>], Effect<S2, R3, E2, B>>
): AsyncRE<R & R2 & R3, E2, B> {
  return raceFold(
    source,
    after(ms),
    /* istanbul ignore next */
    (exit, delayFiber) => applySecond(delayFiber.interrupt, onCompleted(exit)),
    (_, fiber) => onTimeout(fiber)
  );
}

function interruptLoser<R, E, A>(exit: ex.Exit<E, A>, loser: Fiber<E, A>): AsyncRE<R, E, A> {
  return applySecond(loser.interrupt, completed(exit));
}

/**
 * Return the reuslt of the first IO to complete or error successfully
 * @param io1
 * @param io2
 */
export function raceFirst<S, S2, R, R2, E, A>(
  io1: Effect<S, R, E, A>,
  io2: Effect<S2, R2, E, A>
): AsyncRE<R & R2, E, A> {
  return raceFold(io1, io2, interruptLoser, interruptLoser);
}

function fallbackToLoser<R, E, A>(exit: ex.Exit<E, A>, loser: Fiber<E, A>): AsyncRE<R, E, A> {
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
export function race<S, S2, R, R2, E, A>(
  io1: Effect<S, R, E, A>,
  io2: Effect<S2, R2, E, A>
): AsyncRE<R & R2, E, A> {
  return raceFold(io1, io2, fallbackToLoser, fallbackToLoser);
}

/**
 * Zip the result of 2 ios executed in parallel together with the provided function.
 * @param ioa
 * @param iob
 * @param f
 */
export function parZipWith<S, S2, R, R2, E, E2, A, B, C>(
  ioa: Effect<S, R, E, A>,
  iob: Effect<S2, R2, E2, B>,
  f: F.FunctionN<[A, B], C>
): AsyncRE<R & R2, E | E2, C> {
  return raceFold(
    ioa,
    iob,
    (aExit, bFiber) => zipWith_(completed(aExit), bFiber.join, f),
    (bExit, aFiber) => zipWith_(aFiber.join, completed(bExit), f)
  );
}

/**
 * Tuple the result of 2 ios executed in parallel
 * @param ioa
 * @param iob
 */
export function parZip<S, S2, R, R2, E, A, B>(
  ioa: Effect<S, R, E, A>,
  iob: Effect<S2, R2, E, B>
): AsyncRE<R & R2, E, readonly [A, B]> {
  return parZipWith(ioa, iob, tuple2);
}

/**
 * Execute two ios in parallel and take the result of the first.
 * @param ioa
 * @param iob
 */
export function parApplyFirst<S, S2, R, R2, E, A, B>(
  ioa: Effect<S, R, E, A>,
  iob: Effect<S2, R2, E, B>
): AsyncRE<R & R2, E, A> {
  return parZipWith(ioa, iob, fst);
}

/**
 * Exeute two IOs in parallel and take the result of the second
 * @param ioa
 * @param iob
 */
export function parApplySecond<S, S2, R, R2, E, A, B>(
  ioa: Effect<S, R, E, A>,
  iob: Effect<S2, R2, E, B>
): AsyncRE<R & R2, E, B> {
  return parZipWith(ioa, iob, snd);
}

/**
 * Parallel form of ap
 * @param ioa
 * @param iof
 */
export function parAp<S, S2, R, R2, E, A, B>(
  ioa: Effect<S, R, E, A>,
  iof: Effect<S2, R2, E, F.FunctionN<[A], B>>
): AsyncRE<R & R2, E, B> {
  return parZipWith(ioa, iof, (a, f) => f(a));
}

/**
 * Parallel form of ap_
 * @param iof
 * @param ioa
 */
export function parAp_<S, S2, R, R2, E, E2, A, B>(
  iof: Effect<S, R, E, F.FunctionN<[A], B>>,
  ioa: Effect<S2, R2, E2, A>
): AsyncRE<R & R2, E | E2, B> {
  return parZipWith(iof, ioa, (f, a) => f(a));
}

/**
 * Convert an error into an unchecked error.
 * @param io
 */
export function orAbort<S, R, E, A>(io: Effect<S, R, E, A>): Effect<S, R, never, A> {
  return chainError_(io, raiseAbort);
}

/**
 * Run source for a maximum amount of ms.
 *
 * If it completes succesfully produce a some, if not interrupt it and produce none
 * @param source
 * @param ms
 */
export function timeoutOption<S, R, E, A>(
  source: Effect<S, R, E, A>,
  ms: number
): AsyncRE<R, E, Op.Option<A>> {
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
export function fromPromise<A>(thunk: F.Lazy<Promise<A>>): AsyncE<unknown, A> {
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

export function encaseTask<A>(task: TA.Task<A>): Async<A> {
  return orAbort(fromPromise(task));
}

export function encaseTaskEither<E, A>(taskEither: TE.TaskEither<E, A>): AsyncE<E, A> {
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
): <A>(thunk: F.Lazy<Promise<A>>) => AsyncE<E, A> {
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
  io: AsyncRE<{}, E, A>,
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
export function runSync<E, A>(io: SyncRE<{}, E, A>): ex.Exit<E, A> {
  return pipe(
    new DriverSyncImpl<E, A>().start(io),
    Ei.fold(
      (e) => {
        throw e;
      },
      (e) => e
    )
  );
}

/* istanbul skip next */
export function runUnsafeSync<E, A>(io: SyncRE<{}, E, A>): A {
  const result = runSync(io);

  if (result._tag !== "Done") {
    throw result._tag === "Raise"
      ? result.error
      : result._tag === "Abort"
      ? result.abortedWith
      : result;
  }
  return result.value;
}

/**
 * Run an IO and return a Promise of its result
 *
 * Allows providing an environment parameter directly
 * @param io
 * @param r
 */
export function runToPromise<E, A>(io: AsyncRE<{}, E, A>): Promise<A> {
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
export function runToPromiseExit<E, A>(io: AsyncRE<{}, E, A>): Promise<ex.Exit<E, A>> {
  return new Promise((result) => run(io, result));
}

function chainError_<S, R, E1, S2, R2, E2, A, A2>(
  io: Effect<S, R, E1, A>,
  f: F.FunctionN<[E1], Effect<S2, R2, E2, A2>>
): Effect<S | S2, R & R2, E2, A | A2> {
  return foldExit_(
    io,
    (cause) => (cause._tag === "Raise" ? f(cause.error) : completed(cause)),
    pure
  );
}

export interface EffectMonad
  extends Monad4E<URI>,
    Bifunctor4<URI>,
    MonadThrow4E<URI>,
    Alt4E<URI>,
    Functor4<URI> {
  chainError<S1, S2, R, E1, R2, E2, A, A2>(
    io: Effect<S1, R, E1, A>,
    f: F.FunctionN<[E1], Effect<S2, R2, E2, A2>>
  ): Effect<S1 | S2, R & R2, E2, A | A2>;

  foldExit<S1, S2, S3, R, E1, R2, E2, A1, A2, A3, R3, E3>(
    inner: Effect<S1, R, E1, A1>,
    failure: F.FunctionN<[ex.Cause<E1>], Effect<S2, R2, E2, A2>>,
    success: F.FunctionN<[A1], Effect<S3, R3, E3, A3>>
  ): Effect<S1 | S2 | S3, R & R2 & R3, E2 | E3, A2 | A3>;

  chainTap<S1, S2, R, E, A, R2, E2>(
    inner: Effect<S1, R, E, A>,
    bind: F.FunctionN<[A], Effect<S1, R2, E2, unknown>>
  ): Effect<S1 | S2, R & R2, E | E2, A>;

  mapError: EffectMonad["mapLeft"];

  onInterrupted<S1, S2, R, E, A, R2, E2>(
    ioa: Effect<S1, R, E, A>,
    finalizer: Effect<S2, R2, E2, unknown>
  ): Effect<S1 | S2, R & R2, E | E2, A>;

  onComplete<S1, S2, R, E, A, R2, E2>(
    ioa: Effect<S1, R, E, A>,
    finalizer: Effect<S2, R2, E2, unknown>
  ): Effect<S1 | S2, R & R2, E | E2, A>;

  zip<S, R, E, A, S2, R2, E2, B>(
    first: Effect<S, R, E, A>,
    second: Effect<S2, R2, E2, B>
  ): Effect<S | S2, R & R2, E | E2, readonly [A, B]>;

  zipWith<S, R, E, A, S2, R2, E2, B, C>(
    first: Effect<S, R, E, A>,
    second: Effect<S2, R2, E2, B>,
    f: F.FunctionN<[A, B], C>
  ): Effect<S | S2, R & R2, E | E2, C>;
}

const foldExit_: EffectMonad["foldExit"] = (inner, failure, success) =>
  new ICollapse(inner, failure, success);

const mapLeft_: EffectMonad["mapLeft"] = (io, f) => chainError_(io, F.flow(f, raiseError));

const alt_: EffectMonad["alt"] = chainError_;

export function alt<R2, E2, A>(
  fy: () => AsyncRE<R2, E2, A>
): <R, E, B>(fx: AsyncRE<R, E, B>) => AsyncRE<R & R2, E2, A | B> {
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
  onComplete: onComplete_,
  zip: zip_,
  zipWith: zipWith_
};

export const Do = () => DoG(effect);
export const sequenceS = SS(effect);
export const sequenceT = ST(effect);

export const parEffect: Monad4EP<URI> & MonadThrow4EP<URI> = {
  URI,
  _CTX: "async",
  of: pure,
  map: map_,
  ap: parAp_,
  chain: chain_,
  throwError: raiseError
};

export const parDo = () => DoG(parEffect);
export const parSequenceS = SS(parEffect);
export const parSequenceT = ST(parEffect);

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
} = pipeable(effect);

export { Erase } from "./erase";
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

export function getSemigroup<S, R, E, A>(s: Sem.Semigroup<A>): Sem.Semigroup<Effect<S, R, E, A>> {
  return {
    concat(x: Effect<S, R, E, A>, y: Effect<S, R, E, A>): Effect<S, R, E, A> {
      return zipWith_(x, y, s.concat);
    }
  };
}

export function getMonoid<S, R, E, A>(m: Mon.Monoid<A>): Mon.Monoid<Effect<S, R, E, A>> {
  return {
    ...getSemigroup(m),
    empty: pure(m.empty)
  };
}

/* conditionals */

export function when(
  predicate: boolean
): <S, R, E, A>(ma: Effect<S, R, E, A>) => Effect<S, R, E, Op.Option<A>> {
  return (ma) => (predicate ? map_(ma, Op.some) : pure(Op.none));
}

export function or_(
  predicate: boolean
): <S, R, E, A>(
  ma: Effect<S, R, E, A>
) => <S2, R2, E2, B>(mb: Effect<S2, R2, E2, B>) => Effect<S | S2, R & R2, E | E2, Ei.Either<A, B>> {
  return (ma) => (mb) => (predicate ? map_(ma, Ei.left) : map_(mb, Ei.right));
}

export function or<S, R, E, A>(
  ma: Effect<S, R, E, A>
): <S2, R2, E2, B>(
  mb: Effect<S2, R2, E2, B>
) => (predicate: boolean) => Effect<S | S2, R & R2, E | E2, Ei.Either<A, B>> {
  return (mb) => (predicate) => (predicate ? map_(ma, Ei.left) : map_(mb, Ei.right));
}

export function condWith(
  predicate: boolean
): <S, R, E, A>(
  ma: Effect<S, R, E, A>
) => <S2, R2, E2, B>(mb: Effect<S2, R2, E2, B>) => Effect<S | S2, R & R2, E | E2, A | B> {
  return (ma) => (mb) => (predicate ? ma : mb);
}

export function cond<S, R, E, A>(
  ma: Effect<S, R, E, A>
): <S2, R2, E2, B>(
  mb: Effect<S2, R2, E2, B>
) => (predicate: boolean) => Effect<S | S2, R & R2, E | E2, A | B> {
  return (mb) => (predicate) => (predicate ? ma : mb);
}

export function fromNullableM<S, R, E, A>(ma: Effect<S, R, E, A>): Effect<S, R, E, Op.Option<A>> {
  return map_(ma, Op.fromNullable);
}

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

export function getParValidationM<E>(S: Sem.Semigroup<E>) {
  return getParCauseValidationM(getCauseSemigroup(S));
}

export function getParCauseValidationM<E>(
  S: Sem.Semigroup<ex.Cause<E>>
): Monad4ECP<URI, E> & MonadThrow4ECP<URI, E> & Alt4EC<URI, E> {
  return {
    URI,
    _E: undefined as any,
    _CTX: "async",
    of: pure,
    map: map_,
    chain: chain_,
    ap: <S1, S2, R, R2, A, B>(
      fab: Effect<S1, R, E, (a: A) => B>,
      fa: Effect<S2, R2, E, A>
    ): Effect<unknown, R & R2, E, B> =>
      chain_(parZip(result(fa), result(fab)), ([faEx, fabEx]) =>
        fabEx._tag === "Done"
          ? faEx._tag === "Done"
            ? pure(fabEx.value(faEx.value))
            : raised(faEx)
          : faEx._tag === "Done"
          ? raised(fabEx)
          : raised(S.concat(fabEx, faEx))
      ),
    throwError: raiseError,
    alt: <S1, S2, R, R2, A>(
      fa: Effect<S1, R, E, A>,
      fb: () => Effect<S2, R2, E, A>
    ): Effect<S1 | S2, R & R2, E, A> =>
      foldExit_(fa, (e) => foldExit_(fb(), (fbe) => raised(S.concat(e, fbe)), pure), pure)
  };
}

export function getCauseValidationM<E>(
  S: Sem.Semigroup<ex.Cause<E>>
): Monad4EC<URI, E> & MonadThrow4EC<URI, E> & Alt4EC<URI, E> {
  return {
    URI,
    _E: undefined as any,
    of: pure,
    map: map_,
    chain: chain_,
    ap: <S1, S2, R, R2, A, B>(
      fab: Effect<S1, R, E, (a: A) => B>,
      fa: Effect<S2, R2, E, A>
    ): Effect<S1 | S2, R & R2, E, B> =>
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
    throwError: raiseError,
    alt: <S1, S2, R, R2, A>(
      fa: Effect<S1, R, E, A>,
      fb: () => Effect<S2, R2, E, A>
    ): Effect<S1 | S2, R & R2, E, A> =>
      foldExit_(fa, (e) => foldExit_(fb(), (fbe) => raised(S.concat(e, fbe)), pure), pure)
  };
}

export function effectify<L, R>(
  f: (cb: (e: L | null | undefined, r?: R) => void) => void
): () => AsyncE<L, R>;
export function effectify<A, L, R>(
  f: (a: A, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A) => AsyncE<L, R>;
export function effectify<A, B, L, R>(
  f: (a: A, b: B, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B) => AsyncE<L, R>;
export function effectify<A, B, C, L, R>(
  f: (a: A, b: B, c: C, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C) => AsyncE<L, R>;
export function effectify<A, B, C, D, L, R>(
  f: (a: A, b: B, c: C, d: D, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C, d: D) => AsyncE<L, R>;
export function effectify<A, B, C, D, E, L, R>(
  f: (a: A, b: B, c: C, d: D, e: E, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C, d: D, e: E) => AsyncE<L, R>;
export function effectify<L, R>(f: Function): () => AsyncE<L, R> {
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

export const sequenceOption = Op.option.sequence(effect);

export const traverseOption: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Op.Option<A>) => Effect<S, R, E, Op.Option<B>> = (f) => (ta) =>
  Op.option.traverse(effect)(ta, f);

export const wiltOption: <A, S, R, E, B, C>(
  f: (a: A) => Effect<S, R, E, Ei.Either<B, C>>
) => (wa: Op.Option<A>) => Effect<S, R, E, Separated<Op.Option<B>, Op.Option<C>>> = (f) => (wa) =>
  Op.option.wilt(effect)(wa, f);

export const witherOption: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, Op.Option<B>>
) => (ta: Op.Option<A>) => Effect<S, R, E, Op.Option<B>> = (f) => (ta) =>
  Op.option.wither(effect)(ta, f);

export const sequenceEither = Ei.either.sequence(effect);

export const traverseEither: <A, S, R, FE, B>(
  f: (a: A) => Effect<S, R, FE, B>
) => <TE>(ta: Ei.Either<TE, A>) => Effect<S, R, FE, Ei.Either<TE, B>> = (f) => (ta) =>
  Ei.either.traverse(effect)(ta, f);

export const sequenceTree = TR.tree.sequence(effect);

export const traverseTree: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: TR.Tree<A>) => Effect<S, R, E, TR.Tree<B>> = (f) => (ta) =>
  TR.tree.traverse(effect)(ta, f);

export const sequenceTreePar = TR.tree.sequence(parEffect);

export const traverseTreePar: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: TR.Tree<A>) => AsyncRE<R, E, TR.Tree<B>> = (f) => (ta) =>
  TR.tree.traverse(parEffect)(ta, f);

export const sequenceArray = Ar.array.sequence(effect);

export const traverseArray: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => Effect<S, R, E, Array<B>> = (f) => (ta) => Ar.array.traverse(effect)(ta, f);

export const traverseArrayWithIndex: <A, S, R, E, B>(
  f: (i: number, a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => Effect<S, R, E, Array<B>> = (f) => (ta) =>
  Ar.array.traverseWithIndex(effect)(ta, f);

export const wiltArray: <A, S, R, E, B, C>(
  f: (a: A) => Effect<S, R, E, Ei.Either<B, C>>
) => (wa: Array<A>) => Effect<S, R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  Ar.array.wilt(effect)(wa, f);

export const witherArray: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, Op.Option<B>>
) => (ta: Array<A>) => Effect<S, R, E, Array<B>> = (f) => (ta) => Ar.array.wither(effect)(ta, f);

export const sequenceArrayPar = Ar.array.sequence(parEffect);

export const traverseArrayPar: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) => Ar.array.traverse(parEffect)(ta, f);

export const traverseArrayWithIndexPar: <A, S, R, E, B>(
  f: (i: number, a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) =>
  Ar.array.traverseWithIndex(parEffect)(ta, f);

export const wiltArrayPar: <A, R, E, B, C>(
  f: (a: A) => AsyncRE<R, E, Ei.Either<B, C>>
) => (wa: Array<A>) => AsyncRE<R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  Ar.array.wilt(parEffect)(wa, f);

export const witherArrayPar: <A, R, E, B>(
  f: (a: A) => AsyncRE<R, E, Op.Option<B>>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) => Ar.array.wither(parEffect)(ta, f);

export const sequenceRecord = RE.record.sequence(effect);

export const traverseRecord: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Record<string, A>) => Effect<S, R, E, Record<string, B>> = (f) => (ta) =>
  RE.record.traverse(effect)(ta, f);

export const traverseRecordWithIndex: <A, S, R, E, B>(
  f: (k: string, a: A) => Effect<S, R, E, B>
) => (ta: Record<string, A>) => Effect<S, R, E, Record<string, B>> = (f) => (ta) =>
  RE.record.traverseWithIndex(effect)(ta, f);

export const wiltRecord: <A, S, R, E, B, C>(
  f: (a: A) => Effect<S, R, E, Ei.Either<B, C>>
) => (wa: Record<string, A>) => Effect<S, R, E, Separated<Record<string, B>, Record<string, C>>> = (
  f
) => (wa) => RE.record.wilt(effect)(wa, f);

export const witherRecord: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, Op.Option<B>>
) => (ta: Record<string, A>) => Effect<S, R, E, Record<string, B>> = (f) => (ta) =>
  RE.record.wither(effect)(ta, f);

export const sequenceRecordPar = RE.record.sequence(parEffect);

export const traverseRecordPar: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Record<string, A>) => AsyncRE<R, E, Record<string, B>> = (f) => (ta) =>
  RE.record.traverse(parEffect)(ta, f);

export const traverseRecordWithIndexPar: <A, S, R, E, B>(
  f: (k: string, a: A) => Effect<S, R, E, B>
) => (ta: Record<string, A>) => AsyncRE<R, E, Record<string, B>> = (f) => (ta) =>
  RE.record.traverseWithIndex(parEffect)(ta, f);

export const wiltRecordPar: <A, S, R, E, B, C>(
  f: (a: A) => Effect<S, R, E, Ei.Either<B, C>>
) => (wa: Record<string, A>) => AsyncRE<R, E, Separated<Record<string, B>, Record<string, C>>> = (
  f
) => (wa) => RE.record.wilt(parEffect)(wa, f);

export const witherRecordPar: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, Op.Option<B>>
) => (ta: Record<string, A>) => AsyncRE<R, E, Record<string, B>> = (f) => (ta) =>
  RE.record.wither(parEffect)(ta, f);
