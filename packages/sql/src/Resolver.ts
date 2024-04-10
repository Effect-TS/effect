/**
 * @since 1.0.0
 */
import type { ParseError } from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
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
export interface SqlRequest<A, E> extends Request.Request<A, E | ParseError> {
  readonly spanLink?: Tracer.SpanLink | undefined
  readonly input: unknown
}

const SqlRequestProto = {
  ...Request.Class.prototype,
  [Equal.symbol](
    this: SqlRequest<unknown, unknown>,
    that: SqlRequest<unknown, unknown>
  ): boolean {
    return Equal.equals(this.input, that.input)
  },
  [Hash.symbol](this: SqlRequest<unknown, unknown>): number {
    return Hash.hash(this.input)
  }
}

const makeRequest = <I, A, E>(
  input: I,
  span?: Tracer.ParentSpan | undefined
): SqlRequest<A, E> => {
  const self = Object.create(SqlRequestProto) as Types.Mutable<SqlRequest<A, E>>
  self.spanLink = span
    ? {
      _tag: "SpanLink",
      span,
      attributes: {}
    }
    : undefined
  self.input = input
  return self
}

const partitionRequests = <A, E>(requests: ReadonlyArray<SqlRequest<A, E>>) => {
  const inputs: Array<unknown> = new Array(requests.length)
  const spanLinks: Array<Tracer.SpanLink> = []

  for (let i = 0, len = requests.length; i < len; i++) {
    const request = requests[i]
    inputs[i] = request.input
    if (request.spanLink !== undefined) {
      spanLinks.push(request.spanLink)
    }
  }

  return [inputs, spanLinks] as const
}

const partitionRequestsById = <I>() => <A, E>(requests: ReadonlyArray<SqlRequest<A, E>>) => {
  const inputs: Array<unknown> = new Array(requests.length)
  const spanLinks: Array<Tracer.SpanLink> = []
  const byIdMap = new Map<I, SqlRequest<A, E>>()

  for (let i = 0, len = requests.length; i < len; i++) {
    const request = requests[i]
    inputs[i] = request.input
    byIdMap.set(request.input as I, request)
    if (request.spanLink !== undefined) {
      spanLinks.push(request.spanLink)
    }
  }

  return [inputs, spanLinks, byIdMap] as const
}

/**
 * @since 1.0.0
 * @category resolvers
 */
export interface SqlResolver<I, A, E, R> extends RequestResolver.RequestResolver<SqlRequest<A, E>> {
  readonly execute: (input: I) => Effect.Effect<A, E | ParseError, R>
  readonly cachePopulate: (
    id: I,
    result: A
  ) => Effect.Effect<void, ParseError, R>
  readonly cacheInvalidate: (id: I) => Effect.Effect<void, ParseError, R>
  readonly request: (input: I) => Effect.Effect<SqlRequest<A, E>, ParseError, R>
}

