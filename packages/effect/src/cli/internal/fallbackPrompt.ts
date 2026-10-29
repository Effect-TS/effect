/**
 * Fallback Prompt Deferral
 * ========================
 *
 * Lets command parsing finish ordinary flag and argument parsing before any
 * fallback prompt is shown. Shared by Param.ts and command.ts.
 */
import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"

/**
 * Runs right before a fallback prompt is shown. Command parsing uses it to
 * pause the param until the command resumes deferred prompts. By default the
 * prompt runs immediately.
 */
export const PromptDeferral: Context.Reference<Effect.Effect<void>> = Context.Reference<Effect.Effect<void>>(
  "effect/cli/internal/PromptDeferral",
  { defaultValue: () => Effect.void }
)
