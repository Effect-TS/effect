/**
 * @since 1.0.0
 */
import * as AST from "@effect/schema/AST"
import * as JSONSchema from "@effect/schema/JSONSchema"
import * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import { dual } from "effect/Function"
import * as Option from "effect/Option"
import type { ReadonlyRecord } from "effect/Record"
import type { DeepMutable, Mutable } from "effect/Types"
import type { Api } from "./Api.js"
import { reflect } from "./ApiReflection.js"
import type { ApiSecurity } from "./ApiSecurity.js"
import * as HttpMethod from "./HttpMethod.js"

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
    readonly tags?: ReadonlyArray<OpenAPISpecTag> | undefined
  }): <A extends Annotatable>(self: A) => A
  <A extends Annotatable>(self: A, annotations: {
    readonly title?: string | undefined
    readonly description?: string | undefined
    readonly version?: string | undefined
    readonly license?: OpenAPISpecLicense | undefined
    readonly security?: ApiSecurity | undefined
    readonly externalDocs?: OpenAPISpecExternalDocs | undefined
    readonly tags?: ReadonlyArray<OpenAPISpecTag> | undefined
  }): A
} = dual(2, <A extends Annotatable>(self: A, annotations_: {
  readonly title?: string | undefined
  readonly description?: string | undefined
  readonly version?: string | undefined
  readonly license?: OpenAPISpecLicense | undefined
  readonly security?: ApiSecurity | undefined
  readonly externalDocs?: OpenAPISpecExternalDocs | undefined
  readonly tags?: ReadonlyArray<OpenAPISpecTag> | undefined
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
 * @category constructors
 * @since 1.0.0
 */
export const fromApi = <A extends Api.Any>(api: A): OpenAPISpec => {
  const spec: DeepMutable<OpenAPISpec> = {
    openapi: "3.0.3",
    info: {
      title: Context.getOrElse(api.annotations, Title, () => "Api"),
      version: Context.getOrElse(api.annotations, Version, () => "0.0.1")
    },
    paths: {},
    tags: []
  }
  Option.map(Context.getOption(api.annotations, Description), (description) => {
    spec.info.description = description
  })
  Option.map(Context.getOption(api.annotations, License), (license) => {
    spec.info.license = license
  })
  reflect(api as any, {
    onGroup({ group }) {
      const tag: Mutable<OpenAPISpecTag> = {
        name: group.name
      }
      Option.map(Context.getOption(group.annotations, Description), (description) => {
        tag.description = description
      })
      Option.map(Context.getOption(group.annotations, ExternalDocs), (externalDocs) => {
        tag.externalDocs = externalDocs
      })
      spec.tags!.push(tag)
    },
    onEndpoint({ endpoint, errors, group, success }) {
      const path = endpoint.path.replace(/:(\w+)[^/]*/g, "{$1}")
      const method = endpoint.method.toLowerCase() as OpenAPISpecMethodName
      const op: DeepMutable<OpenAPISpecOperation> = {
        tags: [group.name],
        operationId: endpoint.name,
        parameters: [],
        responses: {
          [success[1]]: {
            description: "Success"
          }
        }
      }
      Option.map(Context.getOption(endpoint.annotations, Description), (description) => {
        op.description = description
      })
      Option.map(Context.getOption(endpoint.annotations, ExternalDocs), (externalDocs) => {
        op.externalDocs = externalDocs
      })
      endpoint.payloadSchema.pipe(
        Option.filter(() => HttpMethod.hasBody(endpoint.method)),
        Option.map((schema) => {
          op.requestBody = {
            content: {
              "application/json": {
                schema: makeJsonSchema(schema)
              }
            },
            required: true
          }
        })
      )
      success[0].pipe(
        Option.map((ast) => {
          op.responses![success[1]].content = {
            "application/json": {
              schema: makeJsonSchema(Schema.make(ast))
            }
          }
        })
      )
      if (Option.isSome(endpoint.pathSchema)) {
        getPropertySignatures(AST.encodedAST(endpoint.pathSchema.value.ast)).forEach((ps) => {
          op.parameters!.push({
            name: ps.name as string,
            in: "path",
            schema: makeJsonSchema(Schema.make(ps.type)),
            required: !ps.isOptional
          })
        })
      }
      if (!HttpMethod.hasBody(endpoint.method) && Option.isSome(endpoint.payloadSchema)) {
        getPropertySignatures(AST.encodedAST(endpoint.payloadSchema.value.ast)).forEach((ps) => {
          op.parameters!.push({
            name: ps.name as string,
            in: "query",
            schema: makeJsonSchema(Schema.make(ps.type)),
            required: !ps.isOptional
          })
        })
      }
      for (const [status, ast] of errors) {
        if (op.responses![status]) continue
        op.responses![status] = {
          description: Option.getOrElse(AST.getDescriptionAnnotation(ast), () => "Error"),
          content: {
            "application/json": {
              schema: makeJsonSchema(Schema.make(ast))
            }
          }
        }
      }
      if (!spec.paths[path]) {
        spec.paths[path] = {}
      }
      spec.paths[path][method] = op
    }
  })

  return spec
}

const getPropertySignatures = (ast: AST.AST): ReadonlyArray<AST.PropertySignature> => {
  switch (ast._tag) {
    case "Union": {
      return ast.types.flatMap(getPropertySignatures)
    }
    case "TypeLiteral": {
      return ast.propertySignatures
    }
    default: {
      return []
    }
  }
}

const makeJsonSchema = (schema: Schema.Schema.All): OpenAPIJSONSchema => {
  const jsonSchema = JSONSchema.make(schema as any)
  delete jsonSchema.$schema
  return jsonSchema
}

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
export type OpenAPIJSONSchema = Omit<JSONSchema.JsonSchema7, "$schema">

/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPISpecParameter {
  readonly name: string
  readonly in: "query" | "header" | "path" | "cookie"
  readonly schema: OpenAPIJSONSchema
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
  readonly schema: OpenAPIJSONSchema
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
  readonly schema?: OpenAPIJSONSchema
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
  readonly schemas?: ReadonlyRecord<string, OpenAPIJSONSchema>
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
