import * as Schema from "../../../Schema.ts"
import * as AiError from "../AiError.ts"

/**
 * Encodes an `AiError` for a serialized response or prompt part.
 *
 * `AiError` is a self-referential `Schema.Error` class, so its service types
 * widen to `any`; the cast mirrors how `Toolkit` encodes the same schema.
 *
 * @internal
 */
export const encodeAiError = Schema.encodeSync(AiError.AiError as any) as (
  error: AiError.AiError
) => AiError.AiErrorEncoded
