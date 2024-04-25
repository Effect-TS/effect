/**
 * @since 1.0.0
 */
import * as AST from "@effect/schema/AST"
import type { ParseError } from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { absurd, pipe } from "effect/Function"
import * as Option from "effect/Option"
import type * as Record from "effect/Record"
import type * as Request from "effect/Request"
import type { Scope } from "effect/Scope"
import type * as Types from "effect/Types"
import type { FileSystem } from "../FileSystem.js"
import * as Handler from "../Handler.js"
import type { Path as Path_ } from "../Path.js"
import * as Body_ from "./Body.js"
import type * as Client from "./Client.js"
import * as ClientError from "./ClientError.js"
import * as ClientRequest from "./ClientRequest.js"
import type { Method } from "./Method.js"
import type * as Multipart from "./Multipart.js"
import * as Router from "./Router.js"
import type { RequestError } from "./ServerError.js"
import * as ServerRequest from "./ServerRequest.js"
import * as ServerResponse from "./ServerResponse.js"
import * as UrlParams_ from "./UrlParams.js"

/**
 * @since 1.0.0
 * @category annotations
 */
export const PathTag = Context.GenericTag<Router.PathInput>("@effect/platform/Http/Endpoint/Path")

/**
 * @since 1.0.0
 * @category annotations
 */
export const MethodTag = Context.GenericTag<Method>("@effect/platform/Http/Endpoint/Method")

/**
 * @since 1.0.0
 * @category annotations
 */
export const StatusTag = Context.GenericTag<number>("@effect/platform/Http/Endpoint/Status")

/**
 * @since 1.0.0
 * @category annotations
 */
export interface Annotations<A> extends Schema.Annotations.Schema<A> {
  readonly path: Router.PathInput
  readonly method?: Method | undefined
  readonly status?: number | undefined
}

const getAnnotations = Handler.getAnnotations({
  required: {
    path: PathTag
  },
  optional: {
    method: MethodTag,
    status: StatusTag
  }
})

/**
 * @since 1.0.0
 * @category annotations
 */
export const annotations: <A>(annotations: Annotations<A>) => Schema.Annotations.Schema<A> = Handler.makeAnnotations({
  required: {
    path: PathTag
  },
  optional: {
    method: MethodTag,
    status: StatusTag
  }
})

/**
 * @since 1.0.0
 * @category annotations
 */
export const annotationsWithPrefix: {
  (pathPrefix: string): <A>(annotations: Annotations<A>) => Schema.Annotations.Schema<A>
  (
    f: <A>(annotations: Annotations<A>) => Schema.Annotations.Schema<A>,
    pathPrefix: string
  ): <A>(annotations: Annotations<A>) => Schema.Annotations.Schema<A>
} = function() {
  const pathSym = Symbol.for(PathTag.key)
  if (arguments.length === 1) {
    const pathPrefix = arguments[0] as string
    return function<A>(input: Annotations<A>) {
      const result = annotations(input) as Types.Mutable<Schema.Annotations.Schema<A>>
      result[pathSym] = result[pathSym] === "/" ? pathPrefix : pathPrefix + result[pathSym]
      return result
    }
  }
  const f = arguments[0] as <A>(annotations: Annotations<A>) => Schema.Annotations.Schema<A>
  const pathPrefix = arguments[1] as string
  return function<A>(annotations: Annotations<A>) {
    const result = f(annotations) as any
    result[pathSym] = result[pathSym] === "/" ? pathPrefix : pathPrefix + result[pathSym]
    return result
  }
}

/**
 * @since 1.0.0
 * @category annotations
 */
export const errorAnnotations: <A>(
  annotations: Schema.Annotations.Schema<A> & {
    readonly status: number
  }
) => Schema.Annotations.Schema<A> = Handler
  .makeAnnotations({
    required: {
      status: StatusTag
    },
    optional: {}
  })

/**
 * @since 1.0.0
 * @category annotations
 */
