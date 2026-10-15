import type { Jwk } from "@effect/auth/Jose"
import { NodeCrypto } from "@effect/platform-node"
import { Effect, Redacted } from "effect"
import * as jose from "jose"

// P-256 fixture adapted from panva/jose test/jwks/remote.test.ts.
// MIT, Copyright (c) 2018 Filip Skokan. See ../../THIRD_PARTY_NOTICES.md.
export const publicJwk = {
  kty: "EC",
  crv: "P-256",
  x: "fqCXPnWs3sSfwztvwYU9SthmRdoT4WCXxS8eD8icF6U",
  y: "nP6GIc42c61hoKqPcZqkvzhzIJkBV3Jw3g8sGG7UeP8"
} satisfies Jwk.PublicJwk

export const privateJwk = { ...publicJwk, d: "XikZvoy8ayRpOnuz7ont2DkgMxp_kmmg1EKcuIJWX_E" }
export const secret = new Uint8Array(32).fill(7)
export const secretJwk = { kty: "oct", k: jose.base64url.encode(secret) }
export const utf8 = (input: string) => new TextEncoder().encode(input)
export const text = (input: Uint8Array) => new TextDecoder().decode(input)

export const cryptoLayer = NodeCrypto.layer

export const independentJws = (
  payload: Uint8Array,
  header: jose.CompactJWSHeaderParameters = { alg: "HS256" }
) =>
  Effect.promise(() => new jose.CompactSign(payload).setProtectedHeader(header).sign(secret)).pipe(
    Effect.map(Redacted.make)
  )

export const independentJwt = (
  claims: Readonly<Record<string, unknown>>,
  header: jose.CompactJWSHeaderParameters = { alg: "HS256", typ: "JWT" }
) => independentJws(utf8(JSON.stringify(claims)), header)
