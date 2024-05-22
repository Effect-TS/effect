import * as Equal from "../Equal.js"
import { pipe } from "../Function.js"
import * as Hash from "../Hash.js"
import { pipeArguments } from "../Pipeable.js"
import { hasProperty } from "../Predicate.js"
import type * as Secret from "../Secret.js"

/** @internal */
const SecretSymbolKey = "effect/Secret"

/** @internal */
const secretsRegistry = new WeakMap<Secret.Secret<any>, any>()

/** @internal */
export const SecretTypeId: Secret.SecretTypeId = Symbol.for(
  SecretSymbolKey
) as Secret.SecretTypeId

/** @internal */
export const proto = {
  [SecretTypeId]: {
    _A: (_: never) => _
  },
  pipe() {
    return pipeArguments(this, arguments)
  },
  [Hash.symbol]<T>(this: Secret.Secret<T>): number {
    return pipe(
      Hash.hash(SecretSymbolKey),
      Hash.combine(Hash.hash(secretsRegistry.get(this))),
      Hash.cached(this)
    )
  },
  [Equal.symbol]<T>(this: Secret.Secret<T>, that: unknown): boolean {
    return isSecret(that) && Equal.equals(secretsRegistry.get(this), secretsRegistry.get(that))
  }
}

/** @internal */
export const isSecret = (u: unknown): u is Secret.Secret<unknown> => hasProperty(u, SecretTypeId)

/** @internal */
export const make = <T>(value: T): Secret.Secret<T> => {
  const secret = Object.create(proto)
  Object.defineProperty(secret, "toString", {
    enumerable: false,
    value() {
      return "Secret(<redacted>)"
    }
  })
  Object.defineProperty(secret, "toJSON", {
    enumerable: false,
    value() {
      return "<redacted>"
    }
  })
  secretsRegistry.set(secret, value)
  return secret
}

/** @internal */
export const value = <T>(self: Secret.Secret<T>): T => secretsRegistry.get(self)

/** @internal */
export const unsafeWipe = <T>(self: Secret.Secret<T>): void => {
  secretsRegistry.delete(self)
}
