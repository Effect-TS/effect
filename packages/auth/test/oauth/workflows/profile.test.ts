import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"

import { AppleUserProfile } from "@effect/auth/internal/oauth/providers/apple/profile"
import { decodeOidcProfile, OidcUserProfile } from "@effect/auth/internal/oauth/providers/shared/profile"

describe("OIDC profile claims", () => {
  it.effect("keeps Google's hosted domain from the verified ID token", () =>
    Effect.gen(function*() {
      const profile = yield* decodeOidcProfile(
        {
          email: "ada@example.com",
          email_verified: true,
          hd: "example.com"
        },
        OidcUserProfile
      )

      assert.deepNestedInclude(profile?.providerData, { "hd": "example.com" })
    }))

  it.effect("leaves hd absent for an account outside a Workspace", () =>
    Effect.gen(function*() {
      const profile = yield* decodeOidcProfile(
        { email: "ada@gmail.com", email_verified: true },
        OidcUserProfile
      )

      assert.notProperty(profile?.providerData, "hd")
    }))

  // A host schema such as `{ hd }` used to be decoded first, and standard
  // display claims were then read from that projection. Effect Schema drops
  // unmodeled properties, so name and email disappeared.
  it.effect("keeps standard display claims when the host schema is narrower", () =>
    Effect.gen(function*() {
      const profile = yield* decodeOidcProfile(
        {
          hd: "example.com",
          name: "Ada",
          email: "ada@example.com",
          email_verified: true
        },
        Schema.Struct({ hd: Schema.String })
      )

      assert.strictEqual(profile?.displayName, "Ada")
      assert.strictEqual(profile?.email, "ada@example.com")
      assert.strictEqual(profile?.emailVerified, true)
      assert.deepStrictEqual(profile?.providerData, { hd: "example.com" })
    }))

  // A host schema that only models hd plus Apple's string flag normalizes
  // email_verified and drops name and email. The fallback used that projection
  // as the entire display source, so the verified name disappeared.
  it.effect("keeps verified name and email when only the flag is normalized", () =>
    Effect.gen(function*() {
      const profile = yield* decodeOidcProfile(
        {
          hd: "example.com",
          name: "Ada",
          email: "ada@example.com",
          email_verified: "true"
        },
        Schema.Struct({
          hd: Schema.String,
          email_verified: AppleUserProfile.fields.email_verified
        })
      )

      assert.strictEqual(profile?.displayName, "Ada")
      assert.strictEqual(profile?.email, "ada@example.com")
      assert.strictEqual(profile?.emailVerified, true)
      assert.deepStrictEqual(profile?.providerData, { hd: "example.com", email_verified: true })
    }))
})
