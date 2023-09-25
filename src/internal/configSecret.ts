import * as Chunk from "../Chunk"
import type * as ConfigSecret from "../ConfigSecret"
import * as Equal from "../Equal"
import { pipe } from "../Function"
import * as Hash from "../Hash"

/** @internal */
const ConfigSecretSymbolKey = "effect/ConfigSecret"

/** @internal */
export const ConfigSecretTypeId: ConfigSecret.ConfigSecretTypeId = Symbol.for(
  ConfigSecretSymbolKey
) as ConfigSecret.ConfigSecretTypeId

/** @internal */
export const proto = {
  [ConfigSecretTypeId]: ConfigSecretTypeId,
  [Hash.symbol](this: ConfigSecret.ConfigSecret): number {
    return pipe(
      Hash.hash(ConfigSecretSymbolKey),
      Hash.combine(Hash.array(this.raw))
    )
  },
  [Equal.symbol](this: ConfigSecret.ConfigSecret, that: unknown): boolean {
    return isConfigSecret(that) && this.raw.length === that.raw.length &&
      this.raw.every((v, i) => Equal.equals(v, that.raw[i]))
  }
}

/** @internal */
export const isConfigSecret = (u: unknown): u is ConfigSecret.ConfigSecret => {
  return typeof u === "object" && u != null && ConfigSecretTypeId in u
}

/** @internal */
export const make = (bytes: Array<number>): ConfigSecret.ConfigSecret => {
  const secret = Object.create(proto)
  Object.defineProperty(secret, "toString", {
    enumerable: false,
    value() {
      return "ConfigSecret(<redacted>)"
    }
  })
  Object.defineProperty(secret, "raw", {
    enumerable: false,
    value: bytes
  })
  return secret
}

/** @internal */
export const fromChunk = (chunk: Chunk.Chunk<string>): ConfigSecret.ConfigSecret => {
  return make(Chunk.toReadonlyArray(chunk).map((char) => char.charCodeAt(0)))
}

/** @internal */
export const fromString = (text: string): ConfigSecret.ConfigSecret => {
  return make(text.split("").map((char) => char.charCodeAt(0)))
}

/** @internal */
export const value = (self: ConfigSecret.ConfigSecret): string => {
  return self.raw.map((byte) => String.fromCharCode(byte)).join("")
}

/** @internal */
export const unsafeWipe = (self: ConfigSecret.ConfigSecret): void => {
  for (let i = 0; i < self.raw.length; i++) {
    self.raw[i] = 0
  }
}
