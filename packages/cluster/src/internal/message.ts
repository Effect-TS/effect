import * as PrimaryKey from "effect/PrimaryKey"
import * as Schema from "effect/Schema"
import type * as Types from "effect/Types"
import type * as Message from "../Message.js"

/** @internal */
export function isMessageWithResult(value: unknown): value is Message.Message<unknown, unknown, unknown, unknown> {
  return (
    typeof value === "object" && value !== null &&
    Schema.symbolWithResult in value
  )
}

/** @internal */
export function exitSchema<A extends Message.Message.Any>(
  message: A
): Schema.Schema<Message.Message.Exit<A>, unknown> {
  return Schema.exitSchema(message as any) as any
}

/** @internal */
export function successSchema<A extends Message.Message.Any>(
  message: A
): Schema.Schema<Message.Message.Success<A>, unknown> {
  return Schema.successSchema(message as any) as any
}

/** @internal */
export function failureSchema<A extends Message.Message.Any>(
  message: A
): Schema.Schema<Message.Message.Error<A>, unknown> {
  return Schema.failureSchema(message as any) as any
}

/**
 * @since 1.0.0
 * @category schemas
 */
export const TaggedMessage_ = <Self>() =>
<Tag extends string, E, IE, A, IA, Fields extends Schema.Struct.Fields>(
  tag: Tag,
  failure: Schema.Schema<E, IE, never>,
  success: Schema.Schema<A, IA, never>,
  fields: Fields,
  messageToId: (message: Schema.Struct.Encoded<Fields>) => string
): Message.TaggedMessageConstructor<
  Tag,
  Self,
  Schema.Schema.Context<Fields[keyof Fields]>,
  Types.Simplify<Schema.Struct.Encoded<Fields>>,
  Types.Simplify<Schema.Struct.Type<Fields>>,
  IE,
  E,
  IA,
  A
> => {
  return class extends (Schema.TaggedRequest<{}>()(tag, { failure, success, payload: fields }) as any) {
    constructor(props: any, disableValidation?: boolean) {
      super(props, disableValidation)
      ;(this as any)[PrimaryKey.symbol] = () => messageToId(this as any)
    }
  } as any
}
