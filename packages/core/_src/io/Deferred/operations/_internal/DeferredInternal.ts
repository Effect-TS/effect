import { _A, _E, DeferredSym } from "@effect-ts/core/io/Deferred/definition";
import type { DeferredState } from "@effect-ts/core/io/Deferred/operations/_internal/DeferredState";

export class DeferredInternal<E, A> implements Deferred<E, A> {
  readonly [DeferredSym]: DeferredSym = DeferredSym;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A;
  constructor(
    readonly state: AtomicReference<DeferredState<E, A>>,
    readonly blockingOn: FiberId
  ) {}
}

/**
 * @tsplus macro remove
 */
export function concreteDeferred<E, A>(_: Deferred<E, A>): asserts _ is DeferredInternal<E, A> {
  //
}
