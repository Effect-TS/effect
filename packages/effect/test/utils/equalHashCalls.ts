import { assert } from "@effect/vitest"
import { Equal, Hash } from "effect"

/**
 * Runs `operations` with colliding keys and asserts no `Equal` or `Hash` calls
 * happen after `operations` returns.
 */
export const assertNoDeferredEqualHashCalls = async (
  operations: (key: (id: string) => Equal.Equal) => void
): Promise<void> => {
  let calls = 0

  class Key implements Equal.Equal {
    constructor(readonly id: string) {}

    [Hash.symbol](): number {
      calls++
      return 0
    }

    [Equal.symbol](that: unknown): boolean {
      calls++
      return that instanceof Key && this.id === that.id
    }
  }

  operations((id) => new Key(id))
  const callsDuringOperations = calls

  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.strictEqual(calls, callsDuringOperations)
}
