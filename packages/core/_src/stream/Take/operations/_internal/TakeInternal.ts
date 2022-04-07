import { _A, _E, TakeSym } from "@effect/core/stream/Take/definition";

export class TakeInternal<E, A> implements Take<E, A> {
  readonly [TakeSym]: TakeSym = TakeSym;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A;

  constructor(readonly _exit: Exit<Option<E>, Chunk<A>>) {}
}

/**
 * @tsplus macro remove
 */
export function concreteTake<E, A>(_: Take<E, A>): asserts _ is TakeInternal<E, A> {
  //
}
