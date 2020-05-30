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

export const IForkTag = "IFork" as const

export class IFork<S, R, E, A> {
  constructor(
    readonly op: Effect<S, R, E, A>,
    readonly supervised: boolean,
    readonly name?: string
  ) {}

  tag() {
    return IForkTag
  }
}
