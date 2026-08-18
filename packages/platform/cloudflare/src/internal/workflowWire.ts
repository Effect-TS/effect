/** @internal */
import type * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import * as Schema from "effect/Schema"
import * as Workflow from "effect/unstable/workflow/Workflow"
import { runWith } from "./entityWire.ts"

const AnyOrVoid = Schema.Union([Schema.Undefined, Schema.Any])

const ExitJson = Schema.toCodecJson(Schema.Exit(AnyOrVoid, AnyOrVoid, Schema.Defect()))

/** @internal */
export const encodeExit = (
  exit: Exit.Exit<unknown, unknown>,
  context: Context.Context<never>
): Effect.Effect<string> =>
  runWith(
    Effect.map(Schema.encodeUnknownEffect(ExitJson)(exit), (encoded) => JSON.stringify(encoded)),
    context
  )

/** @internal */
export const decodeExit = (
  text: string,
  context: Context.Context<never>
): Effect.Effect<Exit.Exit<unknown, unknown>> =>
  runWith(
    Schema.decodeUnknownEffect(ExitJson)(JSON.parse(text)) as Effect.Effect<Exit.Exit<unknown, unknown>, any>,
    context
  )

const resultCodecs = new WeakMap<Workflow.Any, Schema.Top>()

const resultCodec = (workflow: Workflow.Any): Schema.Top => {
  let codec = resultCodecs.get(workflow)
  if (codec === undefined) {
    codec = Schema.toCodecJson(Workflow.Result({
      success: workflow.successSchema as any,
      error: workflow.errorSchema as any
    }))
    resultCodecs.set(workflow, codec)
  }
  return codec
}

const payloadCodecs = new WeakMap<Workflow.Any, Schema.Top>()

const payloadCodec = (workflow: Workflow.Any): Schema.Top => {
  let codec = payloadCodecs.get(workflow)
  if (codec === undefined) {
    codec = Schema.toCodecJson(workflow.payloadSchema)
    payloadCodecs.set(workflow, codec)
  }
  return codec
}

/** @internal */
export const encodeResult = (
  workflow: Workflow.Any,
  result: Workflow.Result<unknown, unknown>,
  context: Context.Context<never>
): Effect.Effect<string> =>
  runWith(
    Effect.map(
      Schema.encodeUnknownEffect(resultCodec(workflow))(result),
      (encoded) => JSON.stringify(encoded)
    ),
    context
  )

/** @internal */
export const decodeResult = (
  workflow: Workflow.Any,
  text: string,
  context: Context.Context<never>
): Effect.Effect<Workflow.Result<unknown, unknown>> =>
  runWith(
    Schema.decodeUnknownEffect(resultCodec(workflow))(JSON.parse(text)) as Effect.Effect<
      Workflow.Result<unknown, unknown>,
      any
    >,
    context
  )

/** @internal */
export const encodePayload = (
  workflow: Workflow.Any,
  payload: object,
  context: Context.Context<never>
): Effect.Effect<string> =>
  runWith(
    Effect.map(
      Schema.encodeUnknownEffect(payloadCodec(workflow))(payload),
      (encoded) => JSON.stringify(encoded)
    ),
    context
  )

/** @internal */
export const decodePayload = (
  workflow: Workflow.Any,
  text: string,
  context: Context.Context<never>
): Effect.Effect<object> =>
  runWith(
    Schema.decodeUnknownEffect(payloadCodec(workflow))(JSON.parse(text)) as Effect.Effect<object, any>,
    context
  )
