import { _A, THubSym } from "@effect/core/stm/THub/definition"
import type { HashSet } from "@fp-ts/data/HashSet"

/** @internal */
export class InternalTHub<A> implements THub<A> {
  readonly [THubSym]: THubSym = THubSym
  readonly [_A]!: () => A

  constructor(
    readonly hubSize: TRef<number>,
    readonly publisherHead: TRef<TRef<THub.Node<A>>>,
    readonly publisherTail: TRef<TRef<THub.Node<A>>>,
    readonly requestedCapacity: number,
    readonly strategy: THub.Strategy,
    readonly subscriberCount: TRef<number>,
    readonly subscribers: TRef<HashSet<TRef<TRef<THub.Node<A>>>>>
  ) {}
}

/**
 * @tsplus macro remove
 * @internal
 */
export function concreteTHub<A>(
  _: THub<A>
): asserts _ is InternalTHub<A> {
  //
}
