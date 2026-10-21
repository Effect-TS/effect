import {
  PasskeyAssertion,
  PasskeyAssertionVerified,
  PasskeyAttestation,
  PasskeyAuthenticationOptions,
  PasskeyCeremony,
  PasskeyChallenge,
  PasskeyConfig,
  type PasskeyConfigurationError,
  PasskeyCounter,
  PasskeyCredential,
  PasskeyDescriptor,
  PasskeyLabel,
  PasskeyProfile,
  PasskeyProtocol,
  PasskeyProtocolCredentialId,
  PasskeyProtocolRejected,
  PasskeyRegistrationOptions,
  PasskeyRegistrationVerified,
  PasskeyUnavailable,
  PasskeyUserHandle,
  samePasskey,
  snapshotPasskey
} from "@effect/auth/Passkey"
import { markAuthFailureReported, reportAuthFailure } from "@effect/auth/Persistence"
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} from "@simplewebauthn/server"
import {
  decodeAttestationObject,
  decodeClientDataJSON,
  decodeCredentialPublicKey,
  isoCBOR,
  parseAuthenticatorData
} from "@simplewebauthn/server/helpers"
import * as Cause from "effect/Cause"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

import { captureSimpleWebAuthnProfiles, validateSimpleWebAuthnProfile } from "./configuration.ts"
import type { SimpleWebAuthnPasskeyProtocolOptions } from "./models.ts"

type Protocol = PasskeyProtocol["Service"]
type Input<K extends keyof Protocol> = Parameters<Protocol[K]>[0]
const rejected = () => PasskeyProtocolRejected.make({})
const unavailable = () => PasskeyUnavailable.make({})

const unexpected = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.uninterruptibleMask((restore) =>
    restore(effect).pipe(
      Effect.catchCause((cause): Effect.Effect<never, E | PasskeyUnavailable> =>
        Cause.hasDies(cause)
          ? reportAuthFailure("passkey-protocol", cause).pipe(
            Effect.andThen(
              Effect.failCause(
                markAuthFailureReported(
                  Cause.fromReasons<E | PasskeyUnavailable>(
                    cause.reasons.map((reason) =>
                      Cause.isDieReason(reason) ? Cause.makeFailReason(unavailable()) : reason
                    )
                  )
                )
              )
            )
          )
          : Effect.failCause(cause)
      )
    )
  )

const maintained = <A>(call: () => Promise<A>) =>
  Effect.tryPromise(call).pipe(
    Effect.onError((cause) => reportAuthFailure("passkey-protocol", cause)),
    Effect.mapError(unavailable)
  )

const parsed = <A>(call: () => A) => Effect.try({ try: call, catch: rejected })

const decode = <S extends Schema.Codec<unknown, unknown, never, never>>(
  schema: S,
  input: unknown
) =>
  // Maintained JSON/CBOR parsers and their map lookups return untyped wire data.
  // eslint-disable-next-line no-restricted-properties
  Schema.decodeUnknownEffect(schema)(input).pipe(Effect.mapError(rejected))

const capture = <S extends Schema.Codec<unknown, unknown, never, never>>(
  schema: S,
  input: S["Type"]
) => snapshotPasskey(schema, input).pipe(Effect.mapError(rejected))

const sameBytes = (left: Uint8Array, right: Uint8Array) =>
  left.length === right.length && left.every((byte, index) => byte === right[index])

const binary = (minimum: number, maximum: number) =>
  Schema.String.check(
    Schema.isMaxLength(Math.ceil((maximum * 4) / 3)),
    Schema.makeFilter((value) => {
      const result = Base64Url.decode(value)

      return (
        result._tag === "Success" &&
        result.success.length >= minimum &&
        result.success.length <= maximum &&
        Base64Url.encode(result.success) === value
      )
    })
  )

const bytes = Effect.fn("simpleWebAuthnBytes")(function*(value: string) {
  const result = Base64Url.decode(value)

  if (result._tag === "Failure") return yield* rejected()

  return new Uint8Array(result.success)
})

const duration = Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 300000 }))

const prepareAuthenticationInput = Schema.Struct({
  profile: PasskeyProfile,
  challenge: PasskeyChallenge,
  timeoutMillis: duration,
  allowedCredentials: Schema.Array(PasskeyDescriptor).check(Schema.isMaxLength(64))
})

