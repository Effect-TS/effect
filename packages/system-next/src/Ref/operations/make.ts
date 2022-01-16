// ets_tracing: off

import { AtomicReference } from "../../Support/AtomicReference"
import { Atomic } from "../Atomic"
import type { Ref } from "../definition"
import * as T from "./_internal/effect"

/**
 * Creates a new `ZRef` with the specified value.
 */
export function make<A>(value: A): T.UIO<Ref<A>> {
  return T.succeed(() => unsafeMake(value))
}

export function unsafeMake<A>(value: A): Atomic<A> {
  return new Atomic(new AtomicReference(value))
}
