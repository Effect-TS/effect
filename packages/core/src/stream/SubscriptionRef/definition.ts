import type { XSynchronized } from "../../io/Ref/Synchronized"
import type { Stream } from "../Stream"

export const SubscriptionRefSym = Symbol.for("@effect-ts/core/stream/SubscriptionRef")
export type SubscriptionRefSym = typeof SubscriptionRefSym

/**
 * A `SubscriptionRef<A>` contains a `Ref.Synchronized` with a value of type `A`
 * and a `Stream` that can be subscribed to in order to receive the current
 * value as well as all changes to the value.
 *
 * @tsplus type ets/SubscriptionRef
 * @tsplus companion ets/SubscriptionRefOps
 */
export class SubscriptionRef<A> {
  readonly [SubscriptionRefSym]: SubscriptionRefSym = SubscriptionRefSym
  constructor(
    public ref: XSynchronized<unknown, unknown, never, never, A, A>,
    public changes: Stream<unknown, never, A>
  ) {}
}
