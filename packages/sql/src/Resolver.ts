/**
 * @since 1.0.0
 */
import type { ParseError } from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import type { NonEmptyArray } from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import * as FiberRef from "effect/FiberRef"
import * as Hash from "effect/Hash"
import * as Option from "effect/Option"
import * as Request from "effect/Request"
import * as RequestResolver from "effect/RequestResolver"
import * as Tracer from "effect/Tracer"
import type * as Types from "effect/Types"
import { ResultLengthMismatch } from "./Error.js"
import * as internalClient from "./internal/client.js"

/**
 * @since 1.0.0
 * @category requests
 */
export interface SqlRequest<T extends string, A, E> extends Request.Request<A, E | ParseError> {
  readonly _tag: T
  readonly spanLink: Tracer.SpanLink
  readonly input: unknown
}

const SqlRequestProto = {
  ...Request.Class.prototype,
  [Equal.symbol](
    this: SqlRequest<string, unknown, unknown>,
    that: SqlRequest<string, unknown, unknown>
  ): boolean {
    return this._tag === that._tag && Equal.equals(this.input, that.input)
  },
  [Hash.symbol](this: SqlRequest<string, unknown, unknown>): number {
    return Hash.cached(this, Hash.combine(Hash.hash(this.input))(Hash.string(this._tag)))
  }
}

const makeRequest = <T extends string, I, A, E>(
  tag: T,
  input: I,
  span: Tracer.Span
): SqlRequest<T, A, E> => {
  const self = Object.create(SqlRequestProto) as Types.Mutable<SqlRequest<T, A, E>>
  self._tag = tag
  self.spanLink = {
    _tag: "SpanLink",
    span,
    attributes: {}
  }
  self.input = input
  return self
}

const partitionRequests = <T extends string, A, E>(requests: ReadonlyArray<SqlRequest<T, A, E>>) => {
  const len = requests.length
  const inputs: Array<unknown> = new Array(len)
  const spanLinks: Array<Tracer.SpanLink> = new Array(len)

  for (let i = 0; i < len; i++) {
    const request = requests[i]
    inputs[i] = request.input
    spanLinks[i] = request.spanLink
  }

  return [inputs, spanLinks] as const
}

const partitionRequestsById = <I>() => <T extends string, A, E>(requests: ReadonlyArray<SqlRequest<T, A, E>>) => {
  const len = requests.length
  const inputs: Array<unknown> = new Array(len)
  const spanLinks: Array<Tracer.SpanLink> = new Array(len)
  const byIdMap = new Map<I, SqlRequest<T, A, E>>()

  for (let i = 0; i < len; i++) {
    const request = requests[i]
    inputs[i] = request.input
    spanLinks[i] = request.spanLink
    byIdMap.set(request.input as I, request)
  }

  return [inputs, spanLinks, byIdMap] as const
}

/**
 * @since 1.0.0
 * @category resolvers
 */
export interface SqlResolver<T extends string, I, A, E, R>
  extends RequestResolver.RequestResolver<SqlRequest<T, A, E>>
{
  readonly execute: (input: I) => Effect.Effect<A, E | ParseError, R>
  readonly makeExecute: (
    resolver: RequestResolver.RequestResolver<SqlRequest<T, A, E>>
  ) => (input: I) => Effect.Effect<A, E | ParseError, R>
  readonly cachePopulate: (
    id: I,
    result: A
  ) => Effect.Effect<void, ParseError, R>
  readonly cacheInvalidate: (id: I) => Effect.Effect<void, ParseError, R>
  readonly request: (input: I) => Effect.Effect<SqlRequest<T, A, E>, ParseError, R>
}

