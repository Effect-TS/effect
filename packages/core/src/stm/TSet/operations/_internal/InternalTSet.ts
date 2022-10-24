import { _A, TSetSym } from "@effect/core/stm/TSet/definition"

/** @internal */
export class InternalTSet<A> implements TSet<A> {
  readonly [TSetSym]: TSetSym = TSetSym
  readonly [_A]!: () => A
  constructor(readonly tmap: TMap<A, void>) {}
}

/**
 * @tsplus macro remove
 * @internal
 */
export function concreteTSet<A>(
  _: TSet<A>
): asserts _ is InternalTSet<A> {
  //
}
