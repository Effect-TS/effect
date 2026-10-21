import * as Schema from "effect/Schema"
import * as Struct from "effect/Struct"

import { OAuthDisplayProfile, OAuthVerifiedExternalIdentity } from "./signInModels.ts"

/** Provider keys must match the configured protocol. Schemas describe the
 * adapter's bounded JSON projection, not the raw token or API response. */
export type OAuthProviderProfiles = Readonly<Record<string, Schema.Codec<Schema.JsonObject>>>

export type ProfileOptions<Profiles extends OAuthProviderProfiles> = {
  /** Decode providerData before SessionClaims. A supplied map accepts only its keys. */
  readonly profiles?: Profiles
} & (OAuthProviderProfiles extends Profiles ? {} : { readonly profiles: Profiles })

// Protocol identity fields are already decoded; provider data is decoded below.
const decodedIdentity = OAuthVerifiedExternalIdentity.mapFields(Struct.map(Schema.toType))

const providerSchema = <const Key extends string, S extends Schema.Codec<Schema.JsonObject>>(
  provider: Key,
  data: S
) =>
  Schema.Struct({
    provider: Schema.Literal(provider),
    identity: Schema.Struct({
      ...decodedIdentity.fields,
      profile: Schema.optionalKey(
        Schema.Struct({
          ...OAuthDisplayProfile.fields,
          providerData: Schema.optionalKey(Schema.toType(data))
        })
      )
    })
  })

/** Narrow by provider before reading provider-specific data. Missing metadata
 * stays absent; verified profile email never establishes linking authority. */
export type OAuthClaimsIdentity<Profiles extends OAuthProviderProfiles> = {
  readonly [Key in keyof Profiles & string]: ReturnType<
    typeof providerSchema<Key, Profiles[Key]>
  >["Type"]
}[keyof Profiles & string]

/** @internal */
export const claimsIdentitySchema = <Profiles extends OAuthProviderProfiles>(
  profiles: Profiles | undefined
): Schema.Codec<OAuthClaimsIdentity<Profiles>, unknown> => {
  if (profiles === undefined) {
    return Schema.Struct({ provider: Schema.String, identity: decodedIdentity })
  }

  return Schema.Union(
    Object.entries(profiles).map(([provider, data]) => providerSchema(provider, data))
  )
}
