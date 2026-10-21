import * as OAuthProvider from "@effect/auth/oauth/OAuthProvider"
import { assert, it } from "@effect/vitest"
import * as Schema from "effect/Schema"

it("projects optional OpenID profile claims without protocol or extension fields", () => {
  const decode = Schema.decodeUnknownSync(OAuthProvider.StandardProfile)
  assert.deepStrictEqual(decode({ sub: "subject", access_token: "secret" }), {})
  const profile = {
    name: "Ada Lovelace",
    given_name: "Ada",
    family_name: "Lovelace",
    middle_name: "Augusta",
    nickname: "Ada",
    preferred_username: "ada",
    profile: "https://example.com/ada",
    picture: "https://example.com/ada.png",
    website: "https://example.com",
    email: "ada@example.com",
    email_verified: false,
    gender: "female",
    birthdate: "1815-12-10",
    zoneinfo: "Europe/London",
    locale: "en-GB",
    phone_number: "+441632960123",
    phone_number_verified: true,
    address: {
      formatted: "10 Example Street, London, GB",
      street_address: "10 Example Street",
      locality: "London",
      region: "Greater London",
      postal_code: "SW1A 1AA",
      country: "GB"
    },
    updated_at: 0
  }
  assert.deepStrictEqual(
    decode({ ...profile, custom_claim: true, address: { ...profile.address, extra: true } }),
    profile
  )
})

it("preserves OpenID string bounds, claim types and safe timestamps", () => {
  const is = Schema.is(OAuthProvider.StandardProfile)
  assert.isTrue(is({ name: "😀".repeat(128), email: "x".repeat(320), updated_at: Number.MAX_SAFE_INTEGER }))
  for (
    const profile of [
      { name: "😀".repeat(129) },
      { email: "x".repeat(321) },
      { picture: "x".repeat(2049) },
      { address: { street_address: "x".repeat(2049) } },
      { address: { country: "x".repeat(257) } },
      { email_verified: "true" },
      { name: null },
      { updated_at: -1 },
      { updated_at: 1.5 },
      { updated_at: Number.MAX_SAFE_INTEGER + 1 }
    ]
  ) assert.isFalse(is(profile))
})
