import * as Effect from "effect/Effect"
import { vi } from "vitest"

export type NativeMethod = "importKey" | "exportKey" | "verify" | "digest"

interface NativeGate {
  readonly entered: Effect.Effect<void>
  readonly release: Effect.Effect<void>
  readonly isSettled: () => boolean
}

type Wait = <A>(operation: () => Promise<A>) => Promise<A>

function intercept(method: NativeMethod, wait: Wait): { mockRestore(): void } {
  const subtle = globalThis.crypto.subtle
  switch (method) {
    case "importKey": {
      const original = subtle.importKey.bind(subtle)
      return vi.spyOn(subtle, method).mockImplementationOnce((...args) => wait(() => original(...args)))
    }
    case "exportKey": {
      const original = subtle.exportKey.bind(subtle)
      return vi.spyOn(subtle, method).mockImplementationOnce((...args) => wait(() => original(...args)))
    }
    case "verify": {
      const original = subtle.verify.bind(subtle)
      return vi.spyOn(subtle, method).mockImplementationOnce((...args) => wait(() => original(...args)))
    }
    case "digest": {
      const original = subtle.digest.bind(subtle)
      return vi.spyOn(subtle, method).mockImplementationOnce((...args) => wait(() => original(...args)))
    }
  }
}

// Release native promises before test fibers or owner scopes are joined, even on assertion failure.
export function withNativeGate<A, E, R>(
  method: NativeMethod,
  use: (gate: NativeGate) => Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> {
  return Effect.acquireUseRelease(
    Effect.sync(() => {
      const entered = Promise.withResolvers<void>()
      const released = Promise.withResolvers<void>()
      let settled = false
      let pending = Promise.resolve()
      function markSettled(): void {
        settled = true
      }
      const mock = intercept(method, (operation) => {
        entered.resolve()
        const result = released.promise.then(operation)
        pending = result.then(markSettled, markSettled)
        return result
      })
      return {
        entered: Effect.promise(() => entered.promise),
        release: Effect.sync(() => released.resolve()),
        isSettled: () => settled,
        cleanup: Effect.promise(() => {
          released.resolve()
          return pending
        }).pipe(Effect.ensuring(Effect.sync(() => mock.mockRestore())))
      }
    }),
    use,
    (gate) => gate.cleanup
  )
}
