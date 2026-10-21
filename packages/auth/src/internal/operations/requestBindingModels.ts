import * as Schema from "effect/Schema"

export const RequestBindingFlowId = Schema.String.check(
  Schema.isPattern(/^[A-Za-z0-9._:/-]{1,256}$/)
).pipe(Schema.brand("effect-auth/RequestBindingFlowId"))

export type RequestBindingFlowId = typeof RequestBindingFlowId.Type

export const RequestBindingCredential = Schema.RedactedFromValue(
  Schema.String.check(Schema.isMaxLength(2048))
)

export const RequestBindingPublic = Schema.Struct({
  flowId: RequestBindingFlowId,
  expiresAtMillis: Schema.Int
})

export type RequestBindingPublic = typeof RequestBindingPublic.Type
