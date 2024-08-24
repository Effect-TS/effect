/**
 * @since 1.0.0
 */
import type * as JSONSchema from "@effect/schema/JSONSchema"
import * as Context from "effect/Context"
import { dual } from "effect/Function"
import type { ReadonlyRecord } from "effect/Record"
import type { ApiSecurity } from "./ApiSecurity.js"

/**
 * @since 1.0.0
 * @category annotations
 */
export class Title extends Context.Tag("@effect/platform/OpenApi/Title")<Title, string>() {}

/**
 * @since 1.0.0
 * @category annotations
 */
export class Version extends Context.Tag("@effect/platform/OpenApi/Version")<Version, string>() {}

/**
 * @since 1.0.0
 * @category annotations
 */
export class Description extends Context.Tag("@effect/platform/OpenApi/Description")<Description, string>() {}

/**
 * @since 1.0.0
 * @category annotations
 */
export class License extends Context.Tag("@effect/platform/OpenApi/License")<License, OpenAPISpecLicense>() {}

/**
 * @since 1.0.0
 * @category annotations
 */
export class Security extends Context.Tag("@effect/platform/OpenApi/Security")<Security, ApiSecurity>() {}

/**
 * @since 1.0.0
 * @category annotations
 */
export class ExternalDocs
  extends Context.Tag("@effect/platform/OpenApi/ExternalDocs")<ExternalDocs, OpenAPISpecExternalDocs>()
{}

/**
 * @since 1.0.0
 * @category annotations
 */
export const annotations = (annotations: {
  readonly title?: string | undefined
  readonly description?: string | undefined
  readonly version?: string | undefined
  readonly license?: OpenAPISpecLicense | undefined
  readonly security?: ApiSecurity | undefined
  readonly externalDocs?: OpenAPISpecExternalDocs | undefined
}): Context.Context<never> => {
  let context = Context.empty()
  if (annotations.title !== undefined) {
    context = Context.add(context, Title, annotations.title)
  }
  if (annotations.description !== undefined) {
    context = Context.add(context, Description, annotations.description)
  }
  if (annotations.version !== undefined) {
    context = Context.add(context, Version, annotations.version)
  }
  if (annotations.license !== undefined) {
    context = Context.add(context, License, annotations.license)
  }
  if (annotations.security !== undefined) {
    context = Context.add(context, Security, annotations.security)
  }
  if (annotations.externalDocs !== undefined) {
    context = Context.add(context, ExternalDocs, annotations.externalDocs)
  }
  return context
}

/**
 * @since 1.0.0
 * @category annotations
 */
export interface Annotatable {
  readonly annotations: Context.Context<never>
}

/**
 * @since 1.0.0
 * @category annotations
 */
export const annotate: {
  (annotations: {
    readonly title?: string | undefined
    readonly description?: string | undefined
    readonly version?: string | undefined
    readonly license?: OpenAPISpecLicense | undefined
    readonly security?: ApiSecurity | undefined
    readonly externalDocs?: OpenAPISpecExternalDocs | undefined
  }): <A extends Annotatable>(self: A) => A
  <A extends Annotatable>(self: A, annotations: {
    readonly title?: string | undefined
    readonly description?: string | undefined
    readonly version?: string | undefined
    readonly license?: OpenAPISpecLicense | undefined
    readonly security?: ApiSecurity | undefined
    readonly externalDocs?: OpenAPISpecExternalDocs | undefined
  }): A
} = dual(2, <A extends Annotatable>(self: A, annotations_: {
  readonly title?: string | undefined
  readonly description?: string | undefined
  readonly version?: string | undefined
  readonly license?: OpenAPISpecLicense | undefined
  readonly security?: ApiSecurity | undefined
  readonly externalDocs?: OpenAPISpecExternalDocs | undefined
}): A => {
  const context = Context.merge(
    self.annotations,
    annotations(annotations_)
  )
  return Object.assign(Object.create(Object.getPrototypeOf(self)), self, {
    annotations: context
  })
})

/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPISpec {
  readonly openapi: "3.0.3"
  readonly info: OpenAPISpecInfo
  readonly servers?: Array<OpenAPISpecServer>
  readonly paths: OpenAPISpecPaths
  readonly components?: OpenAPIComponents
  readonly security?: Array<OpenAPISecurityRequirement>
  readonly tags?: Array<OpenAPISpecTag>
  readonly externalDocs?: OpenAPISpecExternalDocs
}

/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPISpecInfo {
  readonly title: string
  readonly version: string
  readonly description?: string
  readonly license?: OpenAPISpecLicense
}

/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPISpecTag {
  readonly name: string
  readonly description?: string
  readonly externalDocs?: OpenAPISpecExternalDocs
}

/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPISpecExternalDocs {
  readonly url: string
  readonly description?: string
}

/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPISpecLicense {
  readonly name: string
  readonly url?: string
}

