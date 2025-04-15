/**
 * @since 1.0.0
 */
import * as Inspectable from "effect/Inspectable"

/**
 * @since 1.0.0
 * @category Models
 */
export interface Resource {
  /** Resource attributes */
  attributes: Array<KeyValue>
  /** Resource droppedAttributesCount */
  droppedAttributesCount: number
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = (options: {
  readonly serviceName: string
  readonly serviceVersion?: string | undefined
  readonly attributes?: Record<string, unknown> | undefined
}): Resource => {
  const resourceAttributes = options.attributes
    ? entriesToAttributes(Object.entries(options.attributes))
    : []
  resourceAttributes.push({
    key: "service.name",
    value: {
      stringValue: options.serviceName
    }
  })
  if (options.serviceVersion) {
    resourceAttributes.push({
      key: "service.version",
      value: {
        stringValue: options.serviceVersion
      }
    })
  }

  return {
    attributes: resourceAttributes,
    droppedAttributesCount: 0
  }
}

/**
 * @since 1.0.0
 * @category Attributes
 */
export const entriesToAttributes = (entries: Iterable<[string, unknown]>): Array<KeyValue> => {
  const attributes: Array<KeyValue> = []
  for (const [key, value] of entries) {
    attributes.push({
      key,
      value: unknownToAttributeValue(value)
    })
  }
  return attributes
}

/**
 * @since 1.0.0
 * @category Attributes
 */
export const unknownToAttributeValue = (value: unknown): AnyValue => {
  switch (typeof value) {
    case "string":
      return {
        stringValue: value
      }
    case "bigint":
      return {
        intValue: Number(value)
      }
    case "number":
      return Number.isInteger(value)
        ? {
          intValue: value
        }
        : {
          doubleValue: value
        }
    case "boolean":
      return {
        boolValue: value
      }
    default:
      return {
        stringValue: Inspectable.toStringUnknown(value)
      }
  }
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface KeyValue {
  /** KeyValue key */
  key: string
  /** KeyValue value */
  value: AnyValue
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface AnyValue {
  /** AnyValue stringValue */
  stringValue?: string | null
  /** AnyValue boolValue */
  boolValue?: boolean | null
  /** AnyValue intValue */
  intValue?: number | null
  /** AnyValue doubleValue */
  doubleValue?: number | null
  /** AnyValue arrayValue */
  arrayValue?: ArrayValue
  /** AnyValue kvlistValue */
  kvlistValue?: KeyValueList
  /** AnyValue bytesValue */
  bytesValue?: Uint8Array
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface ArrayValue {
  /** ArrayValue values */
  values: Array<AnyValue>
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface KeyValueList {
  /** KeyValueList values */
  values: Array<KeyValue>
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface LongBits {
  low: number
  high: number
}

/**
 * @since 1.0.0
 * @category Models
 */
export type Fixed64 = LongBits | string | number