const makeResolver = <T extends string, A, E, I, II, RI, R>(
  self: RequestResolver.RequestResolver<SqlRequest<T, A, E>>,
  tag: T,
  Request: Schema.Schema<I, II, RI>,
  withContext?: boolean
): Effect.Effect<SqlResolver<T, I, A, E, RI>, never, R> => {
  function make(context: Context.Context<R> | undefined) {
    const encode = Schema.encode(Request)
    function makeExecute(self: RequestResolver.RequestResolver<SqlRequest<T, A, E>>) {
      return function(input: I) {
        return Effect.useSpan(
          `sql.Resolver.execute ${tag}`,
          { kind: "client" },
          (span) =>
            Effect.withFiberRuntime<A, E | ParseError, RI>((fiber) => {
              span.attribute("request.input", input)
              const currentContext = fiber.getFiberRef(FiberRef.currentContext)
              const connection = currentContext.unsafeMap.get(
                internalClient.TransactionConnection.key
              )
              let toProvide: Context.Context<R> | undefined = context
              if (connection !== undefined) {
                if (toProvide === undefined) {
                  toProvide = Context.make(
                    internalClient.TransactionConnection,
                    connection
                  ) as Context.Context<R>
                } else {
                  toProvide = Context.add(
                    toProvide,
                    internalClient.TransactionConnection,
                    connection
                  )
                }
              }
              const resolver = toProvide === undefined
                ? self
                : RequestResolver.provideContext(self, toProvide)
              return Effect.flatMap(
                encode(input),
                (input) => Effect.request(makeRequest<T, II, A, E>(tag, input, span), resolver)
              )
            })
        )
      }
    }
    return Object.assign(self, {
      request(input: I) {
        return Effect.withFiberRuntime<SqlRequest<T, A, E>, ParseError, RI>(
          (fiber) => {
            const span = fiber
              .getFiberRef(FiberRef.currentContext)
              .unsafeMap.get(Tracer.ParentSpan.key)
            return Effect.map(encode(input), (input) => makeRequest(tag, input, span))
          }
        )
      },
      cachePopulate(input: I, value: A) {
        return Effect.flatMap(
          encode(input),
          (input) => Effect.cacheRequestResult(makeRequest(tag, input, null as any), Exit.succeed(value))
        )
      },
      cacheInvalidate(input: I) {
        return Effect.withFiberRuntime<void, ParseError, RI>((fiber) => {
          const cache = fiber.getFiberRef(FiberRef.currentRequestCache)
          return Effect.flatMap(encode(input), (input) => cache.invalidate(makeRequest(tag, input, null as any)))
        })
      },
      makeExecute,
      execute: makeExecute(self)
    })
  }

  return withContext === true ? Effect.map(Effect.context<R>(), make) : Effect.succeed(make(undefined))
}

/**
 * Create a resolver for a sql query with a request schema and a result schema.
 *
 * The request schema is used to validate the input of the query.
 * The result schema is used to validate the output of the query.
 *
 * Results are mapped to the requests in order, so the length of the results must match the length of the requests.
 *
 * @since 1.0.0
 * @category resolvers
 */
export const ordered = <T extends string, I, II, RI, A, IA, _, E, RA = never, R = never>(
  tag: T,
  options:
    | {
      readonly Request: Schema.Schema<I, II, RI>
      readonly Result: Schema.Schema<A, IA>
      readonly execute: (
        requests: Array<Types.NoInfer<II>>
      ) => Effect.Effect<ReadonlyArray<_>, E>
      readonly withContext?: false
    }
    | {
      readonly Request: Schema.Schema<I, II, RI>
      readonly Result: Schema.Schema<A, IA, RA>
      readonly execute: (
        requests: Array<Types.NoInfer<II>>
      ) => Effect.Effect<ReadonlyArray<_>, E, R>
      readonly withContext: true
    }
): Effect.Effect<
  SqlResolver<T, I, A, E | ResultLengthMismatch, RI>,
  never,
  RA | R
