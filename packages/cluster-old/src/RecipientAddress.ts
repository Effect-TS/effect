/**
 * @since 1.0.0
 */
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import * as Schema from "effect/Schema"
import { TypeIdSchema } from "./internal/utils.js"

const RecipientAddressSymbolKey = "@effect/cluster/RecipientAddress"

/**
 * @since 1.0.0
 * @category symbols
 */
export const RecipientAddressTypeId: unique symbol = Symbol.for(RecipientAddressSymbolKey)

/** @internal */
const RecipientAddressTypeIdSchema = TypeIdSchema(RecipientAddressSymbolKey, RecipientAddressTypeId)

/**
 * A RecipientAddress uniquely identifies a RecipientType + EntityId instance.
 *
 * @since 1.0.0
 * @category models
 */
export class RecipientAddress extends Schema.Class<RecipientAddress>(RecipientAddressSymbolKey)({
  [RecipientAddressTypeId]: Schema.propertySignature(RecipientAddressTypeIdSchema).pipe(
    Schema.fromKey(RecipientAddressSymbolKey)
  ),
  recipientTypeName: Schema.String,
  entityId: Schema.String
}) {
  /**
   * @since 1.0.0
   */
  [Hash.symbol](): number {
    return Hash.structure({ recipientTypeName: this.recipientTypeName, entityId: this.entityId })
  }

  /**
   * @since 1.0.0
   */
  [Equal.symbol](this: RecipientAddress, that: Equal.Equal): boolean {
    if (isRecipientAddress(that)) {
      return this.recipientTypeName === that.recipientTypeName && this.entityId === that.entityId
    }
    return false
  }
}

/**
 * Ensure that given value is a RecipientAddress
 * @since 1.0.0
 * @category constructors
 */
export function isRecipientAddress(value: unknown): value is RecipientAddress {
  return typeof value === "object" && value !== null && RecipientAddressTypeId in value &&
    value[RecipientAddressTypeId] === RecipientAddressTypeId
}

/**
 * Given a name and a schema for the protocol, constructs an EntityType.
 *
 * @since 1.0.0
 * @category constructors
 */
export function makeRecipientAddress(
  recipientTypeName: string,
  entityId: string
): RecipientAddress {
  return new RecipientAddress({ [RecipientAddressTypeId]: RecipientAddressTypeId, recipientTypeName, entityId })
}
