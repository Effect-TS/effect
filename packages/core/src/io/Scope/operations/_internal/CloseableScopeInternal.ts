import type { LazyArg } from "../../../../data/Function"
import type { UIO } from "../../../Effect"
import type { Exit } from "../../../Exit"
import type { Finalizer, Scope } from "../../definition"
import { CloseableScopeSym, ScopeSym } from "../../definition"

export class CloseableScopeInternal implements Scope.Closeable {
  readonly [ScopeSym]: ScopeSym = ScopeSym;
  readonly [CloseableScopeSym]: CloseableScopeSym = CloseableScopeSym

  constructor(
    readonly _fork: UIO<Scope.Closeable>,
    readonly _addFinalizerExit: (finalizer: Finalizer) => UIO<void>,
    readonly _close: (exit: LazyArg<Exit<unknown, unknown>>) => UIO<void>
  ) {}
}

/**
 * @tsplus macro remove
 */
export function concreteCloseableScope(_: Scope): asserts _ is CloseableScopeInternal {
  //
}
