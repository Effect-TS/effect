/**
 * @since 1.0.0
 */
import type * as AST from "@effect/schema/AST"
import type { ParseError } from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import * as Effect from "effect/Effect"
import { absurd } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Option from "effect/Option"
import type { ReadonlyRecord } from "effect/Record"
import type { Mutable } from "effect/Types"
import type { Scope } from "../../../effect/src/Scope.js"
import type { FileSystem } from "../FileSystem.js"
import type { Path as Path_ } from "../Path.js"
import * as Body_ from "./Body.js"
import * as ClientRequest from "./ClientRequest.js"
import type { Method as Method_ } from "./Method.js"
import type * as Multipart from "./Multipart.js"
import type * as Router from "./Router.js"
import type { RequestError } from "./ServerError.js"
import type * as ServerRequest from "./ServerRequest.js"
import * as UrlParams from "./UrlParams.js"

/**
 * @since 1.0.0
 * @category annotations
 */
export const PathId = Symbol.for("@effect/platform/Http/Endpoint/Path")

/**
 * @since 1.0.0
 * @category annotations
 */
export const MethodId = Symbol.for("@effect/platform/Http/Endpoint/Method")

/**
 * @since 1.0.0
 * @category annotations
 */
export const StatusId = Symbol.for("@effect/platform/Http/Endpoint/Status")

/**
 * @since 1.0.0
 * @category annotations
 */
export const annotations = <A>(
  annotations: Schema.Annotations.Schema<A> & {
    readonly path: string
    readonly method?: Method_
    readonly status?: number
  }
): Schema.Annotations.Schema<A> => {
  const obj: Record<string | symbol, any> = annotations
  obj[PathId] = obj.path
  delete obj.path
  if (obj.method !== undefined) {
    obj[MethodId] = obj.method
    delete obj.method
  }
  if (obj.status !== undefined) {
    obj[StatusId] = obj.status
    delete obj.status
  }
  return obj
}