/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPISpecServer {
  readonly url: string
  readonly description?: string
  readonly variables?: Record<string, OpenAPISpecServerVariable>
}

/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPISpecServerVariable {
  readonly default: string
  readonly enum?: [string, ...Array<string>]
  readonly description?: string
}

/**
 * @category models
 * @since 1.0.0
 */
export type OpenAPISpecPaths = ReadonlyRecord<
  string,
  OpenAPISpecPathItem
>

/**
 * @category models
 * @since 1.0.0
 */
export type OpenAPISpecMethodName =
  | "get"
  | "put"
  | "post"
  | "delete"
  | "options"
  | "head"
  | "patch"
  | "trace"

/**
 * @category models
 * @since 1.0.0
 */
export type OpenAPISpecPathItem =
  & {
    readonly [K in OpenAPISpecMethodName]?: OpenAPISpecOperation
  }
  & {
    readonly summary?: string
    readonly description?: string
    readonly parameters?: Array<OpenAPISpecParameter>
  }

/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPISpecParameter {
  readonly name: string
  readonly in: "query" | "header" | "path" | "cookie"
  readonly schema: JSONSchema.JsonSchema7
  readonly description?: string
  readonly required?: boolean
  readonly deprecated?: boolean
  readonly allowEmptyValue?: boolean
}

/**
 * @category models
 * @since 1.0.0
 */
export type OpenAPISpecResponses = Record<number, OpenApiSpecResponse>

/**
 * @category models
 * @since 1.0.0
 */
export type OpenApiSpecContentType = "application/json" | "application/xml"

/**
 * @category models
 * @since 1.0.0
 */
export type OpenApiSpecContent = {
  readonly [K in OpenApiSpecContentType]?: OpenApiSpecMediaType
}

/**
 * @category models
 * @since 1.0.0
 */
export interface OpenApiSpecResponseHeader {
  readonly description?: string
  readonly schema: JSONSchema.JsonSchema7
}

/**
 * @category models
 * @since 1.0.0
 */
export type OpenApiSpecResponseHeaders = ReadonlyRecord<
  string,
  OpenApiSpecResponseHeader
>

/**
 * @category models
 * @since 1.0.0
 */
export interface OpenApiSpecResponse {
  readonly content?: OpenApiSpecContent
  readonly headers?: OpenApiSpecResponseHeaders
  readonly description: string
}

/**
 * @category models
 * @since 1.0.0
 */
export interface OpenApiSpecMediaType {
  readonly schema?: JSONSchema.JsonSchema7
  readonly example?: object
  readonly description?: string
}

/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPISpecRequestBody {
  readonly content: OpenApiSpecContent
  readonly description?: string
  readonly required?: boolean
}

/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPIComponents {
  readonly schemas?: ReadonlyRecord<string, JSONSchema.JsonSchema7>
  readonly securitySchemes?: ReadonlyRecord<string, OpenAPISecurityScheme>
}

/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPIHTTPSecurityScheme {
  readonly type: "http"
  readonly description?: string
  readonly scheme: "bearer" | "basic" | string
  /* only for scheme: 'bearer' */
  readonly bearerFormat?: string
}

/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPIApiKeySecurityScheme {
  readonly type: "apiKey"
  readonly description?: string
  readonly name: string
  readonly in: "query" | "header" | "cookie"
}

/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPIMutualTLSSecurityScheme {
  readonly type: "mutualTLS"
  readonly description?: string
}

/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPIOAuth2SecurityScheme {
  readonly type: "oauth2"
  readonly description?: string
  readonly flows: ReadonlyRecord<
    "implicit" | "password" | "clientCredentials" | "authorizationCode",
    ReadonlyRecord<string, unknown>
  >
}

/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPIOpenIdConnectSecurityScheme {
  readonly type: "openIdConnect"
  readonly description?: string
  readonly openIdConnectUrl: string
}

/**
 * @category models
 * @since 1.0.0
 */
export type OpenAPISecurityScheme =
  | OpenAPIHTTPSecurityScheme
  | OpenAPIApiKeySecurityScheme
  | OpenAPIMutualTLSSecurityScheme
  | OpenAPIOAuth2SecurityScheme
  | OpenAPIOpenIdConnectSecurityScheme

/**
 * @category models
 * @since 1.0.0
 */
export type OpenAPISecurityRequirement = ReadonlyRecord<string, Array<string>>

/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPISpecOperation {
  readonly requestBody?: OpenAPISpecRequestBody
  readonly responses?: OpenAPISpecResponses
  readonly operationId?: string
  readonly description?: string
  readonly parameters?: Array<OpenAPISpecParameter>
  readonly summary?: string
  readonly deprecated?: boolean
  readonly tags?: Array<string>
  readonly security?: Array<OpenAPISecurityRequirement>
  readonly externalDocs?: OpenAPISpecExternalDocs
}
