import { assert } from "@effect/vitest"
import { Equal, Hash } from "effect"

/**
 * Runs `operations` with keys that all share one hash, so that lookups have to
 * compare them, and then checks that neither protocol is called once the
 * operations have returned.
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
  assert.isAbove(callsDuringOperations, 0)

  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.strictEqual(calls, callsDuringOperations)
}
