import { _A, _E, TDeferredSym } from "@effect/core/stm/TDeferred/definition"
import type { Either } from "@fp-ts/data/Either"
import type { Option } from "@fp-ts/data/Option"

/** @internal */
export class InternalTDeferred<E, A> implements TDeferred<E, A> {
  readonly [TDeferredSym]: TDeferredSym = TDeferredSym
  readonly [_E]!: () => E
  readonly [_A]!: () => A
  constructor(readonly ref: TRef<Option<Either<E, A>>>) {}
}

/**
 * @tsplus macro remove
 * @internal
 */
export function concreteTDeferred<E, A>(
  _: TDeferred<E, A>
): asserts _ is InternalTDeferred<E, A> {
  //
}
