import { _A } from "@effect/core/stm/THub/definition"
import { TDequeueSym } from "@effect/core/stm/THub/definition/TDequeue"
import type { HashSet } from "@fp-ts/data/HashSet"

/** @internal */
export class InternalTDequeue<A> implements THub.TDequeue<A> {
  readonly [TDequeueSym]: TDequeueSym = TDequeueSym
  readonly [_A]!: () => A

  constructor(
    readonly hubSize: TRef<number>,
    readonly publisherHead: TRef<TRef<THub.Node<A>>>,
    readonly requestedCapacity: number,
    readonly subscriberHead: TRef<TRef<THub.Node<A>>>,
    readonly subscriberCount: TRef<number>,
    readonly subscribers: TRef<HashSet<TRef<TRef<THub.Node<A>>>>>
  ) {}
}

/**
 * @tsplus macro remove
 * @internal
 */
export function concreteTDequeue<A>(
  _: THub.TDequeue<A>
): asserts _ is InternalTDequeue<A> {
  //
}
