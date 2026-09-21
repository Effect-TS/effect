import * as Schema from "effect/Schema"

export class SpikeError extends Schema.TaggedError<SpikeError>()("SpikeError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Defect())
}) {}