> => {
  const decodeResults = Schema.decodeUnknown(Schema.Array(options.Result))
  const resolver = RequestResolver.makeBatched(
    (requests: NonEmptyArray<SqlRequest<T, A, E | ResultLengthMismatch>>) => {
      const [inputs, spanLinks] = partitionRequests(requests)
      return options.execute(inputs as any).pipe(
        Effect.filterOrFail(
          (results) => results.length === inputs.length,
          ({ length }) =>
            new ResultLengthMismatch({
              expected: inputs.length,
              actual: length
            })
        ),
        Effect.flatMap(decodeResults),
        Effect.flatMap(
          Effect.forEach((result, i) => Request.succeed(requests[i], result), {
            discard: true
          })
        ),
        Effect.catchAllCause((cause) =>
          Effect.forEach(
            requests,
            (request) => Request.failCause(request, cause),
            { discard: true }
          )
        ),
        Effect.withSpan(`sql.Resolver.batch ${tag}`, {
          kind: "client",
          links: spanLinks,
          attributes: { "request.count": inputs.length }
        })
      ) as Effect.Effect<void>
    }
  ).identified(`@effect/sql/Resolver.ordered/${tag}`)
  return makeResolver(resolver, tag, options.Request, options.withContext)
}

/**
 * Create a resolver the can return multiple results for a single request.
 *
 * Results are grouped by a common key extracted from the request and result.
 *
 * @since 1.0.0
 * @category resolvers
 */
export const grouped = <T extends string, I, II, K, RI, A, IA, Row, E, RA = never, R = never>(
  tag: T,
  options:
    | {
      readonly Request: Schema.Schema<I, II, RI>
      readonly RequestGroupKey: (request: Types.NoInfer<II>) => K
      readonly Result: Schema.Schema<A, IA>
      readonly ResultGroupKey: (result: Types.NoInfer<A>, row: Types.NoInfer<Row>) => K
      readonly execute: (
        requests: Array<Types.NoInfer<II>>
      ) => Effect.Effect<ReadonlyArray<Row>, E>
      readonly withContext?: false
    }
    | {
      readonly Request: Schema.Schema<I, II, RI>
      readonly RequestGroupKey: (request: Types.NoInfer<II>) => K
      readonly Result: Schema.Schema<A, IA, RA>
      readonly ResultGroupKey: (result: Types.NoInfer<A>, row: Types.NoInfer<Row>) => K
      readonly execute: (
        requests: Array<Types.NoInfer<II>>
      ) => Effect.Effect<ReadonlyArray<Row>, E, R>
      readonly withContext: true
    }
): Effect.Effect<SqlResolver<T, I, Array<A>, E, RI>, never, RA | R> => {
  const decodeResults = Schema.decodeUnknown(Schema.Array(options.Result))
  const resolver = RequestResolver.makeBatched(
    (requests: NonEmptyArray<SqlRequest<T, Array<A>, E>>) => {
      const [inputs, spanLinks] = partitionRequests(requests)
      const resultMap = new Map<K, Array<A>>()
      return options.execute(inputs as any).pipe(
        Effect.bindTo("rawResults"),
        Effect.bind("results", ({ rawResults }) => decodeResults(rawResults)),
        Effect.tap(({ rawResults, results }) => {
          for (let i = 0, len = results.length; i < len; i++) {
            const result = results[i]
            const key = options.ResultGroupKey(result, rawResults[i])
            const group = resultMap.get(key)
            if (group === undefined) {
              resultMap.set(key, [result])
            } else {
              group.push(result)
            }
          }

          return Effect.forEach(
            requests,
            (request) => {
              const key = options.RequestGroupKey(request.input as II)
              return Request.succeed(request, resultMap.get(key) ?? [])
            },
            { discard: true }
          )
        }),
        Effect.catchAllCause((cause) =>
          Effect.forEach(
            requests,
            (request) => Request.failCause(request, cause),
            { discard: true }
          )
        ),
        Effect.withSpan(`sql.Resolver.batch ${tag}`, {
          kind: "client",
          links: spanLinks,
          attributes: { "request.count": inputs.length }
        })
      ) as Effect.Effect<void>
    }
  ).identified(`@effect/sql/Resolver.grouped/${tag}`)
  return makeResolver(resolver, tag, options.Request, options.withContext)
}

/**
 * Create a resolver that resolves results by id.
 *
 * @since 1.0.0
 * @category resolvers
 */
