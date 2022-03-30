import type { Chunk } from "../../../src/collection/immutable/Chunk"
import { Effect } from "../../../src/io/Effect"
import type { Ref } from "../../../src/io/Ref"
import type { HasScope } from "../../../src/io/Scope"

export function resource(
  id: number,
  ref: Ref<Chunk<Action>>
): Effect<HasScope, never, number> {
  return ref
    .update((chunk) => chunk.append(Action.Acquire(id)))
    .as(id)
    .uninterruptible()
    .ensuring(
      Effect.scopeWith((scope) =>
        scope.addFinalizer(ref.update((chunk) => chunk.append(Action.Release(id))))
      )
    )
}

/**
 * @tsplus type ets/Test/Scope/Action
 */
export type Action = Acquire | Use | Release

/**
 * @tsplus type ets/Test/Scope/ActionOps
 */
export interface ActionOps {}
export const Action: ActionOps = {}

export class Acquire {
  readonly _tag = "Acquire"
  constructor(readonly id: number) {}
}

export class Use {
  readonly _tag = "Use"
  constructor(readonly id: number) {}
}

export class Release {
  readonly _tag = "Release"
  constructor(readonly id: number) {}
}

/**
 * @tsplus static ets/Test/Scope/ActionOps Acquire
 */
export function acquire(id: number): Action {
  return new Acquire(id)
}

/**
 * @tsplus static ets/Test/Scope/ActionOps Use
 */
export function use(id: number): Action {
  return new Use(id)
}

/**
 * @tsplus static ets/Test/Scope/ActionOps Release
 */
export function release(id: number): Action {
  return new Release(id)
}