const prepareRegistrationInput = Schema.Struct({
  profile: PasskeyProfile,
  challenge: PasskeyChallenge,
  timeoutMillis: duration,
  userHandle: PasskeyUserHandle,
  name: PasskeyLabel,
  displayName: PasskeyLabel,
  excludedCredentials: Schema.Array(PasskeyDescriptor).check(Schema.isMaxLength(64))
})

const authenticationInput = Schema.Struct({
  ceremony: PasskeyCeremony,
  credential: PasskeyCredential,
  response: PasskeyAssertion
})

const registrationInput = Schema.Struct({
  ceremony: PasskeyCeremony,
  response: PasskeyAttestation
})

const envelope = {
  id: PasskeyProtocolCredentialId,
  rawId: PasskeyProtocolCredentialId,
  type: Schema.Literal("public-key")
}

const authenticationResponse = Schema.Struct({
  ...envelope,
  response: Schema.Struct({
    clientDataJSON: binary(1, 8192),
    authenticatorData: binary(37, 16384),
    signature: binary(1, 1024),
    userHandle: Schema.optionalKey(Schema.NullOr(PasskeyUserHandle))
  })
})

const registrationResponse = Schema.Struct({
  ...envelope,
  response: Schema.Struct({ clientDataJSON: binary(1, 8192), attestationObject: binary(1, 65536) })
})

const clientData = Schema.Struct({
  type: Schema.String,
  challenge: PasskeyChallenge,
  origin: Schema.String.check(Schema.isMaxLength(2048)),
  crossOrigin: Schema.optionalKey(Schema.Boolean),
  topOrigin: Schema.optionalKey(Schema.Unknown)
})

type CborData =
  | string
  | number
  | boolean
  | null
  | Uint8Array
  | ReadonlyArray<CborData>
  | ReadonlyMap<string | number, CborData>

const cborLeaf = Schema.Union([
  Schema.String.check(Schema.isMaxLength(8192)),
  Schema.Number.check(Schema.isFinite()),
  Schema.Boolean,
  Schema.Null,
  Schema.Uint8Array.check(Schema.makeFilter((value) => value.length <= 16384))
])

const cborValue = (depth: number): Schema.Codec<CborData> => {
  if (depth === 0) return cborLeaf
  const child = cborValue(depth - 1)

  return Schema.Union([
    cborLeaf,
    Schema.Array(child).check(Schema.isMaxLength(64)),
    Schema.ReadonlyMap(
      Schema.Union([Schema.String.check(Schema.isMaxLength(128)), Schema.Int]),
      child
    ).check(Schema.makeFilter((value) => value.size <= 32))
  ])
}

const cborMap = Schema.ReadonlyMap(
  Schema.Union([Schema.String.check(Schema.isMaxLength(128)), Schema.Int]),
  cborValue(4)
).check(Schema.makeFilter((value) => value.size <= 32))

const encodeCbor = (value: CborData) => {
  // The maintained encoder reads these Schema-validated Maps/arrays; its type
  // requires mutable collections although no mutation is performed.
  return isoCBOR.encode(value as Parameters<typeof isoCBOR.encode>[0])
}

const exactMap = Effect.fn("simpleWebAuthnExactMap")(function*(input: Uint8Array, value: unknown) {
  const result = yield* decode(cborMap, value)
  const encoded = yield* parsed(() => encodeCbor(result))

  if (!sameBytes(input, encoded)) return yield* rejected()

  return result
})

const byteValue = (minimum: number, maximum: number) =>
  Schema.Uint8Array.check(
    Schema.makeFilter((value) => value.length >= minimum && value.length <= maximum)
  )

const fresh = Effect.fn("simpleWebAuthnFresh")(function*(ceremony: PasskeyCeremony) {
  const now = DateTime.toEpochMillis(yield* DateTime.now)

  if (
    ceremony.issuedAtMillis > now ||
    now >= ceremony.expiresAtMillis ||
    now >= ceremony.requestBindingExpiresAtMillis ||
    ceremony.expiresAtMillis <= ceremony.issuedAtMillis
  ) {
    return yield* rejected()
  }
})

