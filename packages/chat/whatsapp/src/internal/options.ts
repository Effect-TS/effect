import * as Context from "effect/Context"

/** @internal */
export interface PostOptions {
  readonly linkPreview?: boolean | undefined
  readonly listButton?: string | undefined
  readonly buttonsSection?: string | undefined
}

/** @internal */
export const CurrentPostOptions = Context.Reference<PostOptions>("@effect/chat-whatsapp/CurrentPostOptions", {
  defaultValue: () => ({})
})

/** @internal */
export const defaultListButton = "Options"

/** @internal */
export const defaultButtonsSection = "Actions"