export type RequestAnnotation =
  | BodyAnnotation
  | BodyUnionAnnotation
  | PathParamAnnotation
  | PathParamsAnnotation
  | UrlParamAnnotation
  | UrlParamsAnnotation
  | HeaderAnnotation
  | HeadersAnnotation

const RequestAnnotationId = Symbol.for("@effect/platform/Http/Endpoint/RequestAnnotation")

/**
 * @since 1.0.0
 * @category annotations
 */
export interface BodyAnnotation {
  readonly _tag: "Body"
  readonly format: "json" | "multipart" | "urlParamsBody"
}

/**
 * @since 1.0.0
 * @category annotations
 */
export interface BodyUnionAnnotation {
  readonly _tag: "BodyUnion"
}

/**
 * @since 1.0.0
 * @category annotations
 */
export interface PathParamAnnotation {
  readonly _tag: "PathParam"
  readonly name: string
}

/**
 * @since 1.0.0
 * @category annotations
 */
export interface PathParamsAnnotation {
  readonly _tag: "PathParams"
}

/**
 * @since 1.0.0
 * @category annotations
 */
export interface UrlParamAnnotation {
  readonly _tag: "UrlParam"
  readonly name: string
}

/**
 * @since 1.0.0
 * @category annotations
 */
export interface UrlParamsAnnotation {
  readonly _tag: "UrlParams"
}

/**
 * @since 1.0.0
 * @category annotations
 */
export interface HeaderAnnotation {
  readonly _tag: "Header"
  readonly name: string
}

/**
 * @since 1.0.0
 * @category annotations
 */
export interface HeadersAnnotation {
  readonly _tag: "Headers"
}

/**
 * @since 1.0.0
 * @category schemas
 */
export const Body = <S extends Schema.Schema.Any>(schema: S, format: "json" | "multipart" | "urlParamsBody"): S =>
  schema.annotations({
    [RequestAnnotationId]: { _tag: "Body", format }
  }) as S

/**
 * @since 1.0.0
 * @category schemas
 */
export const BodyUnion = <
  S extends {
    readonly Json?: Schema.Schema.Any
    readonly Multipart?: Schema.Schema.Any
    readonly UrlEncoded?: Schema.Schema.Any
  }
>(schemas: S): Schema.Schema<
  | (S extends { readonly Json: Schema.Schema<infer A, infer _I, infer _R> } ? {
      readonly _tag: "json"
      readonly body: A
    } :
    never)
  | (S extends { readonly Multipart: Schema.Schema<infer A, infer _I, infer _R> } ? {
      readonly _tag: "multipart"
      readonly body: A | globalThis.FormData
    } :
    never)
  | (S extends { readonly UrlEncoded: Schema.Schema<infer A, infer _I, infer _R> } ? {
      readonly _tag: "urlParamsBody"
      readonly body: A
    } :
    never),
  unknown,
  Schema.Schema.Context<S[keyof S]>
> => {
  const members: Array<Schema.Schema.Any> = []
  if (schemas.Json !== undefined) {
    members.push(Body(
      Schema.Struct({
        _tag: Schema.Literal("json"),
        body: schemas.Json
      }),
      "json"
    ))
  }
  if (schemas.Multipart !== undefined) {
    members.push(Body(
      Schema.Struct({
        _tag: Schema.Literal("multipart"),
        body: Schema.Union(schemas.Multipart, Schema.instanceOf(globalThis.FormData))
      }),
      "multipart"
    ))
  }
  if (schemas.UrlEncoded !== undefined) {
    members.push(Body(
      Schema.Struct({
        _tag: Schema.Literal("urlParamsBody"),
        body: schemas.UrlEncoded
      }),
      "urlParamsBody"
    ))
  }
  return Schema.Union(...members).annotations({
    [RequestAnnotationId]: { _tag: "BodyUnion" }
  }) as any
}

/**
 * @since 1.0.0
 * @category schemas
 */
