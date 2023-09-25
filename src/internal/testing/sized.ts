import * as Context from "../../Context"
import type * as Effect from "../../Effect"
import type * as FiberRef from "../../FiberRef"
import * as core from "../../internal/core"

/** @internal */
export const SizedTypeId = Symbol.for("@effect/test/Sized")

/** @internal */
export type SizedTypeId = typeof SizedTypeId

/** @internal */
export interface Sized {
  readonly [SizedTypeId]: SizedTypeId
  /** @internal */
  readonly fiberRef: FiberRef.FiberRef<number>
  size(): Effect.Effect<never, never, number>
  withSize(size: number): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
}

/** @internal */
export const Sized: Context.Tag<Sized, Sized> = Context.Tag(SizedTypeId)

/** @internal */
class SizedImpl implements Sized {
  readonly [SizedTypeId]: SizedTypeId = SizedTypeId
  constructor(readonly fiberRef: FiberRef.FiberRef<number>) {}
  size(): Effect.Effect<never, never, number> {
    return core.fiberRefGet(this.fiberRef)
  }
  withSize(size: number) {
    return <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
      core.fiberRefLocally(this.fiberRef, size)(effect)
  }
}

/** @internal */
export const make = (size: number): Sized => new SizedImpl(core.fiberRefUnsafeMake(size))

/** @internal */
export const fromFiberRef = (fiberRef: FiberRef.FiberRef<number>): Sized => new SizedImpl(fiberRef)
