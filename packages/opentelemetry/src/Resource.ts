/**
 * @since 1.0.0
 */
import * as Resources from "@opentelemetry/resources"
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_TELEMETRY_SDK_LANGUAGE,
  SEMRESATTRS_TELEMETRY_SDK_NAME,
  TELEMETRYSDKLANGUAGEVALUES_NODEJS,
  TELEMETRYSDKLANGUAGEVALUES_WEBJS
} from "@opentelemetry/semantic-conventions"
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
  readonly attributes?: Resources.ResourceAttributes
}) => {
  const attributes: Record<string, string> = {
    ...(config.attributes ?? undefined),
    [SEMRESATTRS_SERVICE_NAME]: config.serviceName,
    [SEMRESATTRS_TELEMETRY_SDK_NAME]: "@effect/opentelemetry",
    [SEMRESATTRS_TELEMETRY_SDK_LANGUAGE]: typeof (globalThis as any).document === "undefined"
      ? TELEMETRYSDKLANGUAGEVALUES_NODEJS
      : TELEMETRYSDKLANGUAGEVALUES_WEBJS
  }
  if (config.serviceVersion) {
    attributes[SEMRESATTRS_SERVICE_VERSION] = config.serviceVersion
  }
  return Layer.succeed(
    Resource,
    new Resources.Resource(attributes)
  )
}

/**
 * @since 1.0.0
 * @category layer
 */
export const layerFromEnv = (
  additionalAttributes?:
    | Resources.ResourceAttributes
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
          return Arr.reduce(attrs, {} as Resources.ResourceAttributes, (acc, attr) => {
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
        attributes[SEMRESATTRS_SERVICE_NAME] = serviceName.value
      }
      if (additionalAttributes) {
        Object.assign(attributes, additionalAttributes)
      }
      return new Resources.Resource(attributes)
    })
  )

/**
 * @since 2.0.0
 * @category layer
 */
export const layerEmpty = Layer.succeed(
  Resource,
  Resources.Resource.empty()
)
