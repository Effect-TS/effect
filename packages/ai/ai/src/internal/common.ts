import * as Schema from "effect/Schema"

/** @internal */
export const ToolCallId = Schema.String.pipe(
  Schema.brand("ToolCallId"),
  Schema.annotations({ identifier: "@effect/ai/ToolCallId" })
)

/** @internal */
export const ProviderMetadata = Schema.Record({
  key: Schema.String,
  value: Schema.Record({ key: Schema.String, value: Schema.Unknown })
}).annotations({ identifier: "@effect/ai/ProviderMetadata" })
