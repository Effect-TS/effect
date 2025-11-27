/**
 * @since 1.0.0
 */
import * as Arr from "effect/Array"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Inspectable from "effect/Inspectable"

const ATTR_SERVICE_NAME = "service.name"
const ATTR_SERVICE_VERSION = "service.version"

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
    key: ATTR_SERVICE_NAME,
    value: {
      stringValue: options.serviceName
    }
  })
  if (options.serviceVersion) {
    resourceAttributes.push({
      key: ATTR_SERVICE_VERSION,
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
 * @category Constructors
 */
export const fromConfig: (
  options?: {
    readonly serviceName?: string | undefined
    readonly serviceVersion?: string | undefined
    readonly attributes?: Record<string, unknown> | undefined
  } | undefined
) => Effect.Effect<Resource> = Effect.fnUntraced(function*(options?: {
  readonly serviceName?: string | undefined
  readonly serviceVersion?: string | undefined
  readonly attributes?: Record<string, unknown> | undefined
}) {
  const attributes = yield* Config.string("OTEL_RESOURCE_ATTRIBUTES").pipe(
    Config.map((s) => {
      const attrs = s.split(",")
      return Arr.reduce(attrs, {} as Record<string, string>, (acc, attr) => {
        const parts = attr.split("=")
        if (parts.length !== 2) {
          return acc
        }
        acc[parts[0].trim()] = parts[1].trim()
        return acc
      })
    }),
    Config.withDefault({}),
    Effect.map((envAttrs) => ({
      ...envAttrs,
      ...options?.attributes
    }))
  )
  const serviceName = options?.serviceName ?? attributes[ATTR_SERVICE_NAME] as string ??
    (yield* Config.string("OTEL_SERVICE_NAME"))
  const serviceVersion = options?.serviceVersion ?? attributes[ATTR_SERVICE_VERSION] as string ??
    (yield* Config.string("OTEL_SERVICE_VERSION").pipe(Config.withDefault(undefined)))
  return make({
    serviceName,
    serviceVersion,
    attributes
  })
}, Effect.orDie)

/**
 * @since 1.0.0
 * @category Attributes
 */
export const unsafeServiceName = (resource: Resource): string => {
  const serviceNameAttribute = resource.attributes.find(
    (attr) => attr.key === ATTR_SERVICE_NAME
  )
  if (!serviceNameAttribute || !serviceNameAttribute.value.stringValue) {
    throw new Error("Resource does not contain a service name")
  }
  return serviceNameAttribute.value.stringValue
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
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(unknownToAttributeValue)
      }
    }
  }
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
