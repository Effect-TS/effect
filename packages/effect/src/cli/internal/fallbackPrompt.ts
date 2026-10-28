/**
 * Fallback Prompt Deferral
 * ========================
 *
 * Lets command parsing finish ordinary flag and argument parsing before any
 * fallback prompt is shown. Shared by Param.ts and command.ts.
 */
import * as Context from "../../Context.ts"
import type * as Effect from "../../Effect.ts"

/**
 * Pauses a param parse at its fallback prompt. The parse continues from the
 * same point once the command resumes deferred prompts.
 */
export interface PromptDeferral {
  readonly wait: Effect.Effect<void>
}

/**
 * The deferral for the param currently being parsed, or `undefined` when
 * fallback prompts run immediately.
 */
export const PromptDeferral: Context.Reference<PromptDeferral | undefined> = Context.Reference<
  PromptDeferral | undefined
>(
  "effect/cli/internal/PromptDeferral",
  { defaultValue: () => undefined }
)
