import * as Passkey from "@effect/auth/Passkey"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import { digest } from "./crypto.ts"

/** @internal */
export const passkeyCanonicalJson = <S extends Schema.Codec<unknown, unknown, never, never>>(
  schema: S
) => {
  const codec = Schema.fromJsonString(Schema.toCodecJson(Schema.toType(schema)))

  return {
    encode: (value: S["Type"]) => Schema.encodeSync(codec)(Passkey.snapshotPasskeySync(schema, value)),
    decode: (text: unknown): S["Type"] => Schema.decodeUnknownSync(codec)(text)
  }
}

/** @internal */
export const passkeyDigest = <S extends Schema.Codec<unknown, unknown, never, never>>(
  schema: S,
  value: S["Type"]
) => digest(passkeyCanonicalJson(schema).encode(value))

/** @internal */
export const passkeyEnrollmentDigest = Effect.fnUntraced(function*(ceremony: Passkey.PasskeyCeremony) {
  if (ceremony.context._tag !== "Enrollment") return yield* Passkey.PasskeyUnavailable.make({})

  return yield* passkeyDigest(
    Schema.Tuple([
      Passkey.PasskeyModuleId,
      Schema.Literal("enrollment"),
      Schema.Struct({ ...Passkey.PasskeyBegin.fields, name: Passkey.PasskeyLabel }),
      Passkey.PasskeyProfile,
      Passkey.PasskeyRevision,
      Passkey.PasskeyUserHandle,
      Schema.Array(Passkey.PasskeyDescriptor)
    ]),
    [
      ceremony.moduleId,
      "enrollment",
      {
        flowId: ceremony.flowId,
        commandId: ceremony.commandId,
        profileId: ceremony.profile.profileId,
        name: ceremony.context.name
      },
      ceremony.profile,
      ceremony.context.revision,
      ceremony.context.userHandle,
      ceremony.allowedCredentials
    ]
  )
})

/** @internal */
export const passkeyRemoveDigest = (
  moduleId: string,
  commandId: string,
  credential: Passkey.PasskeyCredential
) =>
  passkeyDigest(
    Schema.Tuple([
      Passkey.PasskeyModuleId,
      Schema.Literal("remove"),
      Passkey.PasskeyBegin.fields.commandId,
      Passkey.PasskeyCredential
    ]),
    [
      Passkey.PasskeyModuleId.make(moduleId),
      "remove",
      Passkey.PasskeyBegin.fields.commandId.make(commandId),
      credential
    ]
  )
