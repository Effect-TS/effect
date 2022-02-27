import { LazyValue } from "../../data/LazyValue/definition"
import type { FiberContext } from "../Fiber/_internal/context"
import { FiberId } from "../FiberId/definition"
import type { RuntimeConfig } from "../RuntimeConfig"
import { RuntimeConfigFlag } from "../RuntimeConfig/Flag"

/**
 * A `Scope` represents the scope of a fiber lifetime. The scope of a fiber can
 * be retrieved using `Effect.descriptor`, and when forking fibers, you can
 * specify a custom scope to fork them on by using the `forkIn`.
 *
 * @tsplus type ets/Scope
 */
export type Scope = Global | Local

/**
 * @tsplus type ets/ScopeOps
 */
export interface ScopeOps {}
export const Scope: ScopeOps = {}

export interface CommonScope {
  readonly fiberId: FiberId
  readonly unsafeAdd: (
    runtimeConfig: RuntimeConfig,
    child: FiberContext<any, any>,
    __tsplusTrace?: string
  ) => boolean
}

export class Global implements CommonScope {
  readonly fiberId = FiberId.none

  unsafeAdd(
    runtimeConfig: RuntimeConfig,
    child: FiberContext<any, any>,
    __tsplusTrace?: string | undefined
  ): boolean {
    if (runtimeConfig.value.flags.isEnabled(RuntimeConfigFlag.EnableFiberRoots)) {
      _roots.value.add(child)

      child.unsafeOnDone(() => {
        _roots.value.delete(child)
      })
    }
    return true
  }
}

export class Local implements CommonScope {
  constructor(readonly fiberId: FiberId, readonly parent: FiberContext<any, any>) {}
  unsafeAdd(
    _runtimeConfig: RuntimeConfig,
    child: FiberContext<any, any>,
    __tsplusTrace?: string | undefined
  ): boolean {
    const parent = this.parent
    return parent != null && parent.unsafeAddChild(child)
  }
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * The global scope. Anything forked onto the global scope is not supervised,
 * and will only terminate on its own accord (never from interruption of a
 * parent fiber, because there is no parent fiber).
 *
 * @tsplus static ets/ScopeOps global
 */
export const globalScope = LazyValue.make(() => new Global())

/**
 * Unsafely creats a new `Scope` from a `Fiber`.
 *
 * @tsplus static ets/ScopeOps unsafeMake
 */
export function unsafeMake(fiber: FiberContext<any, any>): Scope {
  return new Local(fiber.fiberId, fiber)
}

/**
 * @tsplus static ets/ScopeOps _roots
 */
export const _roots = LazyValue.make(() => new Set<FiberContext<any, any>>())
