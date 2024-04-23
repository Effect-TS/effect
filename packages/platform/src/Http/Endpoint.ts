/**
 * @since 1.0.0
 */
import * as AST from "@effect/schema/AST"
import type { ParseError } from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import * as FiberRef from "effect/FiberRef"
import { absurd } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Option from "effect/Option"
import type { ReadonlyRecord } from "effect/Record"
import type { Mutable } from "effect/Types"
import type { Scope } from "../../../effect/src/Scope.js"
import type { FileSystem } from "../FileSystem.js"
import type { Path as Path_ } from "../Path.js"
import * as Body_ from "./Body.js"
import type * as Client from "./Client.js"
import * as ClientRequest from "./ClientRequest.js"
import * as ClientResponse from "./ClientResponse.js"
import type { Method as Method_ } from "./Method.js"
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
export interface Endpoint<A extends Serializable.SerializableWithResult.Any, I, R> extends Schema.Schema<A, I, R> {}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Endpoint {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Any = Endpoint<any, any, any>

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Parsed {
    readonly method: Method_
    readonly path: string
    readonly status: number
    readonly urlParams: Option.Option<AST.TypeLiteral>
    readonly pathParams: Option.Option<AST.TypeLiteral>
    readonly headers: Option.Option<AST.TypeLiteral>
    readonly body: Option.Option<readonly [AST.AST, BodyAnnotation["format"]]>
  }
}

/**
 * @since 1.0.0
 * @category annotations
 */
