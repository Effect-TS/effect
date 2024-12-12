/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import { constFalse } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Option from "effect/Option"
import type { ReadonlyRecord } from "effect/Record"
import * as Schema from "effect/Schema"
import type { DeepMutable, Mutable } from "effect/Types"
import * as HttpApi from "./HttpApi.js"
import * as HttpApiMiddleware from "./HttpApiMiddleware.js"
import * as HttpApiSchema from "./HttpApiSchema.js"
import type { HttpApiSecurity } from "./HttpApiSecurity.js"
import * as HttpMethod from "./HttpMethod.js"
import * as JsonSchema from "./OpenApiJsonSchema.js"

/**
 * @since 1.0.0
 * @category annotations
 */
export class Identifier extends Context.Tag("@effect/platform/OpenApi/Identifier")<Identifier, string>() {}

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
export class ExternalDocs
  extends Context.Tag("@effect/platform/OpenApi/ExternalDocs")<ExternalDocs, OpenAPISpecExternalDocs>()
{}

/**
 * @since 1.0.0
 * @category annotations
 */
export class Servers
  extends Context.Tag("@effect/platform/OpenApi/Servers")<Servers, ReadonlyArray<OpenAPISpecServer>>()
{}

/**
 * @since 1.0.0
 * @category annotations
 */
export class Format extends Context.Tag("@effect/platform/OpenApi/Format")<Format, string>() {}

/**
 * @since 1.0.0
 * @category annotations
 */
export class Summary extends Context.Tag("@effect/platform/OpenApi/Summary")<Summary, string>() {}

/**
 * @since 1.0.0
 * @category annotations
 */
export class Deprecated extends Context.Tag("@effect/platform/OpenApi/Deprecated")<Deprecated, boolean>() {}

/**
 * @since 1.0.0
 * @category annotations
 */
export class Override extends Context.Tag("@effect/platform/OpenApi/Override")<Override, Record<string, unknown>>() {}

/**
 * @since 1.0.0
 * @category annotations
 */
export class Exclude extends Context.Reference<Exclude>()("@effect/platform/OpenApi/Exclude", {
  defaultValue: constFalse
}) {}

/**
 * Transforms the generated OpenAPI specification
 * @since 1.0.0
 * @category annotations
 */
export class Transform extends Context.Tag("@effect/platform/OpenApi/Transform")<
  Transform,
  (openApiSpec: Record<string, any>) => Record<string, any>
>() {}

const contextPartial = <Tags extends Record<string, Context.Tag<any, any>>>(tags: Tags): (
  options: {
    readonly [K in keyof Tags]?: Context.Tag.Service<Tags[K]> | undefined
  }
) => Context.Context<never> => {
  const entries = Object.entries(tags)
  return (options) => {
    let context = Context.empty()
    for (const [key, tag] of entries) {
      if (options[key] !== undefined) {
        context = Context.add(context, tag, options[key]!)
      }
    }
    return context
  }
}

/**
 * @since 1.0.0
 * @category annotations
 */
export const annotations: (
  options: {
    readonly identifier?: string | undefined
    readonly title?: string | undefined
    readonly version?: string | undefined
    readonly description?: string | undefined
    readonly license?: OpenAPISpecLicense | undefined
    readonly summary?: string | undefined
    readonly externalDocs?: OpenAPISpecExternalDocs | undefined
    readonly servers?: ReadonlyArray<OpenAPISpecServer> | undefined
    readonly format?: string | undefined
    readonly override?: Record<string, unknown> | undefined
    readonly exclude?: boolean | undefined
    readonly transform?: ((openApiSpec: Record<string, any>) => Record<string, any>) | undefined
  }
) => Context.Context<never> = contextPartial({
  identifier: Identifier,
  title: Title,
  version: Version,
  description: Description,
  license: License,
  summary: Summary,
  externalDocs: ExternalDocs,
  servers: Servers,
  format: Format,
  override: Override,
  exclude: Exclude,
  transform: Transform
})

const apiCache = globalValue("@effect/platform/OpenApi/apiCache", () => new WeakMap<HttpApi.HttpApi.Any, OpenAPISpec>())

/**
 * @category constructors
 * @since 1.0.0
 */