export const BodyJson = <S extends Schema.Schema.Any>(schema: S): S => Body(schema, "json")

/**
 * @since 1.0.0
 * @category schemas
 */
export const BodyMultipart = <A, I extends Partial<Multipart.Persisted>, R>(
  schema: Schema.Schema<A, I, R>
): Schema.Schema<A | globalThis.FormData, I | globalThis.FormData, R> =>
  Body(
    Schema.Union(
      schema,
      Schema.instanceOf(globalThis.FormData)
    ),
    "multipart"
  )

/**
 * @since 1.0.0
 * @category schemas
 */
export const BodyUrlEncoded = <A, I extends Record.ReadonlyRecord<string, string | undefined>, R>(
  schema: Schema.Schema<A, I, R>
): Schema.Schema<A, I, R> => Body(schema, "urlParamsBody")

/**
 * @since 1.0.0
 * @category schemas
 */
export const UrlParam = <A, I extends string, R>(
  name: string,
  schema: Schema.Schema<A, I, R>
): Schema.Schema<A, I, R> =>
  schema.annotations({
    [RequestAnnotationId]: { _tag: "UrlParam", name }
  })

/**
 * @since 1.0.0
 * @category schemas
 */
export const UrlParams = <A, I extends Record.ReadonlyRecord<string, string | undefined>, R>(
  schema: Schema.Schema<A, I, R>
): Schema.Schema<A, I, R> =>
  schema.annotations({
    [RequestAnnotationId]: { _tag: "UrlParams" }
  })

/**
 * @since 1.0.0
 * @category schemas
 */
export const PathParam = <A, I extends string, R>(
  name: string,
  schema: Schema.Schema<A, I, R>
): Schema.Schema<A, I, R> =>
  schema.annotations({
    [RequestAnnotationId]: { _tag: "PathParam", name }
  })

/**
 * @since 1.0.0
 * @category schemas
 */
export const PathParams = <A, I extends Record.ReadonlyRecord<string, string | undefined>, R>(
  schema: Schema.Schema<A, I, R>
): Schema.Schema<A, I, R> =>
  schema.annotations({
    [RequestAnnotationId]: { _tag: "PathParams" }
  })

/**
 * @since 1.0.0
 * @category schemas
 */
export const Header = <A, I extends string, R>(
  name: string,
  schema: Schema.Schema<A, I, R>
): Schema.Schema<A, I, R> =>
  schema.annotations({
    [RequestAnnotationId]: { _tag: "Header", name: name.toLowerCase() }
  })

/**
 * @since 1.0.0
 * @category schemas
 */
export const Headers = <A, I extends Record.ReadonlyRecord<string, string | undefined>, R>(
  schema: Schema.Schema<A, I, R>
): Schema.Schema<A, I, R> =>
  schema.annotations({
    [RequestAnnotationId]: { _tag: "Headers" }
  })

const getErrorMap = <A, I, R>(
  self: Schema.Schema<A, I, R>
): Record.ReadonlyRecord<string, AST.AST> => {
  const out: Record<string, AST.AST> = {}

  function walk(ast: AST.AST, originalAST?: AST.AST): void {
    switch (ast._tag) {
      case "NeverKeyword": {
        break
      }
      case "Suspend": {
        walk(ast.f())
        break
      }
      case "Union": {
        for (let i = 0; i < ast.types.length; i++) {
          walk(ast.types[i])
        }
        break
      }
      case "Transformation": {
        walk(AST.annotations(ast.to, { ...ast.annotations, ...ast.to.annotations }), ast)
        break
      }
      default: {
        const annotation = ast.annotations[Symbol.for(StatusTag.key)] as number ?? 500
        const current = out[annotation]
        if (current !== undefined) {
          out[annotation] = current._tag === "Union"
            ? AST.Union.make([...current.types, originalAST ?? ast])
            : AST.Union.make([current, originalAST ?? ast])
        } else {
          out[annotation] = originalAST ?? ast
        }
        break
      }
    }
  }
  walk(self.ast)

  return out
}

