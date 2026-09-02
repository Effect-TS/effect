import * as Schema from "../../../Schema.ts"

// Kept in a leaf module because both AiError and Response expose these schemas.

export const HttpRequestDetails = Schema.Struct({
  method: Schema.Literals(["GET", "POST", "PATCH", "PUT", "DELETE", "HEAD", "OPTIONS", "TRACE"]),
  url: Schema.String,
  urlParams: Schema.Array(Schema.Tuple([Schema.String, Schema.String])),
  hash: Schema.optional(Schema.String),
  headers: Schema.Record(
    Schema.String,
    Schema.Union([
      Schema.String,
      Schema.Redacted(Schema.String)
    ])
  )
}).annotate({ identifier: "HttpRequestDetails" })

export const HttpResponseDetails = Schema.Struct({
  status: Schema.Int,
  headers: Schema.Record(
    Schema.String,
    Schema.Union([
      Schema.String,
      Schema.Redacted(Schema.String)
    ])
  )
}).annotate({ identifier: "HttpResponseDetails" })
