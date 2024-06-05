import * as Schema from "@effect/schema/Schema"
import * as TreeFormatter from "@effect/schema/TreeFormatter"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import type * as Serialization from "../Serialization.js"
import * as SerializedMessage from "../SerializedMessage.js"
import * as ShardingException from "../ShardingException.js"

/** @internal */
const SerializationSymbolKey = "@effect/cluster/Serialization"

/** @internal */
export const SerializationTypeId: Serialization.SerializationTypeId = Symbol.for(
  SerializationSymbolKey
) as Serialization.SerializationTypeId

/** @internal */
export const serializationTag = Context.GenericTag<Serialization.Serialization>(SerializationSymbolKey)

/** @internal */
function jsonStringify<A, I>(value: A, schema: Schema.Schema<A, I>) {
  return pipe(
    value,
    Schema.encode(schema),
    Effect.mapError((e) => new ShardingException.SerializationException({ error: TreeFormatter.formatError(e) })),
    Effect.map((_) => JSON.stringify(_))
  )
}

/** @internal */
function jsonParse<A, I>(value: string, schema: Schema.Schema<A, I>) {
  return pipe(
    Effect.sync(() => JSON.parse(value)),
    Effect.flatMap(Schema.decode(schema)),
    Effect.mapError((e) => new ShardingException.SerializationException({ error: TreeFormatter.formatError(e) }))
  )
}

/** @internal */
export function make(
  args: Omit<Serialization.Serialization, Serialization.SerializationTypeId>
): Serialization.Serialization {
  return ({ ...args, [SerializationTypeId]: SerializationTypeId })
}

/** @internal */
export const json: Layer.Layer<Serialization.Serialization> = Layer.succeed(
  serializationTag,
  make({
    encode: (schema, message) =>
      pipe(
        jsonStringify(message, schema),
        Effect.map(SerializedMessage.make)
      ),
    decode: (schema, body) => jsonParse(body.value, schema)
  })
)
