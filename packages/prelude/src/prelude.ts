import { Do as DoG } from "fp-ts-contrib/lib/Do";
import { FunctionN, Lazy } from "fp-ts/lib/function";
import * as P from "fp-ts/lib/pipeable";
import { eff as EFF, effect as EFF_, exit as EX } from "@matechs/effect";
import { Provider } from "./providing";
import { RT, Do4CE } from "./manipulations";
import { Sync, AsyncE } from "./definitions";

/* istanbul ignore file */

/**
 * Represent an Exit status, Abort | Interrupt | Done<A> | Raise<E>
 */
export type Exit<E, A> = EX.Exit<E, A>;

/**
 * Handling Exit status, isDone / isRaise / fold, etc.
 */
export const Exit = {
  ...EX
};

/**
 * Pure value
 */
export const pure: <A>(a: A) => Sync<A> = EFF.pure;

/**
 * Async effect
 */
export const async: <E, A>(op: EFF_.AsyncFn<E, A>) => AsyncE<E, A> = EFF.async;

/**
 * Chain effects
 */
export const chain: <S1, R, E, A, B>(
  f: (a: A) => EFF.Eff<S1, R, E, B>
) => <S2, R2, E2>(ma: EFF.Eff<S2, R2, E2, A>) => RT<EFF.RT<S1 | S2, R & R2, E | E2, B>> =
  EFF.chain as any;

/**
 * Access environment
 */
export const access: <R, A, E = never>(f: FunctionN<[R], A>) => RT<EFF.SyncEff<R, E, A>> =
  EFF.access as any;

/**
 * Access environment effectfully
 */
export const accessM: <S, R, R2, E, A>(
  f: FunctionN<[R], EFF.Eff<S, R2, E, A>>
) => RT<EFF.RT<S, R & R2, E, A>> = EFF.accessM as any;

/**
 * Raise an error
 */
export const raiseError: <E, A = never>(e: E) => RT<EFF.SyncEff<unknown, E, A>> =
  EFF.raiseError as any;

/**
 * Provide environment via spread operator {...old, ...new}
 */
export const provideS: <R>(r: R) => Provider<unknown, R, never, never> = EFF.provideS as any;

/**
 * Provide environment via spread operator inverted {...new, ...old}
 * Note: use this in higher order providers to allow the default environments to be overwritten by function providing at the function level
 */
export const provideSO: <R>(r: R) => Provider<unknown, R, never, never> = EFF.provideSO as any;

/**
 * Provide environment via spread operator using an effectful resource as a dependency
 */
export const provideSW: <M>() => <S1, R, E, A>(
  res: EFF.Eff<S1, R, E, A>
) => (f: (a: A) => M) => Provider<R, M, S1, E> = EFF.provideSW as any;

/**
 * Run effect as a never failing promise
 */
export const run: <S, E, A>(io: EFF.Eff<S, {}, E, A>) => Promise<Exit<E, A>> = EFF.runToPromiseExit;

/**
 * Run effect syncroniously returning the exit state
 */
export const runSync: <E, A>(io: EFF.SyncEff<{}, E, A>) => Exit<E, A> = EFF.runSync;

/**
 * Run effect syncroniously returning the result or throwing
 */
export const runSyncThrowable: <E, A>(io: EFF.SyncEff<{}, E, A>) => A = EFF.runUnsafeSync;

/**
 * Run effect as a failing promise
 */
export const runToPromise: <S, E, A>(io: EFF.Eff<S, {}, E, A>) => Promise<A> = EFF.runToPromise;

/**
 * Run effect as a callback, return cancel invoker
 */
export const runToCallback: <S, E, A>(
  io: EFF.Eff<S, {}, E, A>,
  callback?: FunctionN<[EX.Exit<E, A>], void> | undefined
) => Lazy<void> = EFF.run;

/**
 * Pipe functions a -> f(a) -> g(f(a)) -> h(g(f(a))) => pipe(a, f, g, h)
 */
export const pipe = P.pipe;

/**
 * Do:
 * - do (do an effect)
 * - doL (do an effect consuming the current state)
 * - bind (put the result of an effect into the state)
 * - bindL (put the result of an effect into the state consuming the current state)
 * - let (assign a variable)
 * - letL (assign a variable consuming the current state)
 * - sequenceS (like bind for multiple effects { a: effA, b: effB } )
 * - sequenceSL (like sequenceS consuming the current state)
 * - done (return the current state)
 * - return (return the current state & map the output)
 */
export const Do: Do4CE<"matechs/Eff", never, {}, unknown, never> = DoG(EFF.eff) as any;
