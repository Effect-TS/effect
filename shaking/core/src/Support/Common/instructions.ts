import { Either, right } from "fp-ts/lib/Either"
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray"
import { Option, some } from "fp-ts/lib/Option"
import { Lazy, FunctionN, identity } from "fp-ts/lib/function"

import { Cause, Exit, interrupt, raise, abort, done } from "../../Exit"
import { Runtime } from "../Runtime"

import { AsyncFn, AsyncCancelContFn } from "./async"
import { Sync, AsyncE, Async, SyncE, SyncR, Provider } from "./effect"
import { Effect } from "./types"

export type Instructions =
  | IPure<any>
  | IPureOption<any, any>
  | IPureEither<any, any>
  | IRaised<any>
  | ICompleted<any, any>
  | ISuspended<any, any, any, any>
  | IAsync<any, any>
  | IChain<any, any, any, any, any, any, any, any>
  | ICollapse<any, any, any, any, any, any, any, any, any, any, any, any>
  | IInterruptibleRegion<any, any, any, any>
  | IAccessInterruptible<any>
  | IAccessRuntime<any>
  | IAccessEnv<any>
  | IProvideEnv<any, any, any, any>
  | IMap<any, any, any, any, any>

export const IPureTag = "IPure" as const

export class IPure<A> {
  constructor(readonly a: A) {}

  tag() {
    return IPureTag
  }
}

export const IPureOptionTag = "IPureOption" as const

export class IPureOption<E, A> {
  constructor(readonly a: Option<A>, readonly onEmpty: () => E) {}

  tag() {
    return IPureOptionTag
  }
}

export const IPureEitherTag = "IPureEither" as const

export class IPureEither<E, A> {
  constructor(readonly a: Either<E, A>) {}

  tag() {
    return IPureEitherTag
  }
}

export const IRaisedTag = "IRaised" as const

export class IRaised<E> {
  constructor(readonly e: Cause<E>) {}

  tag() {
    return IRaisedTag
  }
}

export const ICompletedTag = "ICompleted" as const

export class ICompleted<E, A> {
  constructor(readonly e: Exit<E, A>) {}

  tag() {
    return ICompletedTag
  }
}

export const ISuspendedTag = "ISuspended" as const

export class ISuspended<S, R, E, A> {
  constructor(readonly e: Lazy<Effect<S, R, E, A>>) {}

  tag() {
    return ISuspendedTag
  }
}

export const IAsyncTag = "IAsync" as const

export class IAsync<E, A> {
  constructor(readonly e: AsyncFn<E, A>) {}

  tag() {
    return IAsyncTag
  }
}

export const IChainTag = "IChain" as const

export class IChain<S, R, E, A, S1, R1, E1, B> {
  constructor(
    readonly e: Effect<S, R, E, A>,
    readonly f: (a: A) => Effect<S1, R1, E1, B>
  ) {}

  tag() {
    return IChainTag
  }
}

export const IMapTag = "IMap" as const

export class IMap<S, R, E, A, B> {
  constructor(readonly e: Effect<S, R, E, A>, readonly f: (a: A) => B) {}

  tag() {
    return IMapTag
  }
}

export const ICollapseTag = "ICollapse" as const

export class ICollapse<S1, S2, S3, R, R2, R3, E1, E2, E3, A1, A2, A3> {
  constructor(
    readonly inner: Effect<S1, R, E1, A1>,
    readonly failure: FunctionN<[Cause<E1>], Effect<S2, R2, E2, A2>>,
    readonly success: FunctionN<[A1], Effect<S3, R3, E3, A3>>
  ) {}

  tag() {
    return ICollapseTag
  }
}

export const IInterruptibleRegionTag = "IInterruptibleRegion" as const

export class IInterruptibleRegion<S, R, E, A> {
  constructor(readonly e: Effect<S, R, E, A>, readonly int: boolean) {}

  tag() {
    return IInterruptibleRegionTag
  }
}

export const IAccessInterruptibleTag = "IAccessInterruptible" as const

export class IAccessInterruptible<A> {
  constructor(readonly f: (_: boolean) => A) {}

  tag() {
    return IAccessInterruptibleTag
  }
}

export const IAccessRuntimeTag = "IAccessRuntime" as const

export class IAccessRuntime<A> {
  constructor(readonly f: (_: Runtime) => A) {}

  tag() {
    return IAccessRuntimeTag
  }
}

export const IProvideEnvTag = "IProvideEnv" as const

export class IProvideEnv<S, R, E, A> {
  constructor(readonly e: Effect<S, R, E, A>, readonly r: R) {}

  tag() {
    return IProvideEnvTag
  }
}

export const IAccessEnvTag = "IAccessEnv" as const

export class IAccessEnv<R> {
  tag() {
    return IAccessEnvTag
  }
}

export function suspended<S, R, E, A>(
  thunk: Lazy<Effect<S, R, E, A>>
): Effect<S, R, E, A> {
  return new ISuspended(thunk) as any
}

export function pure<A>(a: A): Sync<A> {
  return new IPure(a) as any
}

export function sync<A>(thunk: Lazy<A>): Sync<A> {
  return suspended(() => pure(thunk()))
}

export function async<E, A>(op: AsyncFn<E, A>): AsyncE<E, A> {
  return new IAsync(op) as any
}

export function asyncTotal<A>(
  op: FunctionN<[FunctionN<[A], void>], AsyncCancelContFn>
): Async<A> {
  return async((callback) => op((a) => callback(right(a))))
}