const checkClient = Effect.fn("simpleWebAuthnClientData")(function*(
  value: string,
  ceremony: PasskeyCeremony,
  type: "webauthn.create" | "webauthn.get"
) {
  const client = yield* decode(clientData, yield* parsed(() => decodeClientDataJSON(value)))

  if (
    client.type !== type ||
    client.challenge !== ceremony.challenge ||
    !ceremony.profile.origins.includes(client.origin) ||
    client.crossOrigin === true ||
    "topOrigin" in client
  ) {
    return yield* rejected()
  }

  return client
})

const checkAuthenticator = Effect.fn("simpleWebAuthnAuthenticatorData")(function*(
  original: Uint8Array,
  registration: boolean,
  profile: PasskeyProfile
) {
  if (
    original.length < 37 ||
    original.length > 16384 ||
    Boolean(original[32]! & 64) !== registration
  ) {
    return yield* rejected()
  }
  let prefix = 37

  if (registration) {
    if (original.length < 55) return yield* rejected()

    const length = new DataView(
      original.buffer,
      original.byteOffset,
      original.byteLength
    ).getUint16(53, false)

    if (length < 1 || length > 1023 || original.length < 55 + length) return yield* rejected()
    prefix = 55 + length
  }
  const result = yield* parsed(() => parseAuthenticatorData(new Uint8Array(original)))

  if (
    !result.flags.up ||
    (profile.userVerification === "required" && !result.flags.uv) ||
    (result.flags.bs && !result.flags.be) ||
    result.flags.at !== registration ||
    result.flags.flagsInt !== original[32]
  ) {
    return yield* rejected()
  }
  yield* decode(PasskeyCounter, result.counter)
  const chunks: Array<Uint8Array> = [original.slice(0, prefix)]

  if (registration) {
    const id = yield* decode(byteValue(1, 1023), result.credentialID)
    const key = yield* decode(byteValue(1, 8192), result.credentialPublicKey)

    if (!sameBytes(id, original.slice(55, prefix))) return yield* rejected()
    chunks.push(key)
  }
  if (result.flags.ed) {
    const extension = yield* decode(byteValue(1, 16384), result.extensionsDataBuffer)

    yield* exactMap(
      extension,
      yield* parsed(() => isoCBOR.decodeFirst<unknown>(new Uint8Array(extension)))
    )
    chunks.push(extension)
  } else if (result.extensionsDataBuffer !== undefined) return yield* rejected()
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0)

  if (length !== original.length) return yield* rejected()
  let offset = 0

  for (const chunk of chunks) {
    if (!sameBytes(chunk, original.slice(offset, offset + chunk.length))) return yield* rejected()
    offset += chunk.length
  }

  const rpHash = new Uint8Array(
    yield* maintained(() => globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(profile.rpId)))
  )

  if (!sameBytes(rpHash, original.slice(0, 32))) return yield* rejected()

  return result
})

const checkKey = Effect.fn("simpleWebAuthnPublicKey")(function*(
  input: Uint8Array,
  allowed: ReadonlyArray<-7 | -257>,
  expected?: -7 | -257
) {
  const map = yield* exactMap(
    input,
    yield* parsed(() => decodeCredentialPublicKey(new Uint8Array(input)))
  )

  const algorithmId = yield* decode(Schema.Literals([-7, -257]), map.get(3))

  if (!allowed.includes(algorithmId) || (expected !== undefined && algorithmId !== expected)) {
    return yield* rejected()
  }
  let jwk: JsonWebKey
  let algorithm: EcKeyImportParams | RsaHashedImportParams

  if (algorithmId === -7) {
    if (
      map.size !== 5 ||
      ![1, 3, -1, -2, -3].every((key) => map.has(key)) ||
      map.get(1) !== 2 ||
      map.get(-1) !== 1
    ) {
      return yield* rejected()
    }
    const x = yield* decode(byteValue(32, 32), map.get(-2))
    const y = yield* decode(byteValue(32, 32), map.get(-3))

    // Authentication imports the validated key in the SDK's signature check.
    // Registration with none attestation still needs native key validation here.
    if (expected !== undefined) return algorithmId
    jwk = {
      kty: "EC",
      crv: "P-256",
      x: Base64Url.encode(x),
      y: Base64Url.encode(y),
      ext: false
    }
    algorithm = { name: "ECDSA", namedCurve: "P-256" }
  } else {
    if (map.size !== 4 || ![1, 3, -1, -2].every((key) => map.has(key)) || map.get(1) !== 3) {
      return yield* rejected()
    }
    const n = yield* decode(byteValue(256, 512), map.get(-1))
    const e = yield* decode(byteValue(1, 4), map.get(-2))
    const exponent = e.reduce((value, byte) => value * 256 + byte, 0)

    if (
      n[0]! < 128 ||
      (n[n.length - 1]! & 1) === 0 ||
      e[0] === 0 ||
      exponent < 3 ||
      exponent % 2 !== 1
    ) {
      return yield* rejected()
    }
    if (expected !== undefined) return algorithmId
    jwk = {
      kty: "RSA",
      alg: "RS256",
      n: Base64Url.encode(n),
      e: Base64Url.encode(e),
      ext: false
    }
    algorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }
  }
  yield* maintained(() => globalThis.crypto.subtle.importKey("jwk", jwk, algorithm, false, ["verify"]))

  return algorithmId
})

