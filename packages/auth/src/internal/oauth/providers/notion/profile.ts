import * as Schema from "effect/Schema"

const text = Schema.String.check(Schema.isMaxLength(256))
const url = Schema.String.check(Schema.isMaxLength(2048))
const id = Schema.NonEmptyString.check(Schema.isMaxLength(64))

export const NotionPerson = Schema.Struct({
  email: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(320)))
})

/** Authorizing Notion user from the token response owner.user object.
 * /v1/users/me is the bot, not this person. */
export const NotionUserProfile = Schema.Struct({
  object: Schema.optionalKey(Schema.Literal("user")),
  id,
  name: Schema.optionalKey(Schema.NullOr(text)),
  avatar_url: Schema.optionalKey(Schema.NullOr(url)),
  type: Schema.optionalKey(Schema.Literals(["person", "bot"])),
  person: Schema.optionalKey(NotionPerson),
  workspace_id: Schema.optionalKey(id),
  workspace_name: Schema.optionalKey(Schema.NullOr(text)),
  workspace_icon: Schema.optionalKey(Schema.NullOr(url)),
  bot_id: Schema.optionalKey(id)
})

export type NotionUserProfile = typeof NotionUserProfile.Type