export function chain<S, R, E, A, S2, R2, E2, B>(
  inner: Effect<S, R, E, A>,
  bind: FunctionN<[A], Effect<S2, R2, E2, B>>
): Effect<S | S2, R & R2, E | E2, B> {
  return (((inner as any) as Instructions).tag() === IPureTag
    ? bind(((inner as any) as IPure<A>).a)
    : new IChain(inner, bind)) as any
}

export const flatten: <S1, S2, R, E, R2, E2, A>(
  mma: Effect<S1, R, E, Effect<S2, R2, E2, A>>
) => Effect<S1 | S2, R & R2, E | E2, A> = (mma) => chain(mma, identity)

export function raised<E, A = never>(e: Cause<E>): SyncE<E, A> {
  return new IRaised(e) as any
}

export const raiseInterrupt: Sync<never> = raised(interrupt)

export function raiseError<E>(e: E): SyncE<E, never> {
  return raised(raise(e))
}

export function raiseAbort(u: unknown): Sync<never> {
  return raised(abort(u))
}

export function foldExit<S1, S2, S3, R, E1, R2, E2, A1, A2, A3, R3, E3>(
  inner: Effect<S1, R, E1, A1>,
  failure: FunctionN<[Cause<E1>], Effect<S2, R2, E2, A2>>,
  success: FunctionN<[A1], Effect<S3, R3, E3, A3>>
): Effect<S1 | S2 | S3, R & R2 & R3, E2 | E3, A2 | A3> {
  return new ICollapse(inner, failure, success) as any
}

export function result<S, R, E, A>(
  io: Effect<S, R, E, A>
): Effect<S, R, never, Exit<E, A>> {
  return foldExit(io, pure, (d) => pure(done(d)))
}

export function accessEnvironment<R>(): SyncR<R, R> {
  return new IAccessEnv() as any
}

export function accessM<S, R, R2, E, A>(
  f: FunctionN<[R], Effect<S, R2, E, A>>
): Effect<S, R & R2, E, A> {
  return chain(accessEnvironment<R>(), f)
}

const provideR = <R2, R>(f: (r2: R2) => R) => <S, E, A>(
  ma: Effect<S, R, E, A>
): Effect<S, R2, E, A> => accessM((r2: R2) => new IProvideEnv(ma, f(r2)) as any)

export function provide<R>(
  r: R,
  inverted: "regular" | "inverted" = "regular"
): Provider<unknown, R, never> {
  return <S, R2, E, A>(eff: Effect<S, R2 & R, E, A>): Effect<S, R2, E, A> =>
    provideR((r2: R2) => (inverted === "inverted" ? { ...r, ...r2 } : { ...r2, ...r }))(
      eff
    )
}

export type InterruptMaskCutout<S, R, E, A> = FunctionN<
  [Effect<S, R, E, A>],
  Effect<S, R, E, A>
>

export const accessInterruptible: Sync<boolean> = new IAccessInterruptible(
  identity
) as any

export function interruptibleRegion<S, R, E, A>(
  inner: Effect<S, R, E, A>,
  flag: boolean
): Effect<S, R, E, A> {
  return new IInterruptibleRegion(inner, flag) as any
}

function makeInterruptMaskCutout<S, R, E, A>(
  state: boolean
): InterruptMaskCutout<S, R, E, A> {
  return (inner) => interruptibleRegion(inner, state)
}

export function uninterruptible<S, R, E, A>(
  io: Effect<S, R, E, A>
): Effect<S, R, E, A> {
  return interruptibleRegion(io, false)
}

export function uninterruptibleMask<S, R, E, A>(
  f: FunctionN<[InterruptMaskCutout<S, R, E, A>], Effect<S, R, E, A>>
): Effect<S, R, E, A> {
  return chain(accessInterruptible, (flag) => {
    const cutout = makeInterruptMaskCutout<S, R, E, A>(flag)
    return uninterruptible(f(cutout))
  })
}

export function combineFinalizerExit<E, A>(
  fiberExit: Exit<E, A>,
  releaseExit: Exit<E, unknown>
): Exit<E, A> {
  if (fiberExit._tag === "Done" && releaseExit._tag === "Done") {
    return fiberExit
  } else if (fiberExit._tag === "Done") {
    return releaseExit as Cause<E>
  } else if (releaseExit._tag === "Done") {
    return fiberExit
  } else {
    return {
      ...fiberExit,
      remaining: some(
        fiberExit.remaining._tag === "Some"
          ? ([...fiberExit.remaining.value, releaseExit] as NonEmptyArray<Cause<any>>)
          : ([releaseExit] as NonEmptyArray<Cause<any>>)
      )
    }
  }
}

export function completed<E = never, A = never>(exit: Exit<E, A>): SyncE<E, A> {
  return new ICompleted(exit) as any
}

export function onInterrupted<S, R, E, A, S2, R2, E2>(
  ioa: Effect<S, R, E, A>,
  finalizer: Effect<S2, R2, E2, unknown>
): Effect<S | S2, R & R2, E | E2, A> {
  return uninterruptibleMask((cutout) =>
    chain(result(cutout(ioa)), (exit) =>
      exit._tag === "Interrupt"
        ? chain(result(finalizer), (finalize) =>
            completed(combineFinalizerExit(exit, finalize))
          )
        : completed(exit)
    )
  )
}

export function map<S, R, E, A, B>(
  base: Effect<S, R, E, A>,
  f: FunctionN<[A], B>
): Effect<S, R, E, B> {
  return (((base as any) as Instructions).tag() === IPureTag
    ? new IPure(f(((base as any) as IPure<A>).a))
    : new IMap(base, f)) as any
}

export function access<R, A>(f: FunctionN<[R], A>): SyncR<R, A> {
  return map(accessEnvironment<R>(), f)
}
