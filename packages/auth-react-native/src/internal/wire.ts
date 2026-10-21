import { PasskeyProtocolCredentialId, PasskeyUserHandle } from "@effect/auth/Passkey"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Schema from "effect/Schema"

const bytes = (minimum: number, maximum: number) =>
  Schema.String.check(
    Schema.isMaxLength(Math.ceil((maximum * 4) / 3)),
    Schema.makeFilter((value) => {
      const decoded = Base64Url.decode(value)

      return (
        decoded._tag === "Success" &&
        decoded.success.length >= minimum &&
        decoded.success.length <= maximum &&
        Base64Url.encode(decoded.success) === value
      )
    })
  )

// The peer allows omitted type/rawId in assertions. Normalize only missing fields;
// a supplied mismatch must fail. Never forward unsolicited extensions or metadata.
const envelope = {
  id: PasskeyProtocolCredentialId,
  rawId: Schema.optionalKey(PasskeyProtocolCredentialId),
  type: Schema.optionalKey(Schema.Literal("public-key"))
}

const matchingId = Schema.makeFilter<{ readonly id: string; readonly rawId?: string }>(
  (value) => value.rawId === undefined || value.rawId === value.id
)

/** @internal */
export const nativeRegistration = Schema.Struct({
  ...envelope,
  rawId: PasskeyProtocolCredentialId,
  response: Schema.Struct({
    clientDataJSON: bytes(1, 8192),
    attestationObject: bytes(1, 65536)
  })
}).check(matchingId)

/** @internal */
export const nativeAuthentication = Schema.Struct({
  ...envelope,
  response: Schema.Struct({
    clientDataJSON: bytes(1, 8192),
    authenticatorData: bytes(37, 16384),
    signature: bytes(1, 1024),
    userHandle: Schema.optionalKey(Schema.NullOr(PasskeyUserHandle))
  })
}).check(matchingId)

const wireEnvelope = {
  id: PasskeyProtocolCredentialId,
  rawId: PasskeyProtocolCredentialId,
  type: Schema.Literal("public-key"),
  clientExtensionResults: Schema.Struct({})
}

/** @internal */
export const registrationWire = Schema.fromJsonString(
  Schema.Struct({
    ...wireEnvelope,
    response: nativeRegistration.fields.response
  })
)

/** @internal */
export const authenticationWire = Schema.fromJsonString(
  Schema.Struct({
    ...wireEnvelope,
    response: Schema.Struct({
      ...nativeAuthentication.fields.response.fields,
      userHandle: Schema.optionalKey(PasskeyUserHandle)
    })
  })
)
