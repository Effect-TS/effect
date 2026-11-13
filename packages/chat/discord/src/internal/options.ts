import * as Context from "effect/Context"

/** @internal */
export interface PostOptions {
  readonly notify?: {
    readonly users?: ReadonlyArray<string> | undefined
    readonly roles?: ReadonlyArray<string> | undefined
    readonly everyone?: boolean | undefined
    readonly repliedUser?: boolean | undefined
  } | undefined
  readonly suppressEmbeds?: boolean | undefined
  readonly failIfNotExists?: boolean | undefined
  readonly autoArchiveDuration?: 60 | 1440 | 4320 | 10080 | undefined
}

/** @internal */
export const CurrentPostOptions = Context.Reference<PostOptions>("@effect/chat-discord/CurrentPostOptions", {
  defaultValue: () => ({})
})

/**
 * Discord's `SUPPRESS_EMBEDS` message flag.
 *
 * @internal
 */
export const SUPPRESS_EMBEDS = 1 << 2

/**
 * The `allowed_mentions` for a write: nobody, unless `notify` says otherwise.
 *
 * @internal
 */
export const allowedMentions = (notify: PostOptions["notify"]) => ({
  parse: notify?.everyone === true ? ["everyone" as const] : [],
  users: notify?.users ?? [],
  roles: notify?.roles ?? [],
  replied_user: notify?.repliedUser === true
})

/**
 * The flags for a write.
 *
 * @internal
 */
export const flags = (options: PostOptions): number => options.suppressEmbeds === false ? 0 : SUPPRESS_EMBEDS
