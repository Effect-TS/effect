import { _A, _E, TakeSym } from "@effect/core/stream/Take/definition"
import type { Chunk } from "@fp-ts/data/Chunk"
import * as Equal from "@fp-ts/data/Equal"
import type { Option } from "@fp-ts/data/Option"

/** @internal */
export class TakeInternal<E, A> implements Take<E, A> {
  readonly [TakeSym]: TakeSym = TakeSym
  readonly [_E]!: () => E
  readonly [_A]!: () => A

  constructor(readonly _exit: Exit<Option<E>, Chunk<A>>) {}

  [Equal.symbolHash](): number {
    return Equal.hash(this._exit)
  }

  [Equal.symbolEqual](u: unknown): boolean {
    if (isTake(u)) {
      concreteTake(u)
      return Equal.equals(u._exit, this._exit)
    }
    return false
  }
}

/**
 * @tsplus static effect/core/stream/Take.Ops isTake
 * @category refinements
 * @since 1.0.0
 */
export function isTake(u: unknown): u is Take<unknown, unknown> {
  return typeof u === "object" && u != null && TakeSym in u
}

/**
 * @tsplus macro remove
 * @internal
 */
export function concreteTake<E, A>(_: Take<E, A>): asserts _ is TakeInternal<E, A> {
  //
}