const throwMultipleBodyError = () => {
  throw new Error("An HTTP Endpoint can only have one BodyAnnotation")
}

function getObjPath(obj: any, path: ReadonlyArray<PropertyKey>): any {
  let current: any = obj
  for (let i = 0; i < path.length; i++) {
    current = current[path[i]]
  }
  return current
}

function setObjPath(obj: any, path: ReadonlyArray<PropertyKey>, value: unknown): void {
  let current: any = obj
  let next = path[0]
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    next = path[i + 1]
    const isArray = typeof next === "number"
    if (key in current) {
      current = current[key]
    } else if (isArray) {
      current[key] = []
      current = current[key]
    } else {
      current[key] = Object.create(null)
      current = current[key]
    }
  }
  current[next!] = value
}

interface Instruction {
  (
    obj: Record<string, any>,
    request: ServerRequest.ServerRequest,
    context: Router.RouteContext,
    body: unknown
  ): void
}

/**
 * @since 1.0.0
 * @category parsers
 */
export const parse: <A extends Schema.TaggedRequest.Any, I, R>(
  schema: Handler.SchemaWithProto<A, I, R>
) => {
  readonly path: Router.PathInput
  readonly decodeServerRequest: (
    request: ServerRequest.ServerRequest,
    context: Router.RouteContext
  ) => Effect.Effect<
    A,
    | RequestError
    | ParseError
    | Multipart.MultipartError,
    R | Scope | FileSystem | Path_
  >
  readonly emptyResponse: boolean
  readonly successStatus: number
  readonly method: Method
  readonly urlParams: Option.Option<AST.TypeLiteral>
  readonly pathParams: Option.Option<AST.TypeLiteral>
  readonly headers: Option.Option<AST.TypeLiteral>
  readonly body: {
    json: Option.Option<AST.AST>
    multipart: Option.Option<AST.AST>
    urlParamsBody: Option.Option<AST.AST>
  }
  readonly errorMap: Record.ReadonlyRecord<string, AST.AST>
  readonly FailureWithStatus: Schema.Schema<
    Request.Request.Error<A>,
    readonly [status: number, error: unknown],
    R
  >
} = Handler.makeParser({
  requiredAnnotations: {
    path: PathTag
  },
  optionalAnnotations: {
    method: MethodTag,
    status: StatusTag
  }
}, ({ FailureSchema, SuccessSchema, annotations, ast, schema }) => {
  const emptyResponse = SuccessSchema.ast._tag === "VoidKeyword"
  const successStatus = Option.getOrElse(annotations.status, () => emptyResponse ? 204 : 200)
  const errorMap = getErrorMap(FailureSchema)
  const instructions: Array<Instruction> = []
  let requestBodyFound = false
  let isBodyUnion = false
  const out = {
    path: annotations.path,
    emptyResponse,
    successStatus,
    method: Option.getOrElse(annotations.method, () => requestBodyFound ? "POST" : "GET"),
    urlParams: Option.none<AST.TypeLiteral>(),
    pathParams: Option.none<AST.TypeLiteral>(),
    headers: Option.none<AST.TypeLiteral>(),
    body: {
      json: Option.none<AST.AST>(),
      multipart: Option.none<AST.AST>(),
      urlParamsBody: Option.none<AST.AST>()
    },
    errorMap
  }

  function walk(ast: AST.AST, path: ReadonlyArray<PropertyKey>, inBodyUnion = false, isOptional = false): void {
    if (RequestAnnotationId in ast.annotations) {
      const annotation = ast.annotations[RequestAnnotationId] as RequestAnnotation
      switch (annotation._tag) {
        case "Body": {
          if (requestBodyFound) {
            return throwMultipleBodyError()
          }
          requestBodyFound = true
          out.body[annotation.format] = Option.some(ast)
          instructions.push(function(obj, _request, _context, body) {
            setObjPath(obj, path, body)
          })
          break
        }
        case "BodyUnion": {
          if (requestBodyFound) {
            return throwMultipleBodyError()
          }
          requestBodyFound = true
          isBodyUnion = true
          const types = (ast as AST.Union).types
          for (let i = 0; i < types.length; i++) {
            const type = types[i]
            const annotation = type.annotations[RequestAnnotationId] as BodyAnnotation
            out.body[annotation.format] = Option.some(type)
          }
          instructions.push(function(obj, _request, _context, body) {
            setObjPath(obj, path, body)
          })
          break
        }
        case "UrlParam": {
          instructions.push(function(obj, _request, context, _body) {
            setObjPath(obj, path, context.searchParams[annotation.name])
          })
          const typeLiteral = out.urlParams._tag === "None"
            ? new AST.TypeLiteral([], [])
            : out.urlParams.value
          out.urlParams = Option.some(
            new AST.TypeLiteral([
              ...typeLiteral.propertySignatures,
              new AST.PropertySignature(annotation.name, ast, isOptional, true)
            ], typeLiteral.indexSignatures)
          )
          break
        }
        case "UrlParams": {
          const encoded = AST.encodedAST(ast)
          if (encoded._tag !== "TypeLiteral") {
            break
          }
          instructions.push(function(obj, _request, context, _body) {
            setObjPath(obj, path, context.searchParams)
          })
          out.urlParams = Option.some(
            out.urlParams._tag === "None" ?
              encoded :
              new AST.TypeLiteral([
                ...out.urlParams.value.propertySignatures,
                ...encoded.propertySignatures
              ], [
                ...out.urlParams.value.indexSignatures,
                ...encoded.indexSignatures
              ])
          )
          break
        }
        case "Header": {
          instructions.push(function(obj, request, _context, _body) {
            setObjPath(obj, path, request.headers[annotation.name])
          })
          const typeLiteral = out.headers._tag === "None"
            ? new AST.TypeLiteral([], [])
            : out.headers.value
          out.headers = Option.some(
            new AST.TypeLiteral([
              ...typeLiteral.propertySignatures,
              new AST.PropertySignature(annotation.name, ast, isOptional, true)
            ], typeLiteral.indexSignatures)
          )
          break
        }
        case "Headers": {
          const encoded = AST.encodedAST(ast)
          if (encoded._tag !== "TypeLiteral") {
            break
          }
          instructions.push(function(obj, request, _context, _body) {
            setObjPath(obj, path, request.headers)
          })
          out.headers = Option.some(
            out.headers._tag === "None" ?
              encoded :
              new AST.TypeLiteral([
                ...out.headers.value.propertySignatures,
                ...encoded.propertySignatures
              ], [
                ...out.headers.value.indexSignatures,
                ...encoded.indexSignatures
              ])
          )
          break
        }
        case "PathParam": {
          instructions.push(function(obj, _request, context, _body) {
            setObjPath(obj, path, context.params[annotation.name])
          })
          const typeLiteral = out.pathParams._tag === "None"
            ? new AST.TypeLiteral([], [])
            : out.pathParams.value
          out.pathParams = Option.some(
            new AST.TypeLiteral([
              ...typeLiteral.propertySignatures,
              new AST.PropertySignature(annotation.name, ast, isOptional, true)
            ], typeLiteral.indexSignatures)
          )
          break
        }
        case "PathParams": {
          const encoded = AST.encodedAST(ast)
          if (encoded._tag !== "TypeLiteral") {
            break
          }
          instructions.push(function(obj, _request, context, _body) {
            setObjPath(obj, path, context.params)
          })
          out.pathParams = Option.some(
            out.pathParams._tag === "None" ?
              encoded :
              new AST.TypeLiteral([
                ...out.pathParams.value.propertySignatures,
                ...encoded.propertySignatures
              ], [
                ...out.pathParams.value.indexSignatures,
                ...encoded.indexSignatures
              ])
          )
          break
        }
        default: {
          return absurd(annotation)
        }
      }
      return
    }
    switch (ast._tag) {
      case "Literal": {
        instructions.push(function(obj, _request, _context, _body) {
          setObjPath(obj, path, ast.literal)
        })
        break
      }
      case "Refinement": {
        walk(ast.from, path, inBodyUnion)
        break
      }
      case "Suspend": {
        walk(ast.f(), path, inBodyUnion)
        break
      }
      case "Transformation": {
        walk(
          AST.annotations(ast.from, {
            ...ast.annotations,
            ...ast.to.annotations
          }),
          path,
          inBodyUnion
        )
        break
      }
      case "TypeLiteral": {
        for (let i = 0; i < ast.propertySignatures.length; i++) {
          const property = ast.propertySignatures[i]
          walk(property.type, [...path, property.name], inBodyUnion, property.isOptional)
        }
        break
      }
      case "TupleType": {
        for (let i = 0; i < ast.elements.length; i++) {
          const element = ast.elements[i]
          walk(element.type, [...path, i], inBodyUnion)
        }
        break
      }
      case "Union": {
        for (let i = 0; i < ast.types.length; i++) {
          walk(ast.types[i], path, inBodyUnion)
        }
      }
    }
  }
  walk(ast, [])

  const decode = Schema.decodeUnknown(schema)

  function decodeServerRequest(
    request: ServerRequest.ServerRequest,
    context: Router.RouteContext
  ): Effect.Effect<any, any, any> {
    function withBody(body: any): unknown {
      const obj = Object.create(null)
      for (let i = 0; i < instructions.length; i++) {
        instructions[i](obj, request, context, body)
      }
      return obj
    }

    if (!requestBodyFound) {
      return decode(withBody(undefined))
    }

    const format: BodyAnnotation["format"] = request.headers["content-type"]?.includes("multipart/form-data")
      ? "multipart"
      : request.headers["content-type"]?.includes("application/x-www-form-urlencoded")
      ? "urlParamsBody"
      : "json"
    const bodyEffect = format === "urlParamsBody"
      ? Effect.map(request.urlParamsBody, Object.fromEntries)
      : request[format]
    return Effect.flatMap(bodyEffect as any, (body) =>
      decode(withBody(
        isBodyUnion ?
          { _tag: format, body } :
          body
      )))
  }

  const FailureWithStatus = Schema.Union(
    ...Object.entries(errorMap).map(([status, ast]) =>
      Schema.transform(Schema.Tuple(Schema.Number, Schema.Unknown), Schema.make(ast), {
        decode: ([, error]) => error,
        encode: (error) => [Number(status), error],
        strict: false
      })
    )
  ) as Schema.Schema<any, any, any>

  return {
    ...out,
    decodeServerRequest,
    FailureWithStatus
  } as const
})

