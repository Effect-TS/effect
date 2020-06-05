import type { Either } from "../../Either"
import type { Cause, Exit } from "../../Exit"
import type { FunctionN, Lazy } from "../../Function"
import type { Option } from "../../Option"
import type { Runtime } from "../Runtime"

import type { AsyncFn } from "./async"
import type { Effect } from "./types"

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
  | IAccessEnv
  | IProvideEnv<any, any, any, any>
  | IMap<any, any, any, any, any>
  | ISupervised<any, any, any, any>

export const IPureTag = "IPure" as const

export class IPure<A> {
  readonly _tag = IPureTag
  constructor(readonly a: A) {}
}

export const IPureOptionTag = "IPureOption" as const

export class IPureOption<E, A> {
  readonly _tag = IPureOptionTag
  constructor(readonly a: Option<A>, readonly onEmpty: () => E) {}
}

export const IPureEitherTag = "IPureEither" as const

export class IPureEither<E, A> {
  readonly _tag = IPureEitherTag
  constructor(readonly a: Either<E, A>) {}
}

export const IRaisedTag = "IRaised" as const

export class IRaised<E> {
  readonly _tag = IRaisedTag
  constructor(readonly e: Cause<E>) {}
}

export const ICompletedTag = "ICompleted" as const

export class ICompleted<E, A> {
  readonly _tag = ICompletedTag
  constructor(readonly e: Exit<E, A>) {}
}

export const ISuspendedTag = "ISuspended" as const

export class ISuspended<S, R, E, A> {
  readonly _tag = ISuspendedTag
  constructor(readonly e: Lazy<Effect<S, R, E, A>>) {}
}

export const IAsyncTag = "IAsync" as const

export class IAsync<E, A> {
  readonly _tag = IAsyncTag
  constructor(readonly e: AsyncFn<E, A>) {}
}

export const IChainTag = "IChain" as const

export class IChain<S, R, E, A, S1, R1, E1, B> {
  readonly _tag = IChainTag
  constructor(
    readonly e: Effect<S, R, E, A>,
    readonly f: (a: A) => Effect<S1, R1, E1, B>
  ) {}
}

export const IMapTag = "IMap" as const

export class IMap<S, R, E, A, B> {
  readonly _tag = IMapTag
  constructor(readonly e: Effect<S, R, E, A>, readonly f: (a: A) => B) {}
}

export const ICollapseTag = "ICollapse" as const

export class ICollapse<S1, S2, S3, R, R2, R3, E1, E2, E3, A1, A2, A3> {
  readonly _tag = ICollapseTag
  constructor(
    readonly inner: Effect<S1, R, E1, A1>,
    readonly failure: FunctionN<[Cause<E1>], Effect<S2, R2, E2, A2>>,
    readonly success: FunctionN<[A1], Effect<S3, R3, E3, A3>>
  ) {}
}

export const IInterruptibleRegionTag = "IInterruptibleRegion" as const

export class IInterruptibleRegion<S, R, E, A> {
  readonly _tag = IInterruptibleRegionTag
  constructor(readonly e: Effect<S, R, E, A>, readonly int: boolean) {}
}

export const IAccessInterruptibleTag = "IAccessInterruptible" as const

export class IAccessInterruptible<A> {
  readonly _tag = IAccessInterruptibleTag
  constructor(readonly f: (_: boolean) => A) {}
}

export const IAccessRuntimeTag = "IAccessRuntime" as const

export class IAccessRuntime<A> {
  readonly _tag = IAccessRuntimeTag
  constructor(readonly f: (_: Runtime) => A) {}
}

export const IProvideEnvTag = "IProvideEnv" as const

export class IProvideEnv<S, R, E, A> {
  readonly _tag = IProvideEnvTag
  constructor(readonly e: Effect<S, R, E, A>, readonly r: R) {}
}

export const ISupervisedTag = "ISupervised" as const

export class ISupervised<S, R, E, A> {
  readonly _tag = ISupervisedTag
  constructor(readonly effect: Effect<S, R, E, A>, readonly name?: string) {}
}

export const IAccessEnvTag = "IAccessEnv" as const

export class IAccessEnv {
  readonly _tag = IAccessEnvTag
}
