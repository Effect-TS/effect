import { _A, _E, TDeferredSym } from "@effect/core/stm/TDeferred/definition"

export class InternalTDeferred<E, A> implements TDeferred<E, A> {
  readonly [TDeferredSym]: TDeferredSym = TDeferredSym
  readonly [_E]!: () => E
  readonly [_A]!: () => A
  constructor(readonly ref: TRef<Maybe<Either<E, A>>>) {}
}

/**
 * @tsplus macro remove
 */
export function concreteTDeferred<E, A>(
  _: TDeferred<E, A>
): asserts _ is InternalTDeferred<E, A> {
  //
}
