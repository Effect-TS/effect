import { _A, RefSym } from "@effect/core/io/Ref/definition";

export class RefInternal<A> implements Ref<A> {
  readonly [RefSym]: RefSym = RefSym;
  readonly [_A]!: () => A;

  constructor(readonly value: AtomicReference<A>) {}
}

/**
 * @tsplus macro remove
 */
export function concreteRef<A>(_: Ref<A>): asserts _ is RefInternal<A> {
  //
}
