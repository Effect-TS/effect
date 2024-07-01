import * as RecipientAddress from "@effect/cluster/RecipientAddress"
import * as Schema from "@effect/schema/Schema"
import * as PrimaryKey from "effect/PrimaryKey"

// Message Definition

export const TypeId: unique symbol = Symbol.for("@effect/cluster/Message")
export type TypeId = typeof TypeId

export interface Message<
  Self,
  Tag extends string,
  FieldsI,
  FieldsR,
  SuccessA,
  SuccessI,
  FailureA,
  FailureI,
  SuccessAndFailureR
> extends
  PrimaryKey.PrimaryKey,
  Schema.TaggedRequest<
    Tag,
    Self,
    FieldsI,
    FieldsR,
    SuccessA,
    SuccessI,
    FailureA,
    FailureI,
    SuccessAndFailureR
  >
{
  [TypeId]: TypeId
  toSendable(address: RecipientAddress.RecipientAddress): SendableMessage<this>
}

export interface MessageClass<
  Self,
  Tag extends string,
  Fields extends Schema.Struct.Fields,
  Failure extends Schema.Schema.All,
  Success extends Schema.Schema.All
> extends
  Schema.Class<
    Self,
    Fields,
    Schema.Struct.Encoded<Fields>,
    Schema.Struct.Context<Fields>,
    Schema.Struct.Constructor<Omit<Fields, "_tag">>,
    Message<
      Self,
      Tag,
      Schema.Struct.Encoded<Fields>,
      Schema.Struct.Context<Fields>,
      Schema.Schema.Type<Success>,
      Schema.Schema.Encoded<Success>,
      Schema.Schema.Type<Failure>,
      Schema.Schema.Encoded<Failure>,
      Schema.Schema.Context<Success> | Schema.Schema.Context<Failure>
    >,
    {}
  >
{}

export interface SendableMessage<M extends Message.Any> extends PrimaryKey.PrimaryKey {
  readonly address: RecipientAddress.RecipientAddress
  readonly message: M
}

export declare namespace Message {
  export type Any =
    | Message<any, string, any, any, any, any, any, any, any>
    | Message<any, string, any, any, any, any, never, never, any>
}

type MissingSelfGeneric<Usage extends string, Params extends string = ""> =
  `Missing \`Self\` generic - use \`class Self extends ${Usage}<Self>()(${Params}{ ... })\``

export const TaggedMessage = <Self = never>(identifier?: string) =>
<
  Tag extends string,
  Fields extends Schema.Struct.Fields,
  Failure extends Schema.Schema.All,
  Success extends Schema.Schema.All
>(
  tag: Tag,
  failure: Failure,
  success: Success,
  fields: Fields,
  getPrimaryKey: (fields: Schema.Struct.Encoded<Fields>) => string,
  annotations?: Schema.Annotations.Schema<Self>
): [Self] extends [never] ? MissingSelfGeneric<"TaggedMessage", `"Tag", SuccessSchema, FailureSchema, `> :
  MessageClass<
    Self,
    Tag,
    { readonly _tag: Schema.PropertySignature<":", Tag, never, ":", Tag, true, never> } & Fields,
    Failure,
    Success
  > =>
{
  return class TaggedMessage extends (Schema.TaggedRequest<any>(identifier)(
    tag,
    failure,
    success,
    fields,
    annotations
  ) as any) {
    constructor(
      props: { [x: string | symbol]: unknown },
      disableValidation?: boolean | {
        readonly disableValidation?: boolean
      }
    ) {
      super(props, disableValidation)
    }

    [PrimaryKey.symbol]() {
      return getPrimaryKey(this as any)
    }

    toSendable(address: RecipientAddress.RecipientAddress) {
      class SendableMessage extends Schema.TaggedRequest<any>(`SendableMessage/${PrimaryKey.value(this)}`)(
        `SendableMessage/${PrimaryKey.value(this)}`,
        failure,
        success,
        {
          address: RecipientAddress.RecipientAddress,
          message: this as any
        }
      ) {
        [PrimaryKey.symbol]() {
          return (
            PrimaryKey.value(this.message as any) +
            "@" +
            this.address.recipientTypeName + "#" +
            this.address.entityId
          )
        }
      }
      return new SendableMessage({ address, message: this })
    }
  } as any
}

// Example usage

export class Sample extends TaggedMessage<Sample>("Sample")(
  "Sample",
  Schema.Never,
  Schema.Number,
  { id: Schema.String },
  (fields) => fields.id
) {}

const sample = new Sample({ id: "1" })

const _ = sample.toSendable(RecipientAddress.makeRecipientAddress("foo", "entity-1"))

console.log(_)