export const fromApi = <A extends HttpApi.HttpApi.Any>(self: A): OpenAPISpec => {
  if (apiCache.has(self)) {
    return apiCache.get(self)!
  }
  const api = self as unknown as HttpApi.HttpApi.AnyWithProps
  const jsonSchemaDefs: Record<string, JsonSchema.JsonSchema> = {}
  let spec: DeepMutable<OpenAPISpec> = {
    openapi: "3.1.0",
    info: {
      title: Context.getOrElse(api.annotations, Title, () => "Api"),
      version: Context.getOrElse(api.annotations, Version, () => "0.0.1")
    },
    paths: {},
    tags: [],
    components: {
      schemas: jsonSchemaDefs,
      securitySchemes: {}
    },
    security: []
  }
  function makeJsonSchemaOrRef(schema: Schema.Schema.All): JsonSchema.JsonSchema {
    return JsonSchema.makeWithDefs(schema as any, {
      defs: jsonSchemaDefs
    })
  }
  function registerSecurity(
    name: string,
    security: HttpApiSecurity
  ) {
    if (spec.components!.securitySchemes![name]) {
      return
    }
    const scheme = makeSecurityScheme(security)
    spec.components!.securitySchemes![name] = scheme
  }
  Option.map(Context.getOption(api.annotations, HttpApi.AdditionalSchemas), (componentSchemas) => {
    componentSchemas.forEach((componentSchema) => makeJsonSchemaOrRef(componentSchema))
  })
  Option.map(Context.getOption(api.annotations, Description), (description) => {
    spec.info.description = description
  })
  Option.map(Context.getOption(api.annotations, License), (license) => {
    spec.info.license = license
  })
  Option.map(Context.getOption(api.annotations, Summary), (summary) => {
    spec.info.summary = summary as any
  })
  Option.map(Context.getOption(api.annotations, Servers), (servers) => {
    spec.servers = servers as any
  })
  Option.map(Context.getOption(api.annotations, Override), (override) => {
    Object.assign(spec, override)
  })
  api.middlewares.forEach((middleware) => {
    if (!HttpApiMiddleware.isSecurity(middleware)) {
      return
    }
    for (const [name, security] of Object.entries(middleware.security)) {
      registerSecurity(name, security)
      spec.security!.push({ [name]: [] })
    }
  })
  HttpApi.reflect(api as any, {
    onGroup({ group }) {
      if (Context.get(group.annotations, Exclude)) {
        return
      }
      let tag: Mutable<OpenAPISpecTag> = {
        name: Context.getOrElse(group.annotations, Title, () => group.identifier)
      }
      Option.map(Context.getOption(group.annotations, Description), (description) => {
        tag.description = description
      })
      Option.map(Context.getOption(group.annotations, ExternalDocs), (externalDocs) => {
        tag.externalDocs = externalDocs
      })
      Option.map(Context.getOption(group.annotations, Override), (override) => {
        Object.assign(tag, override)
      })
      Option.map(Context.getOption(group.annotations, Transform), (fn) => {
        tag = fn(tag) as OpenAPISpecTag
      })
      spec.tags!.push(tag)
    },
    onEndpoint({ endpoint, errors, group, mergedAnnotations, middleware, payloads, successes }) {
      if (Context.get(mergedAnnotations, Exclude)) {
        return
      }
      const path = endpoint.path.replace(/:(\w+)[^/]*/g, "{$1}")
      const method = endpoint.method.toLowerCase() as OpenAPISpecMethodName
      let op: DeepMutable<OpenAPISpecOperation> = {
        tags: [Context.getOrElse(group.annotations, Title, () => group.identifier)],
        operationId: Context.getOrElse(
          endpoint.annotations,
          Identifier,
          () => group.topLevel ? endpoint.name : `${group.identifier}.${endpoint.name}`
        ),
        parameters: [],
        security: [],
        responses: {}
      }
      Option.map(Context.getOption(endpoint.annotations, Description), (description) => {
        op.description = description
      })
      Option.map(Context.getOption(endpoint.annotations, Summary), (summary) => {
        op.summary = summary
      })
      Option.map(Context.getOption(endpoint.annotations, Deprecated), (deprecated) => {
        op.deprecated = deprecated
      })
      Option.map(Context.getOption(endpoint.annotations, ExternalDocs), (externalDocs) => {
        op.externalDocs = externalDocs
      })
      middleware.forEach((middleware) => {
        if (!HttpApiMiddleware.isSecurity(middleware)) {
          return
        }
        for (const [name, security] of Object.entries(middleware.security)) {
          registerSecurity(name, security)
          op.security!.push({ [name]: [] })
        }
      })
      if (payloads.size > 0) {
        const content: Mutable<OpenApiSpecContent> = {}
        payloads.forEach(({ ast }, contentType) => {
          content[contentType as OpenApiSpecContentType] = {
            schema: makeJsonSchemaOrRef(Schema.make(ast))
          }
        })
        op.requestBody = { content, required: true }
      }
      for (const [status, { ast, description }] of successes) {
        if (op.responses![status]) continue
        op.responses![status] = {
          description: Option.getOrElse(description, () => "Success")
        }
        ast.pipe(
          Option.filter((ast) => !HttpApiSchema.getEmptyDecodeable(ast)),
          Option.map((ast) => {
            op.responses![status].content = {
              "application/json": {
                schema: makeJsonSchemaOrRef(Schema.make(ast))
              }
            }
          })
        )
      }
      if (Option.isSome(endpoint.pathSchema)) {
        const schema = makeJsonSchemaOrRef(endpoint.pathSchema.value) as JsonSchema.Object
        if ("properties" in schema) {
          Object.entries(schema.properties).forEach(([name, jsonSchema]) => {
            op.parameters!.push({
              name,
              in: "path",
              schema: jsonSchema,
              required: schema.required.includes(name),
              ...(jsonSchema.description ? { description: jsonSchema.description } : {})
            })
          })
        }
      }
      if (!HttpMethod.hasBody(endpoint.method) && Option.isSome(endpoint.payloadSchema)) {
        const schema = makeJsonSchemaOrRef(endpoint.payloadSchema.value) as JsonSchema.Object
        if ("properties" in schema) {
          Object.entries(schema.properties).forEach(([name, jsonSchema]) => {
            op.parameters!.push({
              name,
              in: "query",
              schema: jsonSchema,
              required: schema.required.includes(name),
              ...(jsonSchema.description ? { description: jsonSchema.description } : {})
            })
          })
        }
      }
      if (Option.isSome(endpoint.headersSchema)) {
        const schema = makeJsonSchemaOrRef(endpoint.headersSchema.value) as JsonSchema.Object
        if ("properties" in schema) {
          Object.entries(schema.properties).forEach(([name, jsonSchema]) => {
            op.parameters!.push({
              name,
              in: "header",
              schema: jsonSchema,
              required: schema.required.includes(name),
              ...(jsonSchema.description ? { description: jsonSchema.description } : {})
            })
          })
        }
      }
      if (Option.isSome(endpoint.urlParamsSchema)) {
        const schema = makeJsonSchemaOrRef(endpoint.urlParamsSchema.value) as JsonSchema.Object
        if ("properties" in schema) {
          Object.entries(schema.properties).forEach(([name, jsonSchema]) => {
            op.parameters!.push({
              name,
              in: "query",
              schema: jsonSchema,
              required: schema.required.includes(name),
              ...(jsonSchema.description ? { description: jsonSchema.description } : {})
            })
          })
        }
      }
      for (const [status, { ast, description }] of errors) {
        if (op.responses![status]) continue
        op.responses![status] = {
          description: Option.getOrElse(description, () => "Error")
        }
        ast.pipe(
          Option.filter((ast) => !HttpApiSchema.getEmptyDecodeable(ast)),
          Option.map((ast) => {
            op.responses![status].content = {
              "application/json": {
                schema: makeJsonSchemaOrRef(Schema.make(ast))
              }
            }
          })
        )
      }
      if (!spec.paths[path]) {
        spec.paths[path] = {}
      }
      Option.map(Context.getOption(endpoint.annotations, Override), (override) => {
        Object.assign(op, override)
      })
      Option.map(Context.getOption(endpoint.annotations, Transform), (transformFn) => {
        op = transformFn(op)
      })
      spec.paths[path][method] = op
    }
  })

  Option.map(Context.getOption(api.annotations, Transform), (transformFn) => {
    spec = transformFn(spec) as OpenAPISpec
  })

  apiCache.set(self, spec)

  return spec
}

