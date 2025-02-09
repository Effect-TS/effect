/**
 * @since 1.0.0
 */
import * as Schema from "effect/Schema"
import * as PodAddress from "./PodAddress.js"
import * as RecipientAddress from "./RecipientAddress.js"

/**
 * @since 1.0.0
 * @category models
 */
export class EntityNotManagedByThisPodException extends Schema.TaggedError<EntityNotManagedByThisPodException>()(
  "@effect/cluster/EntityNotManagedByThisPodException",
  {
    recipientAddress: RecipientAddress.RecipientAddress
  }
) {
}

/**
 * @since 1.0.0
 * @category utils
 */
export const isEntityNotManagedByThisPodException = Schema.is(EntityNotManagedByThisPodException)

/**
 * @since 1.0.0
 * @category models
 */
export class EntityTypeNotRegisteredException extends Schema.TaggedError<EntityTypeNotRegisteredException>()(
  "@effect/cluster/EntityTypeNotRegisteredException",
  {
    entityType: Schema.String,
    podAddress: PodAddress.schema
  }
) {
}

/**
 * @since 1.0.0
 * @category utils
 */
export const isEntityTypeNotRegisteredException = Schema.is(EntityTypeNotRegisteredException)

/**
 * @since 1.0.0
 * @category models
 */
export class NoResultInProcessedMessageStateException
  extends Schema.TaggedError<NoResultInProcessedMessageStateException>()(
    "@effect/cluster/NoResultInProcessedMessageStateException",
    {}
  )
{
}

/**
 * @since 1.0.0
 * @category utils
 */
export const isNoResultInProcessedMessageStateException = Schema.is(NoResultInProcessedMessageStateException)

/**
 * @since 1.0.0
 * @category models
 */
export class PodNoLongerRegisteredException extends Schema.TaggedError<PodNoLongerRegisteredException>()(
  "@effect/cluster/PodNoLongerRegisteredException",
  {
    podAddress: PodAddress.schema
  }
) {
}

/**
 * @since 1.0.0
 * @category utils
 */
export const isPodNoLongerRegisteredException = Schema.is(PodNoLongerRegisteredException)

/**
 * @since 1.0.0
 * @category models
 */
export class PodUnavailableException extends Schema.TaggedError<PodUnavailableException>()(
  "@effect/cluster/PodUnavailableException",
  {
    podAddress: PodAddress.schema
  }
) {
}

/**
 * @since 1.0.0
 * @category utils
 */
export const isPodUnavailableException = Schema.is(PodUnavailableException)

/**
 * @since 1.0.0
 * @category models
 */
export class SerializationException extends Schema.TaggedError<SerializationException>()(
  "@effect/cluster/SerializationException",
  {}
) {
}

/**
 * @since 1.0.0
 * @category utils
 */
export const isSerializationException = Schema.is(SerializationException)

/**
 * @since 1.0.0
 * @category models
 */
export class ExceptionWhileOfferingMessageException
  extends Schema.TaggedError<ExceptionWhileOfferingMessageException>()(
    "@effect/cluster/ExceptionWhileOfferingMessageException",
    {}
  )
{
}

/**
 * @since 1.0.0
 * @category utils
 */
export const isExceptionWhileOfferingMessageException = Schema.is(ExceptionWhileOfferingMessageException)

/**
 * @since 1.0.0
 * @category schema
 */
export const schema = Schema.Union(
  SerializationException,
  EntityNotManagedByThisPodException,
  EntityTypeNotRegisteredException,
  PodNoLongerRegisteredException,
  PodUnavailableException,
  NoResultInProcessedMessageStateException,
  ExceptionWhileOfferingMessageException
)

/**
 * @since 1.0.0
 * @category models
 */
export type ShardingException = Schema.Schema.Type<typeof schema>