const makeResolver = <A, E, I, II, RI, R>(
  self: RequestResolver.RequestResolver<SqlRequest<A, E>>,
  Request: Schema.Schema<I, II, RI>,
  context?: Context.Context<R> | undefined
): SqlResolver<I, A, E, RI> => {
  const encode = Schema.encode(Request)
  return Object.assign(self, {
    request(input: I) {
      return Effect.withFiberRuntime<SqlRequest<A, E>, ParseError, RI>(
        (fiber) => {
          const span = fiber
            .getFiberRef(FiberRef.currentContext)
            .unsafeMap.get(Tracer.ParentSpan.key)
          return Effect.map(encode(input), (input) => makeRequest(input, span))
        }
      )
    },
    cachePopulate(input: I, value: A) {
      return Effect.flatMap(
        encode(input),
        (input) => Effect.cacheRequestResult(makeRequest(input), Exit.succeed(value))
      )
    },
    cacheInvalidate(input: I) {
      return Effect.withFiberRuntime<void, ParseError, RI>((fiber) => {
        const cache = fiber.getFiberRef(FiberRef.currentRequestCache)
        return Effect.flatMap(encode(input), (input) => cache.invalidate(makeRequest(input)))
      })
    },
    execute(input: I) {
      return Effect.withFiberRuntime<A, E | ParseError, RI>((fiber) => {
        const currentContext = fiber.getFiberRef(FiberRef.currentContext)
        const span = currentContext.unsafeMap.get(Tracer.ParentSpan.key)
        const connection = currentContext.unsafeMap.get(
          internalClient.TransactionConn.key
        )
        let toProvide: Context.Context<R> | undefined = context
        if (connection !== undefined) {
          if (toProvide === undefined) {
            toProvide = Context.make(
              internalClient.TransactionConn,
              connection
            ) as any
          } else {
            toProvide = Context.add(
              toProvide,
              internalClient.TransactionConn,
              connection
            )
          }
        }
        const resolver = toProvide === undefined
          ? self
          : RequestResolver.provideContext(self, toProvide)
        return Effect.flatMap(encode(input), (input) => Effect.request(makeRequest<II, A, E>(input, span), resolver))
      })
    }
  })
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
export const ordered = <I, II, RI, A, IA, E, RA = never, R = never>(
  options:
    | {
      readonly Request: Schema.Schema<I, II, RI>
      readonly Result: Schema.Schema<A, IA>
      readonly execute: (
        requests: Array<NoInfer<II>>
      ) => Effect.Effect<ReadonlyArray<unknown>, E>
      readonly withContext?: false
    }
    | {
      readonly Request: Schema.Schema<I, II, RI>
      readonly Result: Schema.Schema<A, IA, RA>
      readonly execute: (
        requests: Array<NoInfer<II>>
      ) => Effect.Effect<ReadonlyArray<unknown>, E, R>
      readonly withContext: true
    }
): Effect.Effect<
  SqlResolver<I, A, E | ResultLengthMismatch, RI>,
  never,
  RA | R
> => {
  const decodeResults = Schema.decodeUnknown(Schema.array(options.Result))
  const resolver = RequestResolver.makeBatched(
    (requests: Array<SqlRequest<A, E | ResultLengthMismatch>>) => {
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
        Effect.withSpan("sql.Resolver.ordered", { links: spanLinks })
      ) as Effect.Effect<void>
    }
  )
  return Effect.context<RA | R>().pipe(
    Effect.map((context) =>
      makeResolver(
        resolver,
        options.Request,
        options.withContext ? context : undefined
      )
    )
  )
}

/**
 * Create a resolver the can return multiple results for a single request.
 *
 * Results are grouped by a common key extracted from the request and result.
 *
 * @since 1.0.0
 * @category resolvers
 */
