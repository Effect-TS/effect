import * as Schema from "effect/Schema"

export const Algorithm = Schema.Literals([
  "ECDSA-P256-SHA256",
  "RSASSA-PKCS1-v1_5-SHA256",
  "RSA-PSS-SHA256",
  "Ed25519"
])

export type Algorithm = typeof Algorithm.Type

const coordinate = Schema.Uint8Array.check(Schema.isMinLength(32), Schema.isMaxLength(32))
const integer = Schema.Uint8Array.check(Schema.isMinLength(1), Schema.isMaxLength(1024))
const ec = { algorithm: Schema.Literal("ECDSA-P256-SHA256"), x: coordinate, y: coordinate }
const ed = { algorithm: Schema.Literal("Ed25519"), x: coordinate }

const rsa = {
  algorithm: Schema.Literals(["RSASSA-PKCS1-v1_5-SHA256", "RSA-PSS-SHA256"]),
  n: integer,
  e: integer
}

/**
 * Unsigned big-endian components: 32-byte curve values and RSA components up to
 * 1024 bytes. Native import validates the actual key, including RSA's minimum.
 */
export const PublicKeyParameters = Schema.Union([
  Schema.Struct(ec),
  Schema.Struct(ed),
  Schema.Struct(rsa)
])

export type PublicKeyParameters = typeof PublicKeyParameters.Type

export const PrivateKeyParameters = Schema.Union([
  Schema.Struct({ ...ec, d: coordinate }),
  Schema.Struct({ ...ed, d: coordinate }),
  Schema.Struct({
    ...rsa,
    d: integer,
    p: integer,
    q: integer,
    dp: integer,
    dq: integer,
    qi: integer
  })
])

export type PrivateKeyParameters = typeof PrivateKeyParameters.Type

export const RsaModulusLength = Schema.Literals([2048, 3072, 4096])

/** RSA defaults to 2048 bits and exponent 65537; curves are fixed by algorithm. */
export const GenerateKeyPairInput = Schema.Union([
  Schema.Struct({ algorithm: Schema.Literals(["ECDSA-P256-SHA256", "Ed25519"]) }),
  Schema.Struct({
    algorithm: Schema.Literals(["RSASSA-PKCS1-v1_5-SHA256", "RSA-PSS-SHA256"]),
    modulusLength: Schema.optionalKey(RsaModulusLength)
  })
])

export type GenerateKeyPairInput = typeof GenerateKeyPairInput.Type

export const KeyPairParameters = Schema.Struct({
  publicKey: PublicKeyParameters,
  privateKey: Schema.Redacted(PrivateKeyParameters, { disallowJsonEncode: true })
})

export type KeyPairParameters = typeof KeyPairParameters.Type

export const PrivateKeyInput = Schema.Struct({
  algorithm: Algorithm,
  privateKey: Schema.Redacted(Schema.Uint8Array, { disallowJsonEncode: true })
})

export type PrivateKeyInput = typeof PrivateKeyInput.Type

export const PublicKeyInput = Schema.Struct({
  algorithm: Algorithm,
  publicKey: Schema.Uint8Array
})

export type PublicKeyInput = typeof PublicKeyInput.Type

export const SignInput = Schema.Struct({
  ...PrivateKeyInput.fields,
  data: Schema.Uint8Array
})

export type SignInput = typeof SignInput.Type

export const VerifyInput = Schema.Struct({
  ...PublicKeyInput.fields,
  data: Schema.Uint8Array,
  signature: Schema.Uint8Array
})

export type VerifyInput = typeof VerifyInput.Type
