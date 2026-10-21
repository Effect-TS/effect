import { PasskeyProfile } from "@effect/auth/Passkey"
import * as Schema from "effect/Schema"

/**
 * Schema for the relying-party profiles available to the WebAuthn protocol adapter.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const SimpleWebAuthnPasskeyProtocolOptions = Schema.Struct({
  profiles: Schema.NonEmptyArray(PasskeyProfile).check(Schema.isMaxLength(64))
})

/**
 * Type represented by the SimpleWebAuthnPasskeyProtocolOptions schema.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type SimpleWebAuthnPasskeyProtocolOptions = typeof SimpleWebAuthnPasskeyProtocolOptions.Type
