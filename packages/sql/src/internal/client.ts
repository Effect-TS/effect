import * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberRef from "effect/FiberRef"
import * as MutableMap from "effect/MutableHashMap"
import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as request from "effect/Request"
import * as RequestResolver from "effect/RequestResolver"
import type * as Client from "../Client.js"
import type * as Connection from "../Connection.js"
import * as Error from "../Error.js"
import * as SqlSchema from "../Schema.js"
import * as Statement from "../Statement.js"

/** @internal */
export const TransactionConn = Context.GenericTag<
  readonly [conn: Connection.Connection, counter: number]
>("@effect/sql/services/TransactionConn")

/** @internal */
export const make = ({
  acquirer,
  beginTransaction = "BEGIN",
  commit = "COMMIT",
  compiler,
  rollback = "ROLLBACK",
  rollbackSavepoint = (_) => `ROLLBACK TO SAVEPOINT ${_}`,
  savepoint = (_) => `SAVEPOINT ${_}`,
  transactionAcquirer
}: Client.Client.MakeOptions): Client.Client => {
  const getConnection = Effect.flatMap(
    Effect.serviceOption(TransactionConn),
    Option.match({
      onNone: () => acquirer,
      onSome: ([conn]) => Effect.succeed(conn)
    })
  )

  const withTransaction = <R, E, A>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E | Error.SqlError, R> =>
    Effect.scoped(
      Effect.acquireUseRelease(
        Effect.serviceOption(TransactionConn).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.map(transactionAcquirer, (conn) => [conn, 0] as const),
              onSome: ([conn, count]) => Effect.succeed([conn, count + 1] as const)
            })
          ),
          Effect.tap(([conn, id]) =>
            id > 0
              ? conn.executeRaw(savepoint(`effect_sql_${id}`))
              : conn.executeRaw(beginTransaction)
          )
        ),
        ([conn, id]) => Effect.provideService(effect, TransactionConn, [conn, id]),
        ([conn, id], exit) =>
          Exit.isSuccess(exit)
            ? id > 0
              ? Effect.unit
              : Effect.orDie(conn.executeRaw(commit))
            : id > 0
            ? Effect.orDie(conn.executeRaw(rollbackSavepoint(`effect_sql_${id}`)))
            : Effect.orDie(conn.executeRaw(rollback))
      )
    )

  const schema = <IR, II, IA, AR, AI, A, R, E>(
    requestSchema: Schema.Schema<IA, II, IR>,
    resultSchema: Schema.Schema<A, AI, AR>,
    run: (_: II) => Effect.Effect<ReadonlyArray<unknown>, E, IR | AR | R>
  ) => {
    const decodeResult = SqlSchema.decodeUnknown(
      Schema.array(resultSchema),
      "result"
    )
    const encodeRequest = SqlSchema.encode(requestSchema, "request")
    return (
      _: IA
    ): Effect.Effect<ReadonlyArray<A>, Error.SchemaError | E, IR | AR | R> =>
      encodeRequest(_).pipe(Effect.flatMap(run), Effect.flatMap(decodeResult))
  }

  const schemaVoid = <IR, II, IA, R, E>(
    requestSchema: Schema.Schema<IA, II, IR>,
    run: (_: II) => Effect.Effect<unknown, E, R>
  ) => {
    const encodeRequest = SqlSchema.encode(requestSchema, "request")
    return (_: IA): Effect.Effect<void, Error.SchemaError | E, IR | R> =>
      Effect.asUnit(Effect.flatMap(encodeRequest(_), run))
  }

  const schemaSingle = <IR, II, IA, AR, AI, A, R, E>(
    requestSchema: Schema.Schema<IA, II, IR>,
    resultSchema: Schema.Schema<A, AI, AR>,
    run: (_: II) => Effect.Effect<ReadonlyArray<unknown>, E, R>
  ) => {
    const decodeResult = SqlSchema.decodeUnknown(resultSchema, "result")
    const encodeRequest = SqlSchema.encode(requestSchema, "request")
    return (_: IA): Effect.Effect<A, Error.SchemaError | E, IR | AR | R> =>
      encodeRequest(_).pipe(
        Effect.flatMap(run),
        Effect.flatMap((_) => Effect.orDie(ReadonlyArray.head(_))),
        Effect.flatMap(decodeResult)
      )
  }

  const schemaSingleOption = <IR, II, IA, AR, AI, A, R, E>(
    requestSchema: Schema.Schema<IA, II, IR>,
    resultSchema: Schema.Schema<A, AI, AR>,
    run: (_: II) => Effect.Effect<ReadonlyArray<unknown>, E, R>
  ) => {
    const decodeResult = SqlSchema.decodeUnknown(resultSchema, "result")
    const encodeRequest = SqlSchema.encode(requestSchema, "request")
    return (
      _: IA
    ): Effect.Effect<Option.Option<A>, Error.SchemaError | E, IR | AR | R> =>
      encodeRequest(_).pipe(
        Effect.flatMap(run),
        Effect.map(ReadonlyArray.head),
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.succeedNone,
            onSome: (result) => Effect.asSome(decodeResult(result))
          })
        )
      )
  }

  const makeExecuteRequest = <E, A, RA>(
    Request: request.Request.Constructor<
      request.Request<A, Error.SchemaError | E> & { i0: RA }
    >
  ) =>
  (
    Resolver: RequestResolver.RequestResolver<any, any>,
    context = Context.empty() as Context.Context<any>
  ) => {
    const resolverWithSql = Effect.map(
      Effect.serviceOption(TransactionConn),
      (_) =>
        RequestResolver.provideContext(
          Resolver,
          Option.match(_, {
            onNone: () => context,
            onSome: (tconn) => Context.add(context, TransactionConn, tconn)
          })
        )
    )
    return (i0: RA) => Effect.flatMap(resolverWithSql, (resolver) => Effect.request(Request({ i0 }), resolver))
  }

  const makePopulateCache = <E, A, RA>(
    Request: request.Request.Constructor<
      request.Request<A, Error.SchemaError | E> & { i0: RA }
    >
  ) =>
  (id: RA, _: A) => Effect.cacheRequestResult(Request({ i0: id }), Exit.succeed(_))

  const makeInvalidateCache = <E, A, RA>(
    Request: request.Request.Constructor<
      request.Request<A, Error.SchemaError | E> & { i0: RA }
    >
  ) =>
  (id: RA) =>
    Effect.flatMap(FiberRef.get(FiberRef.currentRequestCache), (cache) => cache.invalidate(Request({ i0: id })))

  const resolverSingleOption = <T extends string, R, IR, II, IA, AR, AI, A, E>(
    tag: T,
    options: {
      readonly request: Schema.Schema<IA, II, IR>
      readonly result: Schema.Schema<A, AI, AR>
      readonly run: (request: II) => Effect.Effect<ReadonlyArray<unknown>, E, R>
    }
  ): Client.Resolver<T, R | IR | AR, IA, Option.Option<A>, E> => {
    const Request = request.tagged<Client.Request<T, IA, E, Option.Option<A>>>(tag)
    const encodeRequest = SqlSchema.encode(options.request, "request")
    const decodeResult = SqlSchema.decodeUnknown(options.result, "result")
    const Resolver = RequestResolver.fromEffect(
      (req: Client.Request<T, IA, E, Option.Option<A>>) =>
        encodeRequest(req.i0).pipe(
          Effect.flatMap(options.run),
          Effect.map(ReadonlyArray.head),
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.succeedNone,
              onSome: (result) => Effect.asSome(decodeResult(result))
            })
          )
        )
    )

    const makeExecute = makeExecuteRequest(Request)
    const execute = makeExecute(Resolver as any)
    const populateCache = makePopulateCache(Request)
    const invalidateCache = makeInvalidateCache(Request)

    return {
      Request,
      Resolver,
      execute,
      makeExecute,
      populateCache,
      invalidateCache
    } as any
  }

  const resolverSingle = <T extends string, R, IR, II, IA, AR, AI, A, E>(
    tag: T,
    options: {
      readonly request: Schema.Schema<IA, II, IR>
      readonly result: Schema.Schema<A, AI, AR>
      readonly run: (request: II) => Effect.Effect<ReadonlyArray<unknown>, E, R>
    }
  ): Client.Resolver<T, R | IR | AR, IA, A, E> => {
    const Request = request.tagged<Client.Request<T, IA, E, A>>(tag)
    const encodeRequest = SqlSchema.encode(options.request, "request")
    const decodeResult = SqlSchema.decodeUnknown(options.result, "result")
    const Resolver = RequestResolver.fromEffect((req: Client.Request<T, IA, E, A>) =>
      encodeRequest(req.i0).pipe(
        Effect.flatMap(options.run),
        Effect.flatMap((_) => Effect.orDie(ReadonlyArray.head(_))),
        Effect.flatMap(decodeResult)
      )
    )

    const makeExecute = makeExecuteRequest(Request)
    const execute = makeExecute(Resolver)
    const populateCache = makePopulateCache(Request)
    const invalidateCache = makeInvalidateCache(Request)

    return {
      Request,
      Resolver,
      execute,
      makeExecute,
      populateCache,
      invalidateCache
    } as any
  }

  const resolverVoid = <T extends string, R, IR, II, IA, E>(
    tag: T,
    options: {
      readonly request: Schema.Schema<IA, II, IR>
      readonly run: (
        requests: ReadonlyArray<II>
      ) => Effect.Effect<unknown, E, R>
    }
  ): Client.Resolver<T, R | IR, IA, void, E> => {
    const Request = request.tagged<Client.Request<T, IA, E, void>>(tag)
    const encodeRequests = SqlSchema.encode(
      Schema.array(options.request),
      "request"
    )
    const Resolver = RequestResolver.makeBatched(
      (requests: Array<Client.Request<T, IA, E, void>>) =>
        encodeRequests(requests.map((_) => _.i0)).pipe(
          Effect.flatMap(options.run),
          Effect.zipRight(
            Effect.forEach(
              requests,
              (req) => request.succeed(req, void 0 as any),
              { discard: true }
            )
          ),
          Effect.catchAll((error) =>
            Effect.forEach(requests, (req) => request.fail(req, error), {
              discard: true
            })
          )
        )
    )

    const makeExecute = makeExecuteRequest(Request)
    const execute = makeExecute(Resolver)
    const populateCache = makePopulateCache(Request)
    const invalidateCache = makeInvalidateCache(Request)

    return {
      Request,
      Resolver,
      execute,
      makeExecute,
      populateCache,
      invalidateCache
    } as any
  }

  const resolver = <T extends string, R, IR, II, IA, AR, AI, A, E>(
    tag: T,
    options: {
      readonly request: Schema.Schema<IA, II, IR>
      readonly result: Schema.Schema<A, AI, AR>
      readonly run: (
        requests: ReadonlyArray<II>
      ) => Effect.Effect<ReadonlyArray<unknown>, E, R>
    }
  ): Client.Resolver<T, R | IR | AR, IA, A, E | Error.ResultLengthMismatch> => {
    const Request = request.tagged<Client.Request<T, IA, E | Error.ResultLengthMismatch, A>>(tag)
    const encodeRequests = SqlSchema.encode(
      Schema.array(options.request),
      "request"
    )
    const decodeResult = SqlSchema.decodeUnknown(options.result, "result")
    const Resolver = RequestResolver.makeBatched(
      (requests: Array<Client.Request<T, IA, E | Error.ResultLengthMismatch, A>>) =>
        encodeRequests(requests.map((_) => _.i0)).pipe(
          Effect.flatMap(options.run),
          Effect.filterOrFail(
            (results) => results.length === requests.length,
            ({ length }) => new Error.ResultLengthMismatch({ expected: requests.length, actual: length })
          ),
          Effect.flatMap((results) =>
            Effect.forEach(results, (result, i) =>
              decodeResult(result).pipe(
                Effect.flatMap((result) => request.succeed(requests[i], result)),
                Effect.catchAll((error) => request.fail(requests[i], error as any))
              ))
          ),
          Effect.catchAll((error) =>
            Effect.forEach(requests, (req) => request.fail(req, error), {
              discard: true
            })
          )
        )
    )

    const makeExecute = makeExecuteRequest(Request)
    const execute = makeExecute(Resolver)

    const populateCache = makePopulateCache(Request)
    const invalidateCache = makeInvalidateCache(Request)

    return {
      Request,
      Resolver,
      execute,
      makeExecute,
      populateCache,
      invalidateCache
    } as any
  }

  const resolverIdMany = <T extends string, R, IR, II, IA, AR, AI, A, E, K>(
    tag: T,
    options: {
      readonly request: Schema.Schema<IA, II, IR>
      readonly result: Schema.Schema<A, AI, AR>
      readonly requestId: (_: IA) => K
      readonly resultId: (_: AI) => K
      readonly run: (
        requests: ReadonlyArray<II>
      ) => Effect.Effect<ReadonlyArray<unknown>, E, R>
    }
  ): Client.Resolver<T, R | IR | AR, IA, ReadonlyArray<A>, E> => {
    const Request = request.tagged<Client.Request<T, IA, E, ReadonlyArray<A>>>(tag)
    const encodeRequests = SqlSchema.encode(
      Schema.array(options.request),
      "request"
    )
    const decodeResult = SqlSchema.decodeUnknown(options.result, "result")
    const Resolver = RequestResolver.makeBatched(
      (requests: Array<Client.Request<T, IA, E, ReadonlyArray<A>>>) =>
        Effect.all({
          results: Effect.flatMap(
            encodeRequests(requests.map((_) => _.i0)),
            options.run
          ),
          requestsMap: Effect.sync(() =>
            requests.reduce(
              (acc, request) =>
                MutableMap.set(acc, options.requestId(request.i0), [
                  request,
                  []
                ]),
              MutableMap.empty<
                K,
                readonly [Client.Request<T, IA, E, ReadonlyArray<A>>, Array<A>]
              >()
            )
          )
        }).pipe(
          Effect.tap(({ requestsMap, results }) =>
            Effect.forEach(
              results,
              (result) => {
                const id = options.resultId(result as any)
                const req = MutableMap.get(requestsMap, id)

                if (Option.isNone(req)) {
                  return Effect.unit
                }

                return decodeResult(result).pipe(
                  Effect.tap((result) =>
                    Effect.sync(() => {
                      req.value[1].push(result)
                    })
                  ),
                  Effect.catchAll((error) =>
                    Effect.zipRight(
                      Effect.sync(() => MutableMap.remove(requestsMap, id)),
                      request.fail(req.value[0], error)
                    )
                  )
                )
              },
              { concurrency: "unbounded", discard: true }
            )
          ),
          Effect.tap(({ requestsMap }) =>
            Effect.forEach(
              requestsMap,
              ([, [req, results]]) => request.succeed(req, results),
              { discard: true }
            )
          ),
          Effect.catchAll((error) =>
            Effect.forEach(requests, (req) => request.fail(req, error as any), {
              discard: true
            })
          )
        )
    )

    const makeExecute = makeExecuteRequest(Request)
    const execute = makeExecute(Resolver)
    const populateCache = makePopulateCache(Request)
    const invalidateCache = makeInvalidateCache(Request)

    return {
      Request,
      Resolver,
      execute,
      makeExecute,
      populateCache,
      invalidateCache
    } as any
  }

  const resolverId = <T extends string, R, IR, II, IA, AR, AI, A, E>(
    tag: T,
    options: {
      readonly id: Schema.Schema<IA, II, IR>
      readonly result: Schema.Schema<A, AI, AR>
      readonly resultId: (_: AI) => IA
      readonly run: (
        requests: ReadonlyArray<II>
      ) => Effect.Effect<ReadonlyArray<AI>, E, R>
    }
  ): Client.Resolver<T, R | IR | AR, IA, Option.Option<A>, E> => {
    const Request = request.tagged<Client.Request<T, IA, E, Option.Option<A>>>(tag)
    const encodeRequests = SqlSchema.encode(Schema.array(options.id), "request")
    const decodeResult = SqlSchema.decodeUnknown(options.result, "result")
    const Resolver = RequestResolver.makeBatched(
      (requests: Array<Client.Request<T, IA, E, Option.Option<A>>>) =>
        Effect.all({
          results: Effect.flatMap(
            encodeRequests(requests.map((_) => _.i0)),
            options.run
          ),
          requestsMap: Effect.sync(() =>
            requests.reduce(
              (acc, request) => acc.set(request.i0, request),
              new Map<IA, Client.Request<T, IA, E, Option.Option<A>>>()
            )
          )
        }).pipe(
          Effect.tap(({ requestsMap, results }) =>
            Effect.forEach(
              results,
              (result) => {
                const id = options.resultId(result)
                const req = requestsMap.get(id)

                if (!req) {
                  return Effect.unit
                }

                requestsMap.delete(id)

                return decodeResult(result).pipe(
                  Effect.flatMap((result) => request.succeed(req, Option.some(result))),
                  Effect.catchAll((error) => request.fail(req, error as any))
                )
              },
              { concurrency: "unbounded", discard: true }
            )
          ),
          Effect.tap(({ requestsMap }) =>
            Effect.forEach(
              requestsMap.values(),
              (req) => request.succeed(req, Option.none()),
              { discard: true }
            )
          ),
          Effect.catchAll((error) =>
            Effect.forEach(requests, (req) => request.fail(req, error as any), {
              discard: true
            })
          )
        )
    )

    const makeExecute = makeExecuteRequest(Request)
    const execute = makeExecute(Resolver)
    const populateCache = makePopulateCache(Request)
    const invalidateCache = makeInvalidateCache(Request)

    return {
      Request,
      Resolver,
      execute,
      makeExecute,
      populateCache,
      invalidateCache
    } as any
  }

  const client: Client.Client = Object.assign(
    Statement.make(getConnection, compiler),
    {
      safe: undefined as any,
      unsafe: Statement.unsafe(getConnection, compiler),
      and: Statement.and,
      or: Statement.or,
      join: Statement.join,
      csv: Statement.csv,
      withTransaction,
      reserve: transactionAcquirer,
      schema,
      schemaSingle,
      schemaSingleOption,
      schemaVoid,
      resolver,
      resolverSingleOption,
      resolverSingle,
      resolverVoid,
      resolverId,
      resolverIdMany
    }
  )
  ;(client as any).safe = client

  return client
}