/**
 * @since 1.0.0
 * @category parsers
 */
export const toClientRequest = <A extends Schema.TaggedRequest.Any>(
  self: A
): Effect.Effect<ClientRequest.ClientRequest, ParseError, Serializable.SerializableWithResult.Context<A>> => {
  const selfSchema = Serializable.selfSchema(self)
  return makeEncoder(selfSchema as any)(self as A) as any
}

interface EncodeInstruction {
  (request: Types.Mutable<ClientRequest.Options>, value: any): void
}

const makeEncoder: <A extends Schema.TaggedRequest.Any, I, R>(
  schema: Handler.SchemaWithProto<A, I, R>
) => (value: A) => Effect.Effect<ClientRequest.ClientRequest, ParseError, R> = Handler.makeParser({
  requiredAnnotations: {
    path: PathTag
  },
  optionalAnnotations: {
    method: MethodTag,
    status: StatusTag
  }
}, ({ annotations, schema }) => {
  let hasRequestBody = false
  const instructions: Array<EncodeInstruction> = []

  function walk(ast: AST.AST, path: ReadonlyArray<PropertyKey>): void {
    if (RequestAnnotationId in ast.annotations) {
      const annotation = ast.annotations[RequestAnnotationId] as RequestAnnotation
      switch (annotation._tag) {
        case "Body": {
          if (hasRequestBody) {
            return throwMultipleBodyError()
          }
          hasRequestBody = true
          instructions.push(function(request, value) {
            request.body = annotation.format === "json"
              ? Body_.unsafeJson(getObjPath(value, path))
              : annotation.format === "multipart"
              ? Body_.formData(getObjPath(value, path))
              : Body_.urlParams(UrlParams_.fromInput(getObjPath(value, path) as any))
          })
          break
        }
        case "BodyUnion": {
          if (hasRequestBody) {
            return throwMultipleBodyError()
          }
          hasRequestBody = true
          instructions.push(function(request, value) {
            const body = getObjPath(value, path) as { _tag: string; body: any }
            request.body = body._tag === "json"
              ? Body_.unsafeJson(body.body)
              : body._tag === "multipart"
              ? Body_.formData(body.body)
              : Body_.urlParams(UrlParams_.fromInput(body.body))
          })
          break
        }
        case "UrlParam": {
          instructions.push(function(request, value) {
            const val = getObjPath(value, path)
            if (val === undefined) {
              return
            }
            request.urlParams ??= {}
            ;(request.urlParams as Record<string, any>)[annotation.name] = val
          })
          break
        }
        case "UrlParams": {
          instructions.push(function(request, value) {
            const val = getObjPath(value, path)
            if (val === undefined) {
              return
            }
            request.urlParams ??= {}
            Object.assign(request.urlParams, val)
          })
          break
        }
        case "Header": {
          instructions.push(function(request, value) {
            const val = getObjPath(value, path)
            if (val === undefined) {
              return
            }
            request.headers ??= {}
            ;(request.headers as Record<string, any>)[annotation.name] = val
          })
          break
        }
        case "Headers": {
          instructions.push(function(request, value) {
            const val = getObjPath(value, path)
            if (val === undefined) {
              return
            }
            request.headers ??= {}
            Object.assign(request.headers, val)
          })
          break
        }
        case "PathParam": {
          instructions.push(function(request, value) {
            request.url! = request.url!.replace(`:${annotation.name}`, getObjPath(value, path) as string)
          })
          break
        }
        case "PathParams": {
          instructions.push(function(request, value) {
            Object.entries(getObjPath(value, path)).forEach(([key, value]) => {
              request.url! = request.url!.replace(`:${key}`, value as string)
            })
          })
          break
        }
        default: {
          return absurd(annotation)
        }
      }
      return
    }

    switch (ast._tag) {
      case "Refinement": {
        walk(ast.from, path)
        break
      }
      case "Suspend": {
        walk(ast.f(), path)
        break
      }
      case "Transformation": {
        walk(ast.from, path)
        break
      }
      case "TupleType": {
        for (let i = 0; i < ast.elements.length; i++) {
          const element = ast.elements[i]
          walk(element.type, [...path, i])
        }
        break
      }
      case "TypeLiteral": {
        for (let i = 0; i < ast.propertySignatures.length; i++) {
          const property = ast.propertySignatures[i]
          walk(property.type, [...path, property.name])
        }
        break
      }
      case "Union": {
        for (let i = 0; i < ast.types.length; i++) {
          walk(ast.types[i], path)
        }
        break
      }
    }
  }
  walk(schema.ast, [])

  const method = Option.getOrElse(annotations.method, () => hasRequestBody ? "POST" : "GET")
  const instructionsLen = instructions.length
  const encode = Schema.encode(schema)
  function encoder(value: any): Effect.Effect<ClientRequest.ClientRequest, any, any> {
    return Effect.map(encode(value), (value) => {
      const options: Types.Mutable<ClientRequest.Options> = {
        url: annotations.path
      }
      for (let i = 0; i < instructionsLen; i++) {
        instructions[i](options, value)
      }
      const url = options.url!
      delete options.url
      return ClientRequest.make(method)(url, options)
    })
  }
  return encoder
})

