import * as WebCrypto from "effect/crypto/WebCrypto"
import * as Effect from "effect/Effect"
import { vi } from "vitest"

export type NativeMethod =
  | "importKey"
  | "exportKey"
  | "generateKey"
  | "sign"
  | "verify"
  | "encrypt"
  | "decrypt"
  | "digest"

interface NativeGate {
  readonly entered: Effect.Effect<void>
  readonly release: Effect.Effect<void>
  readonly isSettled: () => boolean
}

type Wait = <A>(operation: () => Promise<A>) => Promise<A>

function intercept(subtle: SubtleCrypto, method: NativeMethod, wait: Wait): { mockRestore(): void } {
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
    case "generateKey": {
      const original = subtle.generateKey.bind(subtle)
      return vi.spyOn(subtle, method).mockImplementationOnce((...args) => wait(() => original(...args)))
    }
    case "sign": {
      const original = subtle.sign.bind(subtle)
      return vi.spyOn(subtle, method).mockImplementationOnce((...args) => wait(() => original(...args)))
    }
    case "encrypt": {
      const original = subtle.encrypt.bind(subtle)
      return vi.spyOn(subtle, method).mockImplementationOnce((...args) => wait(() => original(...args)))
    }
    case "decrypt": {
      const original = subtle.decrypt.bind(subtle)
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
  return Effect.flatMap(WebCrypto.WebCrypto, ({ subtle }) =>
    Effect.acquireUseRelease(
      Effect.sync(() => {
        const entered = Promise.withResolvers<void>()
        const released = Promise.withResolvers<void>()
        let settled = false
        let pending = Promise.resolve()
        function markSettled(): void {
          settled = true
        }
        const mock = intercept(subtle, method, (operation) => {
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
    ))
}
