/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"

/**
 * A `RecipientAddress` represents the unique address of an entity which can
 * receive a message and perform some behaviour based on that message.
 *
 * The address is composed of the recipient type as well as an identifier for
 * the desired entity.
 *
 * @since 1.0.0
 * @category models
 */
export class RecipientAddress extends Schema.Class<RecipientAddress>(
  "@effect/cluster/RecipientAddress"
)({
  shardId: Schema.Int.pipe(Schema.positive()),
  entityId: Schema.NonEmptyString,
  entityType: Schema.NonEmptyString
}) {}

/**
 * @since 1.0.0
 */
export namespace RecipientAddress {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Encoded = Schema.Schema.Encoded<typeof RecipientAddress>
}