const makeSecurityScheme = (security: HttpApiSecurity): OpenAPISecurityScheme => {
  const meta: Mutable<Partial<OpenAPISecurityScheme>> = {}
  Option.map(Context.getOption(security.annotations, Description), (description) => {
    meta.description = description
  })
  switch (security._tag) {
    case "Basic": {
      return {
        ...meta,
        type: "http",
        scheme: "basic"
      }
    }
    case "Bearer": {
      const format = Context.getOption(security.annotations, Format).pipe(
        Option.map((format) => ({ bearerFormat: format })),
        Option.getOrUndefined
      )
      return {
        ...meta,
        type: "http",
        scheme: "bearer",
        ...format
      }
    }
    case "ApiKey": {
      return {
        ...meta,
        type: "apiKey",
        name: security.key,
        in: security.in
      }
    }
  }
}

/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPISpec {
  readonly openapi: "3.1.0"
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
  readonly summary?: string
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
  readonly schema: JsonSchema.JsonSchema
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
export type OpenApiSpecContentType = "application/json" | "application/xml" | "multipart/form-data" | "text/plain"

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
  readonly schema: JsonSchema.JsonSchema
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
  readonly schema?: JsonSchema.JsonSchema
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
  readonly schemas?: ReadonlyRecord<string, JsonSchema.JsonSchema>
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