const getAnnotations = (ast: AST.AST): {
  readonly path: string
  readonly method: Method_ | undefined
  readonly status: number | undefined
} => {
  if (ast._tag === "Transformation") {
    ast = ast.to
  }
  const path = ast.annotations[PathId] as string
  if (path === undefined) {
    throw new Error("Endpoint schema is missing path annotation")
  }
  const method = ast.annotations[MethodId] as Method_
  const status = ast.annotations[StatusId] as number
  return { path, method, status }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Endpoint<A, I, R> extends Schema.Schema<A, I, R> {}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Endpoint {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Parsed {
    readonly method: Method_
    readonly path: string
    readonly status: number
    readonly urlParams: {
      readonly [key: string]: AST.AST
    }
    readonly pathParams: {
      readonly [name: string]: AST.AST
    }
    readonly headers: {
      readonly [name: string]: AST.AST
    }
    readonly body: Option.Option<readonly [AST.AST, BodyAnnotation]>
  }
}

/**
 * @since 1.0.0
 * @category annotations
 */
export type Annotation =
  | BodyAnnotation
  | PathParamAnnotation
  | UrlParamAnnotation
  | HeaderAnnotation

const AnnotationId = Symbol.for("@effect/platform/Http/Endpoint/Annotation")

/**
 * @since 1.0.0
 * @category annotations
 */
export interface BodyAnnotation {
  readonly _tag: "Body"
  readonly format: "json" | "multipart" | "urlencoded"
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
export interface UrlParamAnnotation {
  readonly _tag: "UrlParam"
  readonly name: string
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
 * @category schemas
 */
export const Body = <S extends Schema.Schema.Any>(schema: S, format: "json" | "multipart" | "urlencoded"): S =>
  schema.annotations({
    [AnnotationId]: { _tag: "Body", format }
  }) as S

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
): Schema.Schema<A, I, R> => Body(schema, "multipart")

/**
 * @since 1.0.0
 * @category schemas
 */
export const BodyUrlEncoded = <A, I extends ReadonlyRecord<string, string | undefined>, R>(
  schema: Schema.Schema<A, I, R>
): Schema.Schema<A, I, R> => Body(schema, "urlencoded")

/**
 * @since 1.0.0
 * @category schemas
 */
export const UrlParam = <A, I extends string, R>(
  name: string,
  schema: Schema.Schema<A, I, R>
): Schema.Schema<A, I, R> =>
  schema.annotations({
    [AnnotationId]: { _tag: "UrlParam", name }
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
    [AnnotationId]: { _tag: "PathParam", name }
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
    [AnnotationId]: { _tag: "Header", name: name.toLowerCase() }
  })

interface Instruction {
  (obj: Record<string, any>, request: ServerRequest.ServerRequest, context: Router.RouteContext, body: unknown): void
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

/**
 * @since 1.0.0
 * @category parser
 */
export interface RequestParser<A, R> {
  (
    request: ServerRequest.ServerRequest,
    context: Router.RouteContext
  ): Effect.Effect<
    A,
    | RequestError
    | ParseError
    | Multipart.MultipartError,
    R | Scope | FileSystem | Path_
  >
}

/**
 * @since 1.0.0
 * @category parsers
 */
export const decodeRequest = <A, I, R>(
  schema: Endpoint<A, I, R>
): RequestParser<A, R> => {
  const ast = schema.ast
  let bodyAnnotation = Option.none<BodyAnnotation>()
  const instructions: Array<Instruction> = []

  function walk(ast: AST.AST, path: ReadonlyArray<PropertyKey>): void {
    if (AnnotationId in ast.annotations) {
      const annotation = ast.annotations[AnnotationId] as Annotation
      switch (annotation._tag) {
        case "Body": {
          if (bodyAnnotation._tag === "Some") {
            break
          }
          bodyAnnotation = Option.some(annotation)
          instructions.push(function(obj, _request, _context, body) {
            setObjPath(obj, path, body)
          })
          break
        }
        case "UrlParam": {
          instructions.push(function(obj, _request, context, _body) {
            setObjPath(obj, path, context.searchParams[annotation.name])
          })
          break
        }
        case "Header": {
          instructions.push(function(obj, request, _context, _body) {
            setObjPath(obj, path, request.headers[annotation.name])
          })
          break
        }
        case "PathParam": {
          instructions.push(function(obj, _request, context, _body) {
            setObjPath(obj, path, context.params[annotation.name])
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
      case "Literal": {
        instructions.push(function(obj, _request, _context, _body) {
          setObjPath(obj, path, ast.literal)
        })
        break
      }
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
      case "Union": {
        for (let i = 0; i < ast.types.length; i++) {
          walk(ast.types[i], path)
        }
      }
    }
    if (ast._tag === "TypeLiteral") {
      for (let i = 0; i < ast.propertySignatures.length; i++) {
        const property = ast.propertySignatures[i]
        walk(property.type, [...path, property.name])
      }
    }
  }
  walk(ast, [])

  const decode = Schema.decodeUnknown(schema)

  return (request: ServerRequest.ServerRequest, context: Router.RouteContext) => {
    function withBody(body: any): unknown {
      const obj = Object.create(null)
      for (let i = 0; i < instructions.length; i++) {
        instructions[i](obj, request, context, body)
      }
      return obj
    }

    if (bodyAnnotation._tag === "None") {
      return decode(withBody(undefined))
    }

    const bodyEffect = bodyAnnotation.value.format === "json"
      ? request.json
      : bodyAnnotation.value.format === "multipart"
      ? request.multipart
      : Effect.map(request.urlParamsBody, Object.fromEntries)

    return Effect.flatMap(bodyEffect as any, (body) => decode(withBody(body)))
  }
}

/**
 * @since 1.0.0
 * @category parsers
 */
export const parse = <A, I, R>(self: Endpoint<A, I, R>): Endpoint.Parsed => {
  const out = {
    ...getAnnotations(self.ast),
    urlParams: {},
    pathParams: {},
    headers: {},
    body: Option.none()
  } as Mutable<Endpoint.Parsed>

  function walk(ast: AST.AST): void {
    if (AnnotationId in ast.annotations) {
      const annotation = ast.annotations[AnnotationId] as Annotation
      switch (annotation._tag) {
        case "Body": {
          if (out.body._tag === "Some") {
            break
          }
          out.body = Option.some([ast, annotation])
          break
        }
        case "UrlParam": {
          ;(out.urlParams[annotation.name] as any) = ast
          break
        }
        case "Header": {
          ;(out.headers[annotation.name] as any) = ast
          break
        }
        case "PathParam": {
          ;(out.pathParams[annotation.name] as any) = ast
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
        walk(ast.from)
        break
      }
      case "Suspend": {
        walk(ast.f())
        break
      }
      case "Transformation": {
        walk(ast.from)
        break
      }
      case "TupleType": {
        for (let i = 0; i < ast.elements.length; i++) {
          const element = ast.elements[i]
          walk(element.type)
        }
        break
      }
      case "Union": {
        for (let i = 0; i < ast.types.length; i++) {
          walk(ast.types[i])
        }
      }
    }
    if (ast._tag === "TypeLiteral") {
      for (let i = 0; i < ast.propertySignatures.length; i++) {
        const property = ast.propertySignatures[i]
        walk(property.type)
      }
    }
  }
  walk(self.ast)

  return out
}

/**
 * @since 1.0.0
 * @category encoder
 */
export interface RequestEncoder<A, I, R> {
  (
    self: Endpoint<A, I, R>,
    value: A
  ): Effect.Effect<
    ClientRequest.ClientRequest,
    ParseError,
    R
  >
}

const encoderCache: WeakMap<
  object,
  (value: any) => Effect.Effect<ClientRequest.ClientRequest, ParseError, unknown>
> = globalValue("@effect/platform/Http/Endpoint/encoderCache", () => new WeakMap())

interface EncodeInstruction {
  (request: Mutable<ClientRequest.Options>, value: any): void
}

const makeEncoder = <A, I, R>(
  self: Serializable.Serializable<A, I, R>
): Effect.Effect<ClientRequest.ClientRequest, ParseError, R> => {
  const selfSchema = Serializable.selfSchema(self)
  if (encoderCache.has(selfSchema)) {
    return encoderCache.get(selfSchema)!(self) as any
  }

  const annotations = getAnnotations(selfSchema.ast)
  let bodyHandled = false
  let method = annotations.method!
  const instructions: Array<EncodeInstruction> = []

  function walk(ast: AST.AST, path: ReadonlyArray<PropertyKey>): void {
    if (AnnotationId in ast.annotations) {
      const annotation = ast.annotations[AnnotationId] as Annotation
      switch (annotation._tag) {
        case "Body": {
          if (bodyHandled) {
            return
          }
          bodyHandled = true
          instructions.push(function(request, value) {
            request.body = annotation.format === "json"
              ? Body_.unsafeJson(getObjPath(value, path))
              : annotation.format === "multipart"
              ? Body_.empty
              : Body_.urlParams(UrlParams.fromInput(getObjPath(value, path) as any))
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
        case "PathParam": {
          instructions.push(function(request, value) {
            request.url! = request.url!.replace(`:${annotation.name}`, getObjPath(value, path) as string)
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
      case "Union": {
        for (let i = 0; i < ast.types.length; i++) {
          walk(ast.types[i], path)
        }
      }
    }
    if (ast._tag === "TypeLiteral") {
      for (let i = 0; i < ast.propertySignatures.length; i++) {
        const property = ast.propertySignatures[i]
        walk(property.type, [...path, property.name])
      }
    }
  }
  walk(selfSchema.ast, [])

  if (method === undefined) {
    method = bodyHandled ? "POST" : "GET"
  }

  const instructionsLen = instructions.length
  const encode = Schema.encode(selfSchema)
  function encoder(value: A) {
    return Effect.map(encode(value), (value) => {
      const options: Mutable<ClientRequest.Options> = {
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
  encoderCache.set(self, encoder)
  return encoder(self as A)
}

/**
 * @since 1.0.0
 * @category encoder
 */
export const encodeRequest = <A, I, R>(
  self: Serializable.Serializable<A, I, R>
): Effect.Effect<ClientRequest.ClientRequest, ParseError, R> => makeEncoder(self)