export type Annotation =
  | BodyAnnotation
  | PathParamAnnotation
  | PathParamsAnnotation
  | UrlParamAnnotation
  | UrlParamsAnnotation
  | HeaderAnnotation
  | HeadersAnnotation

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
export const UrlParams = <A, I extends ReadonlyRecord<string, string | undefined>, R>(
  schema: Schema.Schema<A, I, R>
): Schema.Schema<A, I, R> =>
  schema.annotations({
    [AnnotationId]: { _tag: "UrlParams" }
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
export const PathParams = <A, I extends ReadonlyRecord<string, string | undefined>, R>(
  schema: Schema.Schema<A, I, R>
): Schema.Schema<A, I, R> =>
  schema.annotations({
    [AnnotationId]: { _tag: "PathParams" }
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

/**
 * @since 1.0.0
 * @category schemas
 */
export const Headers = <A, I extends ReadonlyRecord<string, string | undefined>, R>(
  schema: Schema.Schema<A, I, R>
): Schema.Schema<A, I, R> =>
  schema.annotations({
    [AnnotationId]: { _tag: "Headers" }
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

const throwMultipleBodyError = () => {
  throw new Error("An endpoint can only have one body annotation")
}

/**
 * @since 1.0.0
 * @category parsers
 */
export const decodeRequest = <A extends Serializable.SerializableWithResult.Any, I, R>(
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
            return throwMultipleBodyError()
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
        case "UrlParams": {
          instructions.push(function(obj, _request, context, _body) {
            setObjPath(obj, path, context.searchParams)
          })
          break
        }
        case "Header": {
          instructions.push(function(obj, request, _context, _body) {
            setObjPath(obj, path, request.headers[annotation.name])
          })
          break
        }
        case "Headers": {
          instructions.push(function(obj, request, _context, _body) {
            setObjPath(obj, path, request.headers)
          })
          break
        }
        case "PathParam": {
          instructions.push(function(obj, _request, context, _body) {
            setObjPath(obj, path, context.params[annotation.name])
          })
          break
        }
        case "PathParams": {
          instructions.push(function(obj, _request, context, _body) {
            setObjPath(obj, path, context.params)
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
export const parse = <A extends Serializable.SerializableWithResult.Any, I, R>(
  self: Endpoint<A, I, R>
): Endpoint.Parsed => {
  const out = {
    ...getAnnotations(self.ast),
    urlParams: Option.none(),
    pathParams: Option.none(),
    headers: Option.none(),
    body: Option.none()
  } as Mutable<Endpoint.Parsed>

  function walk(ast: AST.AST, isOptional = false): void {
    if (AnnotationId in ast.annotations) {
      const annotation = ast.annotations[AnnotationId] as Annotation
      switch (annotation._tag) {
        case "Body": {
          if (out.body._tag === "Some") {
            return throwMultipleBodyError()
          }
          out.body = Option.some([ast, annotation.format])
          break
        }
        case "UrlParam": {
          const typeLiteral = out.urlParams._tag === "None" ? new AST.TypeLiteral([], []) : out.urlParams.value
          out.urlParams = Option.some(
            new AST.TypeLiteral([
              ...typeLiteral.propertySignatures,
              new AST.PropertySignature(annotation.name, ast, isOptional, true)
            ], typeLiteral.indexSignatures)
          )
          break
        }
        case "UrlParams": {
          ast = AST.encodedAST(ast)
          if (ast._tag !== "TypeLiteral") {
            break
          }
          out.urlParams = Option.some(
            out.urlParams._tag === "None" ?
              ast :
              new AST.TypeLiteral([
                ...out.urlParams.value.propertySignatures,
                ...ast.propertySignatures
              ], [
                ...out.urlParams.value.indexSignatures,
                ...ast.indexSignatures
              ])
          )
          break
        }
        case "Header": {
          const typeLiteral = out.headers._tag === "None" ? new AST.TypeLiteral([], []) : out.headers.value
          out.headers = Option.some(
            new AST.TypeLiteral([
              ...typeLiteral.propertySignatures,
              new AST.PropertySignature(annotation.name, ast, isOptional, true)
            ], typeLiteral.indexSignatures)
          )
          break
        }
        case "Headers": {
          ast = AST.encodedAST(ast)
          if (ast._tag !== "TypeLiteral") {
            break
          }
          out.headers = Option.some(
            out.headers._tag === "None" ?
              ast :
              new AST.TypeLiteral([
                ...out.headers.value.propertySignatures,
                ...ast.propertySignatures
              ], [
                ...out.headers.value.indexSignatures,
                ...ast.indexSignatures
              ])
          )
          break
        }
        case "PathParam": {
          const typeLiteral = out.pathParams._tag === "None" ? new AST.TypeLiteral([], []) : out.pathParams.value
          out.pathParams = Option.some(
            new AST.TypeLiteral([
              ...typeLiteral.propertySignatures,
              new AST.PropertySignature(annotation.name, ast, isOptional, true)
            ], typeLiteral.indexSignatures)
          )
          break
        }
        case "PathParams": {
          ast = AST.encodedAST(ast)
          if (ast._tag !== "TypeLiteral") {
            break
          }
          out.pathParams = Option.some(
            out.pathParams._tag === "None" ?
              ast :
              new AST.TypeLiteral([
                ...out.pathParams.value.propertySignatures,
                ...ast.propertySignatures
              ], [
                ...out.pathParams.value.indexSignatures,
                ...ast.indexSignatures
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
      case "Refinement": {
        walk(AST.annotations(ast.from, ast.annotations))
        break
      }
      case "Suspend": {
        walk(ast.f())
        break
      }
      case "Transformation": {
        walk(AST.annotations(ast.from, { ...ast.to.annotations, ...ast.annotations }))
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
        walk(property.type, property.isOptional)
      }
    }
  }
  walk(self.ast)

  if (out.method === undefined) {
    out.method = out.body._tag === "Some" ? "POST" : "GET"
  }
  if (out.status === undefined) {
    out.status = out.body._tag === "Some" ? 200 : 204
  }

  return out
}

/**
 * @since 1.0.0
 * @category encoder
 */
export interface RequestEncoder<A extends Serializable.SerializableWithResult.Any, I, R> {
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
  (value: any) => Effect.Effect<ClientRequest.ClientRequest, ParseError, any>
> = globalValue("@effect/platform/Http/Endpoint/encoderCache", () => new WeakMap())

interface EncodeInstruction {
  (request: Mutable<ClientRequest.Options>, value: any): void
}

function makeEncoder<A, I, R>(
  self: Serializable.Serializable<A, I, R>
): (value: A) => Effect.Effect<ClientRequest.ClientRequest, ParseError, R> {
  const selfSchema = Serializable.selfSchema(self)
  if (encoderCache.has(selfSchema)) {
    return encoderCache.get(selfSchema)!
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
            return throwMultipleBodyError()
          }
          bodyHandled = true
          instructions.push(function(request, value) {
            request.body = annotation.format === "json"
              ? Body_.unsafeJson(getObjPath(value, path))
              : annotation.format === "multipart"
              ? Body_.empty
              : Body_.urlParams(UrlParams_.fromInput(getObjPath(value, path) as any))
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
  return encoder
}

/**
 * @since 1.0.0
 * @category encoder
 */
export const encodeRequest = <A, I, R>(
  self: Serializable.Serializable<A, I, R>
): Effect.Effect<ClientRequest.ClientRequest, ParseError, R> => makeEncoder(self)(self as A)

/**
 * @since 1.0.0
 * @category handlers
 */
export const HandledTypeId = Symbol.for("@effect/platform/Http/Endpoint/Handled")

/**
 * @since 1.0.0
 * @category groups
 */
export type HandledTypeId = typeof HandledTypeId

/**
 * @since 1.0.0
 * @category handlers
 */
export interface Handled<A extends Serializable.SerializableWithResult.Any, R> {
  readonly [HandledTypeId]: HandledTypeId
  readonly endpoint: Endpoint<A, unknown, R>
  readonly parsed: Endpoint.Parsed
  readonly handler: (value: A) => Effect.Effect<Serializable.WithResult.Success<A>, Serializable.WithResult.Error<A>, R>
}

/**
 * @since 1.0.0
 * @category handlers
 */
export declare namespace Handled {
  /**
   * @since 1.0.0
   * @category handlers
   */
  export type Any = Handled<any, any>
}

/**
 * @since 1.0.0
 * @category handlers
 */
export const handle = <A extends Serializable.SerializableWithResult.Any, I, R>(
  endpoint: Endpoint<A, I, R>,
  handler: (_: A) => Effect.Effect<Serializable.WithResult.Success<A>, Serializable.WithResult.Error<A>, R>
): Handled<A, R> => ({
  [HandledTypeId]: HandledTypeId,
  endpoint: endpoint as any,
  handler,
  parsed: parse(endpoint)
})

/**
 * @since 1.0.0
 * @category handlers
 */
export const handledToRoute = <Request extends Serializable.SerializableWithResult.Any, R>(
  self: Handled<Request, R>
): Router.Route<
  RequestError | ParseError | Multipart.MultipartError,
  Path_ | FileSystem
> => {
  const encode = decodeRequest(self.endpoint)
  let encodeExit: ((exit: unknown) => Effect.Effect<unknown, ParseError>) | undefined
  return Router.makeRoute(
    self.parsed.method,
    self.parsed.path as Router.PathInput,
    Effect.withFiberRuntime<
      ServerResponse.ServerResponse,
      RequestError | ParseError | Multipart.MultipartError,
      Scope | FileSystem | Path_ | R
    >(
      (fiber) => {
        const context = fiber.getFiberRef(FiberRef.currentContext)
        const request = Context.unsafeGet(context, ServerRequest.ServerRequest)
        const routeContext = Context.unsafeGet(context, Router.RouteContext)
        return Effect.map(
          Effect.flatMap(encode(request, routeContext), (req) => {
            if (encodeExit === undefined) {
              encodeExit = Schema.encodeUnknown(Serializable.exitSchema(req as any))
            }
            return Effect.flatMap(Effect.exit(self.handler(req)), encodeExit)
          }),
          ServerResponse.unsafeJson
        )
      }
    )
  ) as any
}

/**
 * @since 1.0.0
 * @category groups
 */
export const GroupTypeId = Symbol.for("@effect/platform/Http/Endpoint/Group")

/**
 * @since 1.0.0
 * @category groups
 */
export type GroupTypeId = typeof GroupTypeId

/**
 * @since 1.0.0
 * @category groups
 */
export interface Group<Request extends Serializable.SerializableWithResult.Any, R> {
  readonly [GroupTypeId]: GroupTypeId
  readonly name: string | undefined
  readonly description: string | undefined
  readonly children: ReadonlyArray<Handled<Request, R> | Group<Request, R>>
}

/**
 * @since 1.0.0
 * @category groups
 */
export declare namespace Group {
  /**
   * @since 1.0.0
   * @category groups
   */
  export type Any = Group<any, any>

  /**
   * @since 1.0.0
   * @category groups
   */
  export type Request<G extends Group.Any> = G extends Group<infer A, infer _R> ? A : never
}

/**
 * @since 1.0.0
 * @category groups
 */
export const group = <Children extends ReadonlyArray<Handled.Any | Group.Any>>(
  options: {
    readonly name?: string | undefined
    readonly description?: string | undefined
  },
  ...children: Children
): Group<
  Children[number] extends infer Child ? Child extends Handled<infer A, infer _R> ? A :
    Child extends Group<infer A, infer _R> ? A
    : never :
    never,
  Children[number] extends infer Child ? Child extends Handled<infer _A, infer R> ? R :
    Child extends Group<infer _A, infer R> ? R
    : never :
    never
> => ({
  [GroupTypeId]: GroupTypeId,
  name: options.name,
  description: options.description,
  children
})

/**
 * @since 1.0.0
 * @category groups
 */
export const groupToRouter = <Request extends Serializable.SerializableWithResult.Any, R>(
  self: Group<Request, R>
): Router.Router<RequestError | ParseError | Multipart.MultipartError, Path_ | FileSystem> => {
  const endpoints: Array<Handled<Request, R>> = []
  function walk(group: Group<Request, R>): void {
    for (let i = 0; i < group.children.length; i++) {
      const child = group.children[i]
      if (HandledTypeId in child) {
        endpoints.push(child)
      } else {
        walk(child)
      }
    }
  }
  walk(self)
  return Router.fromIterable(endpoints.map(handledToRoute))
}

const decodeExitCache: WeakMap<object, (u: any) => Effect.Effect<Exit.Exit<any, any>, any, any>> = globalValue(
  "@effect/platform/Http/Endpoint/decodeExitCache",
  () => new WeakMap()
)

const getDecodeExit = (self: Serializable.SerializableWithResult.Any) => {
  const selfSchema = Serializable.selfSchema(self)
  if (decodeExitCache.has(selfSchema)) {
    return decodeExitCache.get(selfSchema)!
  }
  const decodeExitSchema = ClientResponse.schemaBodyJsonScoped(Serializable.exitSchema(self as any))
  decodeExitCache.set(selfSchema, decodeExitSchema)
  return decodeExitSchema
}

/**
 * @since 1.0.0
 * @category client
 */
export const client =
  <G extends Group.Any>() =>
  <E, R>(client: Client.Client.WithResponse<E, R>) =>
  <Request extends Group.Request<G>>(request: Request): Effect.Effect<
    Serializable.WithResult.Success<Request>,
    E | Serializable.WithResult.Error<Request>,
    R | Serializable.SerializableWithResult.Context<Request>
  > => {
    const decodeExit = getDecodeExit(request)
    return Effect.flatten(decodeExit(Effect.flatMap(encodeRequest(request), client)))
  }
