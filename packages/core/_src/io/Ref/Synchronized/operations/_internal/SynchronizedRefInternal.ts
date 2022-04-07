import { _A, RefSym } from "@effect/core/io/Ref/definition";
import { SynchronizedRefSym } from "@effect/core/io/Ref/Synchronized/definition";

export class SynchronizedRefInternal<A> implements SynchronizedRef<A> {
  readonly [RefSym]: RefSym = RefSym;
  readonly [SynchronizedRefSym]: SynchronizedRefSym = SynchronizedRefSym;
  readonly [_A]!: () => A;

  constructor(readonly ref: Ref<A>, readonly semaphore: Semaphore) {}
}

/**
 * @tsplus macro remove
 */
export function concreteSynchronizedRef<A>(
  _: SynchronizedRef<A>
): asserts _ is SynchronizedRefInternal<A> {
  //
}
