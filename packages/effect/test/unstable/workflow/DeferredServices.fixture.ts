import { Context, Effect, Schema, SchemaGetter, Scope } from "effect"
import { DurableDeferred, Workflow, WorkflowEngine } from "effect/unstable/workflow"

export class Encoder
  extends Context.Service<Encoder, { encode(value: string): string }>()("DeferredServices/Encoder")
{}
export class ErrorEncoder
  extends Context.Service<ErrorEncoder, { encode(value: string): string }>()("DeferredServices/ErrorEncoder")
{}
export class Decoder extends Context.Service<Decoder, string>()("DeferredServices/Decoder") {}
export class ErrorDecoder extends Context.Service<ErrorDecoder, string>()("DeferredServices/ErrorDecoder") {}
export class Body extends Context.Service<Body, string>()("DeferredServices/Body") {}
export const success = Schema.String.pipe(Schema.decodeTo(Schema.String, {
  decode: SchemaGetter.passthrough(),
  encode: SchemaGetter.transformOrFail((value) => Effect.map(Encoder, (encoder) => encoder.encode(value)))
}))
export const error = Schema.String.pipe(Schema.decodeTo(Schema.String, {
  decode: SchemaGetter.passthrough(),
  encode: SchemaGetter.transformOrFail((value) => Effect.map(ErrorEncoder, (encoder) => encoder.encode(value)))
}))
export const decodedSuccess = Schema.String.pipe(Schema.decodeTo(Schema.String, {
  decode: SchemaGetter.transformOrFail((value) => Effect.map(Decoder, (prefix) => prefix + value)),
  encode: SchemaGetter.passthrough()
}))
export const decodedError = Schema.String.pipe(Schema.decodeTo(Schema.String, {
  decode: SchemaGetter.transformOrFail((value) => Effect.map(ErrorDecoder, (prefix) => prefix + value)),
  encode: SchemaGetter.passthrough()
}))
export const gate = DurableDeferred.make("success", { success })
export const errorGate = DurableDeferred.make("error", { success: Schema.String, error })
export const bothGate = DurableDeferred.make("both", { success, error })
export const plainGate = DurableDeferred.make("plain", { success: Schema.String, error: Schema.String })
export const decodingGate = DurableDeferred.make("decoding", { success: decodedSuccess, error: decodedError })
export const workflow = Workflow.make("DeferredServices", {
  payload: { id: Schema.String },
  idempotencyKey: ({ id }) => id
})
export const inInstance = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.gen(function*() {
    const scope = yield* Scope.make()
    yield* Effect.addFinalizer((exit) => Scope.close(scope, exit))
    return yield* effect.pipe(Effect.provideService(
      WorkflowEngine.WorkflowInstance,
      WorkflowEngine.WorkflowInstance.initial(workflow, "one", scope)
    ))
  }).pipe(Effect.provide(WorkflowEngine.layerMemory))