/**
 * @since 1.0.0
 * @category handlers
 */
export const toRoute = <A extends Schema.TaggedRequest.Any, R>(
  self: Handler.Handler<A, R>
): Router.Route<
  ParseError | RequestError | Multipart.MultipartError,
  FileSystem | Path_ | Exclude<R, Router.RouteContext | ServerRequest.ServerRequest | Scope>
> => {
  const parsed = parse(self.schema)
  return Router.makeRoute(
    parsed.method,
    parsed.path,
    Effect.withFiberRuntime<
      ServerResponse.ServerResponse,
      RequestError | ParseError | Multipart.MultipartError,
      Scope | FileSystem | Path_ | R
    >(
      (fiber) => {
        const context = fiber.getFiberRef(FiberRef.currentContext)
        const request = Context.unsafeGet(context, ServerRequest.ServerRequest)
        const routeContext = Context.unsafeGet(context, Router.RouteContext)
        if (self._tag === "Stream") {
          return Effect.succeed(ServerResponse.empty())
        }
        return Effect.flatMap(parsed.decodeServerRequest(request, routeContext), (req) =>
          pipe(
            self.handler(req),
            Effect.flatMap((value) =>
              Effect.orDie(Serializable.serializeSuccess(req as any, value)).pipe(
                Effect.map((value) => ServerResponse.unsafeJson(value, { status: parsed.successStatus }))
              )
            ),
            Effect.catchAll((error) =>
              Schema.encode(parsed.FailureWithStatus)(error).pipe(
                Effect.map(([status, error]) => ServerResponse.unsafeJson(error, { status }))
              )
            )
          ) as any)
      }
    )
  )
}