export const findById = <T extends string, I, II, RI, A, IA, Row, E, RA = never, R = never>(
  tag: T,
  options:
    | {
      readonly Id: Schema.Schema<I, II, RI>
      readonly Result: Schema.Schema<A, IA>
      readonly ResultId: (result: Types.NoInfer<A>, row: Types.NoInfer<Row>) => II
      readonly execute: (
        requests: Array<Types.NoInfer<II>>
      ) => Effect.Effect<ReadonlyArray<Row>, E>
      readonly withContext?: false
    }
    | {
      readonly Id: Schema.Schema<I, II, RI>
      readonly Result: Schema.Schema<A, IA, RA>
      readonly ResultId: (result: Types.NoInfer<A>, row: Types.NoInfer<Row>) => II
      readonly execute: (
        requests: Array<Types.NoInfer<II>>
      ) => Effect.Effect<ReadonlyArray<Row>, E, R>
      readonly withContext: true
    }
): Effect.Effect<SqlResolver<T, I, Option.Option<A>, E, RI>, never, RA | R> => {
  const decodeResults = Schema.decodeUnknown(Schema.Array(options.Result))
  const resolver = RequestResolver.makeBatched(
    (requests: NonEmptyArray<SqlRequest<T, Option.Option<A>, E>>) => {
      const [inputs, spanLinks, idMap] = partitionRequestsById<II>()(requests)
      return options.execute(inputs as any).pipe(
        Effect.bindTo("rawResults"),
        Effect.bind("results", ({ rawResults }) => decodeResults(rawResults)),
        Effect.flatMap(({ rawResults, results }) =>
          Effect.forEach(
            results,
            (result, i) => {
              const id = options.ResultId(result, rawResults[i])
              const request = idMap.get(id)
              if (request === undefined) {
                return Effect.void
              }
              idMap.delete(id)
              return Request.succeed(request, Option.some(result))
            },
            { discard: true }
          )
        ),
        Effect.tap((_) => {
          if (idMap.size === 0) {
            return Effect.void
          }
          return Effect.forEach(
            idMap.values(),
            (request) => Request.succeed(request, Option.none()),
            { discard: true }
          )
        }),
        Effect.catchAllCause((cause) =>
          Effect.forEach(
            requests,
            (request) => Request.failCause(request, cause),
            { discard: true }
          )
        ),
        Effect.withSpan(`sql.Resolver.batch ${tag}`, {
          kind: "client",
          links: spanLinks,
          attributes: { "request.count": inputs.length }
        })
      ) as Effect.Effect<void>
    }
  ).identified(`@effect/sql/Resolver.findById/${tag}`)
  return makeResolver(resolver, tag, options.Id, options.withContext)
}
const void_ = <T extends string, I, II, RI, E, R = never>(
  tag: T,
  options:
    | {
      readonly Request: Schema.Schema<I, II, RI>
      readonly execute: (
        requests: Array<Types.NoInfer<II>>
      ) => Effect.Effect<ReadonlyArray<unknown>, E>
      readonly withContext?: false
    }
    | {
      readonly Request: Schema.Schema<I, II, RI>
      readonly execute: (
        requests: Array<Types.NoInfer<II>>
      ) => Effect.Effect<ReadonlyArray<unknown>, E, R>
      readonly withContext: true
    }
): Effect.Effect<SqlResolver<T, I, void, E, RI>, never, R> => {
  const resolver = RequestResolver.makeBatched(
    (requests: NonEmptyArray<SqlRequest<T, void, E>>) => {
      const [inputs, spanLinks] = partitionRequests(requests)
      return options.execute(inputs as any).pipe(
        Effect.andThen(
          Effect.forEach(
            requests,
            (request) => Request.complete(request, Exit.void),
            { discard: true }
          )
        ),
        Effect.catchAllCause((cause) =>
          Effect.forEach(
            requests,
            (request) => Request.failCause(request, cause),
            { discard: true }
          )
        ),
        Effect.withSpan(`sql.Resolver.batch ${tag}`, {
          kind: "client",
          links: spanLinks,
          attributes: { "request.count": inputs.length }
        })
      ) as Effect.Effect<void>
    }
  ).identified(`@effect/sql/Resolver.void/${tag}`)
  return makeResolver(resolver, tag, options.Request, options.withContext)
}

export {
  /**
   * Create a resolver that performs side effects.
   *
   * @since 1.0.0
   * @category resolvers
   */
  void_ as void
}
