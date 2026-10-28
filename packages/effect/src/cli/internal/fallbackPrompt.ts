/**
 * Fallback Prompt Deferral
 * ========================
 *
 * Lets command parsing finish ordinary flag and argument parsing before any
 * fallback prompt is shown. Shared by Param.ts and command.ts.
 */
import * as Context from "../../Context.ts"

/**
 * Marks a param parse as deferring fallback prompts. A fallback prompt that
 * would run sets `requested` and fails with its missing error instead.
 */
export interface PromptDeferral {
  requested: boolean
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