export const grouped = <I, II, K, RI, A, IA, E, RA = never, R = never>(
  options:
    | {
      readonly Request: Schema.Schema<I, II, RI>
      readonly RequestGroupKey: (request: NoInfer<II>) => K
      readonly Result: Schema.Schema<A, IA>
      readonly ResultGroupKey: (result: NoInfer<A>) => K
      readonly execute: (
        requests: Array<NoInfer<II>>
      ) => Effect.Effect<ReadonlyArray<unknown>, E>
      readonly withContext?: false
    }
    | {
      readonly Request: Schema.Schema<I, II, RI>
      readonly RequestGroupKey: (request: NoInfer<II>) => K
      readonly Result: Schema.Schema<A, IA, RA>
      readonly ResultGroupKey: (result: NoInfer<A>) => K
      readonly execute: (
        requests: Array<NoInfer<II>>
      ) => Effect.Effect<ReadonlyArray<unknown>, E, R>
      readonly withContext: true
    }
): Effect.Effect<SqlResolver<I, Array<A>, E, RI>, never, RA | R> => {
  const decodeResults = Schema.decodeUnknown(Schema.array(options.Result))
  const resolver = RequestResolver.makeBatched(
    (requests: Array<SqlRequest<Array<A>, E>>) => {
      const [inputs, spanLinks] = partitionRequests(requests)
      const resultMap = new Map<K, Array<A>>()
      return options.execute(inputs as any).pipe(
        Effect.flatMap(decodeResults),
        Effect.tap((results) => {
          for (let i = 0, len = results.length; i < len; i++) {
            const result = results[i]
            const key = options.ResultGroupKey(result)
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
        Effect.withSpan("sql.Resolver.grouped", { links: spanLinks })
      ) as Effect.Effect<void>
    }
  )
  return Effect.context<RA | R>().pipe(
    Effect.map((context) =>
      makeResolver(
        resolver,
        options.Request,
        options.withContext ? context : undefined
      )
    )
  )
}

/**
 * Create a resolver that resolves results by id.
 *
 * @since 1.0.0
 * @category resolvers
 */
export const findById = <I, II, RI, A, IA, E, RA = never, R = never>(
  options:
    | {
      readonly Id: Schema.Schema<I, II, RI>
      readonly Result: Schema.Schema<A, IA>
      readonly ResultId: (result: NoInfer<A>) => II
      readonly execute: (
        requests: Array<NoInfer<II>>
      ) => Effect.Effect<ReadonlyArray<unknown>, E>
      readonly withContext?: false
    }
    | {
      readonly Id: Schema.Schema<I, II, RI>
      readonly Result: Schema.Schema<A, IA, RA>
      readonly ResultId: (result: NoInfer<A>) => II
      readonly execute: (
        requests: Array<NoInfer<II>>
      ) => Effect.Effect<ReadonlyArray<unknown>, E, R>
      readonly withContext: true
    }
): Effect.Effect<SqlResolver<I, Option.Option<A>, E, RI>, never, RA | R> => {
  const decodeResults = Schema.decodeUnknown(Schema.array(options.Result))
  const resolver = RequestResolver.makeBatched(
    (requests: Array<SqlRequest<Option.Option<A>, E>>) => {
      const [inputs, spanLinks, idMap] = partitionRequestsById<II>()(requests)
      return options.execute(inputs as any).pipe(
        Effect.flatMap(decodeResults),
        Effect.flatMap((results) =>
          Effect.forEach(
            results,
            (result) => {
              const id = options.ResultId(result)
              const request = idMap.get(id)
              if (request === undefined) {
                return Effect.unit
              }
              idMap.delete(id)
              return Request.succeed(request, Option.some(result))
            },
            { discard: true }
          )
        ),
        Effect.tap((_) => {
          if (idMap.size === 0) {
            return Effect.unit
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
        Effect.withSpan("sql.Resolver.findById", { links: spanLinks })
      ) as Effect.Effect<void>
    }
  )
  return Effect.context<RA | R>().pipe(
    Effect.map((context) =>
      makeResolver(
        resolver,
        options.Id,
        options.withContext ? context : undefined
      )
    )
  )
}
const void_ = <I, II, RI, E, R = never>(
  options:
    | {
      readonly Request: Schema.Schema<I, II, RI>
      readonly execute: (
        requests: Array<NoInfer<II>>
      ) => Effect.Effect<ReadonlyArray<unknown>, E>
      readonly withContext?: false
    }
    | {
      readonly Request: Schema.Schema<I, II, RI>
      readonly execute: (
        requests: Array<NoInfer<II>>
      ) => Effect.Effect<ReadonlyArray<unknown>, E, R>
      readonly withContext: true
    }
): Effect.Effect<SqlResolver<I, void, E, RI>, never, R> => {
  const resolver = RequestResolver.makeBatched(
    (requests: Array<SqlRequest<void, E>>) => {
      const [inputs, spanLinks] = partitionRequests(requests)
      return options.execute(inputs as any).pipe(
        Effect.andThen(
          Effect.forEach(
            requests,
            (request) => Request.complete(request, Exit.unit),
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
        Effect.withSpan("sql.Resolver.void", { links: spanLinks })
      ) as Effect.Effect<void>
    }
  )
  return Effect.context<R>().pipe(
    Effect.map((context) =>
      makeResolver(
        resolver,
        options.Request,
        options.withContext ? context : undefined
      )
    )
  )
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
