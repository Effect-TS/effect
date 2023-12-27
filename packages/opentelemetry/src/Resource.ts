/**
 * @since 1.0.0
 */
import * as Resources from "@opentelemetry/resources"
import { SemanticResourceAttributes, TelemetrySdkLanguageValues } from "@opentelemetry/semantic-conventions"
import { Tag } from "effect/Context"
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
export const Resource = Tag<Resource, Resources.Resource>("@effect/opentelemetry/Resource")

/**
 * @since 1.0.0
 * @category layer
 */
export const layer = (config: {
  readonly serviceName: string
  readonly serviceVersion?: string
  readonly attributes?: Resources.ResourceAttributes
}) => {
  const attributes = {
    ...(config.attributes ?? {}),
    [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
    [SemanticResourceAttributes.TELEMETRY_SDK_NAME]: "@effect/opentelemetry",
    [SemanticResourceAttributes.TELEMETRY_SDK_LANGUAGE]: typeof (globalThis as any).document === "undefined"
      ? TelemetrySdkLanguageValues.NODEJS
      : TelemetrySdkLanguageValues.WEBJS
  }
  if (config.serviceVersion) {
    attributes[SemanticResourceAttributes.SERVICE_VERSION] = config.serviceVersion
  }
  return Layer.succeed(
    Resource,
    new Resources.Resource(attributes)
  )
}
