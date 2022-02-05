// ets_tracing: off

import "../../../Operator/index.js"

import type * as CK from "../../../Collections/Immutable/Chunk/index.js"
import type * as C from "../Channel/index.js"
import * as U from "./utils.js"

/**
 * Sink is a data type that represent a channel that reads elements
 * of type `In`, handles input errors of type `InErr`, emits errors
 * of type `OutErr`, emits outputs of type `L` and ends with a value
 * of type `Z`.
 */
export class Sink<R, InErr, In, OutErr, L, Z> {
  readonly [U._R]: (_: R) => void;
  readonly [U._InErr]: (_: InErr) => void;
  readonly [U._In]: (_: In) => void;
  readonly [U._OutErr]: () => OutErr;
  readonly [U._L]: () => L;
  readonly [U._Z]: () => Z

  constructor(
    readonly channel: C.Channel<R, InErr, CK.Chunk<In>, unknown, OutErr, CK.Chunk<L>, Z>
  ) {}
}
