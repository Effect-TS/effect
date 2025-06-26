/**
 * @since 1.0.0
 */
import type * as OtelApi from "@opentelemetry/api"
import * as Resources from "@opentelemetry/resources"
import * as OtelSemConv from "@opentelemetry/semantic-conventions"
import * as Arr from "effect/Array"
import * as Config from "effect/Config"
import { GenericTag } from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"

/**
 * @since 1.0.0
 * @category identifier
 */
export interface Resource {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category tag
 */
export const Resource = GenericTag<Resource, Resources.Resource>("@effect/opentelemetry/Resource")

/**
 * @since 1.0.0
 * @category layer
 */
export const layer = (config: {
  readonly serviceName: string
  readonly serviceVersion?: string
  readonly attributes?: OtelApi.Attributes
}) =>
  Layer.succeed(
    Resource,
    Resources.resourceFromAttributes(configToAttributes(config))
  )

/**
 * @since 1.0.0
 * @category config
 */
export const configToAttributes = (options: {
  readonly serviceName: string
  readonly serviceVersion?: string
  readonly attributes?: OtelApi.Attributes
}): Record<string, string> => {
  const attributes: Record<string, string> = {
    ...(options.attributes ?? undefined),
    [OtelSemConv.ATTR_SERVICE_NAME]: options.serviceName,
    [OtelSemConv.ATTR_TELEMETRY_SDK_NAME]: "@effect/opentelemetry",
    [OtelSemConv.ATTR_TELEMETRY_SDK_LANGUAGE]: typeof (globalThis as any).document === "undefined"
      ? OtelSemConv.TELEMETRY_SDK_LANGUAGE_VALUE_NODEJS
      : OtelSemConv.TELEMETRY_SDK_LANGUAGE_VALUE_WEBJS
  }
  if (options.serviceVersion) {
    attributes[OtelSemConv.ATTR_SERVICE_VERSION] = options.serviceVersion
  }
  return attributes
}

/**
 * @since 1.0.0
 * @category layer
 */
export const layerFromEnv = (
  additionalAttributes?:
    | OtelApi.Attributes
    | undefined
): Layer.Layer<Resource> =>
  Layer.effect(
    Resource,
    Effect.gen(function*() {
      const serviceName = yield* pipe(Config.string("OTEL_SERVICE_NAME"), Config.option, Effect.orDie)
      const attributes = yield* pipe(
        Config.string("OTEL_RESOURCE_ATTRIBUTES"),
        Config.withDefault(""),
        Config.map((s) => {
          const attrs = s.split(",")
          return Arr.reduce(attrs, {} as OtelApi.Attributes, (acc, attr) => {
            const parts = attr.split("=")
            if (parts.length !== 2) {
              return acc
            }
            acc[parts[0].trim()] = parts[1].trim()
            return acc
          })
        }),
        Effect.orDie
      )
      if (serviceName._tag === "Some") {
        attributes[OtelSemConv.ATTR_SERVICE_NAME] = serviceName.value
      }
      if (additionalAttributes) {
        Object.assign(attributes, additionalAttributes)
      }
      return Resources.resourceFromAttributes(attributes)
    })
  )

/**
 * @since 2.0.0
 * @category layer
 */
export const layerEmpty = Layer.succeed(
  Resource,
  Resources.emptyResource()
)