/**
 * @since 1.0.0
 * @category groups
 */
export const toRouter = <A extends Schema.TaggedRequest.Any, R>(
  self: Handler.Group<A, R>
): Router.Router<
  ParseError | RequestError | Multipart.MultipartError,
  FileSystem | Path_ | Exclude<R, Router.RouteContext | ServerRequest.ServerRequest | Scope>
> => {
  const endpoints = Handler.getChildren(self)
  return Router.fromIterable(endpoints.map(toRoute))
}

// TODO: Move to Http Client
/**
 * @since 1.0.0
 * @category client
 */
export const client =
  <G extends Handler.Group.Any>() =>
  <E, R>(client: Client.Client.WithResponse<E, R>) =>
  <Request extends Handler.Group.Request<G>>(request: Request): Effect.Effect<
    Serializable.WithResult.Success<Request>,
    E | Serializable.WithResult.Error<Request>,
    R | Serializable.SerializableWithResult.Context<Request>
  > => {
    const selfSchema = Serializable.selfSchema(request)
    const annotations = getAnnotations(selfSchema.ast)
    const successSchema = Serializable.successSchema(request)
    const noBody = successSchema.ast._tag === "VoidKeyword"
    const successStatus = Option.getOrElse(annotations.status, () => noBody ? 204 : 200)
    return toClientRequest(request).pipe(
      Effect.bindTo("httpRequest"),
      Effect.bind("response", ({ httpRequest }) => client(httpRequest)),
      Effect.flatMap(({ httpRequest, response }) => {
        if (response.status === successStatus) {
          if (noBody) {
            return Effect.void
          }
          return Effect.flatMap(response.json, Schema.decodeUnknown(successSchema))
        } else if (response.headers["content-type"] !== "application/json") {
          return Effect.fail(
            new ClientError.ResponseError({
              request: httpRequest,
              response,
              reason: "StatusCode",
              error: `non-${successStatus} status code`
            })
          )
        }
        const failureSchema = Serializable.failureSchema(request)
        return response.json.pipe(
          Effect.flatMap(Schema.decodeUnknown(failureSchema)),
          Effect.flatMap(Effect.fail)
        )
      }),
      Effect.scoped
    ) as any
  }