/** @internal */
export const defaultTransforms = (
  transformer: (str: string) => string,
  nested = true
) => {
  const transformValue = (value: any) => {
    if (Array.isArray(value)) {
      if (value.length === 0 || value[0].constructor !== Object) {
        return value
      }
      return array(value)
    } else if (value?.constructor === Object) {
      return transformObject(value)
    }
    return value
  }

  const transformObject = (obj: Record<string, any>): any => {
    const newObj: Record<string, any> = {}
    for (const key in obj) {
      newObj[transformer(key)] = transformValue(obj[key])
    }
    return newObj
  }

  const transformArrayNested = <A extends object>(
    rows: ReadonlyArray<A>
  ): ReadonlyArray<A> => {
    const newRows: Array<A> = new Array(rows.length)
    for (let i = 0, len = rows.length; i < len; i++) {
      const row = rows[i]
      const obj: any = {}
      for (const key in row) {
        obj[transformer(key)] = transformValue(row[key])
      }
      newRows[i] = obj
    }
    return newRows
  }

  const transformArray = <A extends object>(
    rows: ReadonlyArray<A>
  ): ReadonlyArray<A> => {
    const newRows: Array<A> = new Array(rows.length)
    for (let i = 0, len = rows.length; i < len; i++) {
      const row = rows[i]
      const obj: any = {}
      for (const key in row) {
        obj[transformer(key)] = row[key]
      }
      newRows[i] = obj
    }
    return newRows
  }

  const array = nested ? transformArrayNested : transformArray

  return {
    value: transformValue,
    object: transformObject,
    array
  } as const
}
