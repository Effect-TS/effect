import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import { OAuthProtocolRejected } from "../../signInErrors.ts"
import type { PlainOAuthIdentity } from "../shared/models.ts"

const text = Schema.String.check(Schema.isMaxLength(2048))
const name = Schema.String.check(Schema.isMaxLength(256))
const count = Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }))
const optionalText = Schema.optionalKey(text)
const nullableText = Schema.optionalKey(Schema.NullOr(text))

/** All documented GitHub /user fields, with provider spelling and nulls retained.
 * Only the numeric ID establishes identity. Other fields are optional because
 * availability differs by permission and provider response. This does not fetch
 * repositories, email lists, or any additional endpoint. Unknown fields are omitted.
 * URLs are metadata, not approved redirect or server-fetch targets. */
export const GitHubUserProfile = Schema.Struct({
  id: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER })),
  login: Schema.optionalKey(Schema.NonEmptyString.check(Schema.isMaxLength(256))),
  name: Schema.optionalKey(Schema.NullOr(name)),
  user_view_type: optionalText,
  node_id: optionalText,
  avatar_url: optionalText,
  gravatar_id: nullableText,
  url: optionalText,
  html_url: optionalText,
  followers_url: optionalText,
  following_url: optionalText,
  gists_url: optionalText,
  starred_url: optionalText,
  subscriptions_url: optionalText,
  organizations_url: optionalText,
  repos_url: optionalText,
  events_url: optionalText,
  received_events_url: optionalText,
  type: optionalText,
  site_admin: Schema.optionalKey(Schema.Boolean),
  company: nullableText,
  blog: nullableText,
  location: nullableText,
  email: Schema.optionalKey(Schema.NullOr(Schema.String.check(Schema.isMaxLength(320)))),
  notification_email: Schema.optionalKey(
    Schema.NullOr(Schema.String.check(Schema.isMaxLength(320)))
  ),
  hireable: Schema.optionalKey(Schema.NullOr(Schema.Boolean)),
  bio: nullableText,
  twitter_username: nullableText,
  public_repos: Schema.optionalKey(count),
  public_gists: Schema.optionalKey(count),
  followers: Schema.optionalKey(count),
  following: Schema.optionalKey(count),
  created_at: optionalText,
  updated_at: optionalText,
  private_gists: Schema.optionalKey(count),
  total_private_repos: Schema.optionalKey(count),
  owned_private_repos: Schema.optionalKey(count),
  disk_usage: Schema.optionalKey(count),
  collaborators: Schema.optionalKey(count),
  two_factor_authentication: Schema.optionalKey(Schema.Boolean),
  plan: Schema.optionalKey(
    Schema.Struct({ collaborators: count, name: text, space: count, private_repos: count })
  ),
  business_plus: Schema.optionalKey(Schema.Boolean),
  ldap_dn: optionalText
})

export type GitHubUserProfile = typeof GitHubUserProfile.Type

// oxlint-disable-next-line no-restricted-properties -- GitHub /user is an untyped, freshly authenticated JSON boundary.
const decode = Schema.decodeUnknownEffect(GitHubUserProfile)

/** @internal */
export const decodeGitHubIdentity = Effect.fnUntraced(function*(
  body: unknown
): Effect.fn.Return<PlainOAuthIdentity, OAuthProtocolRejected> {
  const value = yield* decode(body).pipe(Effect.mapError(() => OAuthProtocolRejected.make({})))
  const displayName = value.name?.trim() || value.login

  return {
    subject: String(value.id),
    profile: {
      ...(displayName === undefined ? {} : { displayName }),
      ...(value.login === undefined ? {} : { handle: value.login }),
      ...(value.avatar_url === undefined ? {} : { avatarUrl: value.avatar_url }),
      ...(value.html_url === undefined ? {} : { profileUrl: value.html_url }),
      ...(value.email === null || value.email === undefined ? {} : { email: value.email }),
      providerData: value
    }
  }
})
