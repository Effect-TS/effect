import type { UIO } from "../../../Effect"
import type { Finalizer, Scope } from "../../definition"
import { ScopeSym } from "../../definition"

export class ScopeInternal implements Scope {
  readonly [ScopeSym]: ScopeSym = ScopeSym

  constructor(
    readonly _fork: UIO<Scope.Closeable>,
    readonly _addFinalizerExit: (finalizer: Finalizer) => UIO<void>
  ) {}
}

/**
 * @tsplus macro remove
 */
export function concreteScope(_: Scope): asserts _ is ScopeInternal {
  //
}
