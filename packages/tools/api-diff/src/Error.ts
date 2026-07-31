import * as Schema from "effect/Schema"

export class ApiDiffError extends Schema.TaggedErrorClass<ApiDiffError>()("ApiDiffError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Defect())
}) {}