/**
 * Creates a WebAuthn protocol adapter for the configured relying-party profiles.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const makeSimpleWebAuthnPasskeyProtocol = Effect.fn("makeSimpleWebAuthnPasskeyProtocol")(
  function*(
    options: SimpleWebAuthnPasskeyProtocolOptions
  ): Effect.fn.Return<Protocol, PasskeyConfigurationError> {
    const select = yield* captureSimpleWebAuthnProfiles(options)

    const prepareAuthentication = Effect.fn("SimpleWebAuthnPasskeyProtocol.prepareAuthentication")(
      function*(input: Input<"prepareAuthentication">) {
        const fixed = yield* capture(prepareAuthenticationInput, input)
        const profile = yield* select(fixed.profile)
        const challenge = yield* bytes(fixed.challenge)

        const result = yield* maintained(() =>
          generateAuthenticationOptions({
            rpID: profile.rpId,
            challenge,
            timeout: fixed.timeoutMillis,
            userVerification: profile.userVerification,
            allowCredentials: fixed.allowedCredentials.map((value) => ({ ...value }))
          })
        )

        const value = yield* decode(PasskeyAuthenticationOptions, {
          challenge: result.challenge,
          rpId: result.rpId,
          timeout: result.timeout,
          userVerification: result.userVerification,
          allowCredentials: result.allowCredentials ?? []
        })

        if (
          !(yield* samePasskey(PasskeyAuthenticationOptions, value, {
            challenge: fixed.challenge,
            rpId: profile.rpId,
            timeout: fixed.timeoutMillis,
            userVerification: profile.userVerification,
            allowCredentials: fixed.allowedCredentials
          }))
        ) {
          return yield* unavailable()
        }

        return yield* capture(PasskeyAuthenticationOptions, value)
      },
      unexpected
    )

    const prepareRegistration = Effect.fn("SimpleWebAuthnPasskeyProtocol.prepareRegistration")(
      function*(input: Input<"prepareRegistration">) {
        const fixed = yield* capture(prepareRegistrationInput, input)
        const profile = yield* select(fixed.profile)

        const challenge = yield* bytes(fixed.challenge),
          userID = yield* bytes(fixed.userHandle)

        const result = yield* maintained(() =>
          generateRegistrationOptions({
            rpName: profile.rpName,
            rpID: profile.rpId,
            userName: fixed.name,
            userDisplayName: fixed.displayName,
            userID,
            challenge,
            timeout: fixed.timeoutMillis,
            attestationType: "none",
            supportedAlgorithmIDs: [...profile.algorithms],
            authenticatorSelection: {
              residentKey: profile.residentKey,
              userVerification: profile.userVerification
            },
            excludeCredentials: fixed.excludedCredentials.map((value) => ({ ...value }))
          })
        )

        const value = yield* decode(PasskeyRegistrationOptions, {
          challenge: result.challenge,
          rp: result.rp,
          user: result.user,
          pubKeyCredParams: result.pubKeyCredParams,
          timeout: result.timeout,
          attestation: result.attestation,
          authenticatorSelection: result.authenticatorSelection,
          excludeCredentials: result.excludeCredentials ?? []
        })

        const expected = {
          challenge: fixed.challenge,
          rp: { id: profile.rpId, name: profile.rpName },
          user: { id: fixed.userHandle, name: fixed.name, displayName: fixed.displayName },
          pubKeyCredParams: profile.algorithms.map((alg) => ({ type: "public-key", alg })),
          timeout: fixed.timeoutMillis,
          attestation: "none",
          authenticatorSelection: {
            residentKey: profile.residentKey,
            userVerification: profile.userVerification
          },
          excludeCredentials: fixed.excludedCredentials
        }

        if (
          !(yield* samePasskey(
            PasskeyRegistrationOptions,
            value,
            yield* decode(PasskeyRegistrationOptions, expected)
          ))
        ) {
          return yield* unavailable()
        }

        return yield* capture(PasskeyRegistrationOptions, value)
      },
      unexpected
    )

    const verifyRegistration = Effect.fn("SimpleWebAuthnPasskeyProtocol.verifyRegistration")(
      function*(input: Input<"verifyRegistration">) {
        const fixed = yield* capture(registrationInput, input),
          ceremony = fixed.ceremony

        const profile = yield* validateSimpleWebAuthnProfile(ceremony.profile).pipe(
          Effect.mapError(rejected)
        )

        if (
          (ceremony.purpose !== "registration" || ceremony.context._tag !== "Registration") &&
          (ceremony.purpose !== "enrollment" || ceremony.context._tag !== "Enrollment")
        ) {
          return yield* rejected()
        }
        yield* fresh(ceremony)

        const wire = yield* decode(
          Schema.fromJsonString(registrationResponse),
          Redacted.value(fixed.response)
        )

        if (wire.id !== wire.rawId) return yield* rejected()

        const client = yield* checkClient(
          wire.response.clientDataJSON,
          ceremony,
          "webauthn.create"
        )

        const attestationBytes = yield* bytes(wire.response.attestationObject)

        const attestation = yield* exactMap(
          attestationBytes,
          yield* parsed(() => decodeAttestationObject(new Uint8Array(attestationBytes)))
        )

        if (
          attestation.size !== 3 ||
          attestation.get("fmt") !== "none" ||
          !attestation.has("attStmt") ||
          !attestation.has("authData")
        ) {
          return yield* rejected()
        }
        const statement = yield* decode(cborMap, attestation.get("attStmt"))

        if (statement.size !== 0) return yield* rejected()
        const authenticatorBytes = yield* decode(byteValue(37, 16384), attestation.get("authData"))
        const auth = yield* checkAuthenticator(authenticatorBytes, true, profile)
        const id = yield* decode(byteValue(1, 1023), auth.credentialID)
        const key = yield* decode(byteValue(1, 8192), auth.credentialPublicKey)

        if (Base64Url.encode(id) !== wire.id) return yield* rejected()
        const algorithm = yield* checkKey(key, profile.algorithms)

        const result = yield* maintained(() =>
          verifyRegistrationResponse({
            response: { ...wire, clientExtensionResults: {} },
            expectedChallenge: ceremony.challenge,
            expectedOrigin: [...profile.origins],
            expectedRPID: profile.rpId,
            expectedType: "webauthn.create",
            requireUserPresence: true,
            requireUserVerification: profile.userVerification === "required",
            supportedAlgorithmIDs: [...profile.algorithms]
          })
        )

        if (!result.verified || result.registrationInfo === undefined) return yield* rejected()
        const info = result.registrationInfo

        if (
          info.fmt !== "none" ||
          info.origin !== client.origin ||
          info.rpID !== profile.rpId ||
          info.credential.id !== wire.id ||
          !sameBytes(info.credential.publicKey, key) ||
          info.credential.counter !== auth.counter ||
          info.userVerified !== auth.flags.uv ||
          (info.credentialDeviceType === "multiDevice") !== auth.flags.be ||
          info.credentialBackedUp !== auth.flags.bs
        ) {
          return yield* rejected()
        }
        yield* fresh(ceremony)

        return yield* capture(
          PasskeyRegistrationVerified,
          yield* decode(PasskeyRegistrationVerified, {
            protocolCredentialId: info.credential.id,
            publicKey: Base64Url.encode(info.credential.publicKey),
            algorithm,
            counter: info.credential.counter,
            userVerified: info.userVerified,
            backupEligible: info.credentialDeviceType === "multiDevice",
            backupState: info.credentialBackedUp
          })
        )
      },
      unexpected
    )

    const verifyAuthentication = Effect.fn("SimpleWebAuthnPasskeyProtocol.verifyAuthentication")(
      function*(input: Input<"verifyAuthentication">) {
        const fixed = yield* capture(authenticationInput, input),
          ceremony = fixed.ceremony,
          credential = fixed.credential

        const profile = yield* validateSimpleWebAuthnProfile(ceremony.profile).pipe(
            Effect.mapError(rejected)
          ),
          original = yield* validateSimpleWebAuthnProfile(credential.profile).pipe(
            Effect.mapError(rejected)
          )

        const contexts = {
          "sign-in": "SignIn",
          pending: "Pending",
          "step-up": "StepUp",
          action: "Action"
        } as const

        if (
          ceremony.purpose === "registration" ||
          ceremony.purpose === "enrollment" ||
          contexts[ceremony.purpose] !== ceremony.context._tag ||
          !credential.active ||
          credential.rpId !== profile.rpId ||
          original.rpId !== profile.rpId ||
          !original.algorithms.includes(credential.algorithm) ||
          !profile.algorithms.includes(credential.algorithm)
        ) {
          return yield* rejected()
        }
        yield* fresh(ceremony)

        const wire = yield* decode(
          Schema.fromJsonString(authenticationResponse),
          Redacted.value(fixed.response)
        )

        const { userHandle: rawUserHandle, ...assertionResponse } = wire.response
        const userHandle = rawUserHandle ?? undefined

        if (
          wire.id !== wire.rawId ||
          wire.id !== credential.protocolCredentialId ||
          (userHandle !== undefined && userHandle !== credential.userHandle) ||
          (ceremony.context._tag === "SignIn" && userHandle === undefined) ||
          (ceremony.allowedCredentials.length > 0 &&
            !ceremony.allowedCredentials.some((value) => value.id === wire.id))
        ) {
          return yield* rejected()
        }
        const client = yield* checkClient(wire.response.clientDataJSON, ceremony, "webauthn.get")

        const auth = yield* checkAuthenticator(
          yield* bytes(wire.response.authenticatorData),
          false,
          profile
        )

        if (
          auth.flags.be !== credential.backupEligible ||
          (!credential.backupEligible &&
            (credential.counter > 0 || auth.counter > 0) &&
            auth.counter <= credential.counter)
        ) {
          return yield* rejected()
        }
        const publicKey = yield* bytes(credential.publicKey)

        yield* checkKey(publicKey, profile.algorithms, credential.algorithm)

        const result = yield* maintained(() =>
          verifyAuthenticationResponse({
            response: {
              ...wire,
              response: {
                ...assertionResponse,
                ...(userHandle === undefined ? {} : { userHandle })
              },
              clientExtensionResults: {}
            },
            expectedChallenge: ceremony.challenge,
            expectedOrigin: [...profile.origins],
            expectedRPID: profile.rpId,
            expectedType: "webauthn.get",
            requireUserVerification: profile.userVerification === "required",
            credential: {
              id: credential.protocolCredentialId,
              publicKey,
              counter: credential.backupEligible ? 0 : credential.counter
            }
          })
        )

        if (!result.verified) return yield* rejected()
        const info = result.authenticationInfo

        if (
          info.credentialID !== wire.id ||
          info.origin !== client.origin ||
          info.rpID !== profile.rpId ||
          info.newCounter !== auth.counter ||
          info.userVerified !== auth.flags.uv ||
          (info.credentialDeviceType === "multiDevice") !== credential.backupEligible ||
          info.credentialBackedUp !== auth.flags.bs
        ) {
          return yield* rejected()
        }
        yield* fresh(ceremony)

        return yield* capture(
          PasskeyAssertionVerified,
          yield* decode(PasskeyAssertionVerified, {
            protocolCredentialId: info.credentialID,
            ...(userHandle === undefined ? {} : { userHandle }),
            counter: info.newCounter,
            userVerified: info.userVerified,
            backupEligible: info.credentialDeviceType === "multiDevice",
            backupState: info.credentialBackedUp
          })
        )
      },
      unexpected
    )

    return PasskeyProtocol.of({
      prepareAuthentication,
      prepareRegistration,
      verifyRegistration,
      verifyAuthentication
    })
  }
)

/**
 * Layer that provides WebAuthn verification using the same host profiles as the passkey strategy.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layerSimpleWebAuthnPasskeyProtocol = Layer.effect(
  PasskeyProtocol,
  Effect.flatMap(PasskeyConfig, makeSimpleWebAuthnPasskeyProtocol)
)
