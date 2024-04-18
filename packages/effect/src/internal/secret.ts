import * as Arr from "../Array.js"
import * as Equal from "../Equal.js"
import { pipe } from "../Function.js"
import * as Hash from "../Hash.js"
import { hasProperty } from "../Predicate.js"
import type * as Secret from "../Secret.js"

/** @internal */
const SecretSymbolKey = "effect/Secret"

/** @internal */
export const SecretTypeId: Secret.SecretTypeId = Symbol.for(
  SecretSymbolKey
) as Secret.SecretTypeId

/** @internal */
export const proto = {
  [SecretTypeId]: SecretTypeId,
  [Hash.symbol](this: Secret.Secret): number {
    return pipe(
      Hash.hash(SecretSymbolKey),
      Hash.combine(Hash.array(this.raw)),
      Hash.cached(this)
    )
  },
  [Equal.symbol](this: Secret.Secret, that: unknown): boolean {
    return isSecret(that) && this.raw.length === that.raw.length &&
      this.raw.every((v, i) => Equal.equals(v, that.raw[i]))
  }
}

/** @internal */
export const isSecret = (u: unknown): u is Secret.Secret => hasProperty(u, SecretTypeId)

/** @internal */
export const make = (bytes: Array<number>): Secret.Secret => {
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
  Object.defineProperty(secret, "raw", {
    enumerable: false,
    value: bytes
  })
  return secret
}

/** @internal */
export const fromIterable = (iterable: Iterable<string>): Secret.Secret =>
  make(Arr.fromIterable(iterable).map((char) => char.charCodeAt(0)))

/** @internal */
export const fromString = (text: string): Secret.Secret => {
  return make(text.split("").map((char) => char.charCodeAt(0)))
}

/** @internal */
export const value = (self: Secret.Secret): string => {
  return self.raw.map((byte) => String.fromCharCode(byte)).join("")
}

/** @internal */
export const unsafeWipe = (self: Secret.Secret): void => {
  for (let i = 0; i < self.raw.length; i++) {
    self.raw[i] = 0
  }
}
