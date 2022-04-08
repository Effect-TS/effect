import { _A, _E, TakeSym } from "@effect/core/stream/Take/definition";

export class TakeInternal<E, A> implements Take<E, A> {
  readonly [TakeSym]: TakeSym = TakeSym;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A;

  constructor(readonly _exit: Exit<Option<E>, Chunk<A>>) {}

  [Hash.sym](): number {
    return this._exit[Hash.sym]();
  }

  [Equals.sym](u: unknown): boolean {
    if (isTake(u)) {
      concreteTake(u);
      return u._exit == this._exit;
    }
    return false;
  }
}

/**
 * @tsplus static ets/Take/Ops isTake
 */
export function isTake(u: unknown): u is Take<unknown, unknown> {
  return typeof u === "object" && u != null && TakeSym in u;
}

/**
 * @tsplus macro remove
 */
export function concreteTake<E, A>(_: Take<E, A>): asserts _ is TakeInternal<E, A> {
  //
}
