import * as http from "http"

import * as qs from "query-string"

import * as A from "@matechs/core/Array"
import * as Ei from "@matechs/core/Either"
import { constVoid, identity, pipe } from "@matechs/core/Function"
import * as NA from "@matechs/core/NonEmptyArray"
import * as C from "@matechs/core/next/Cause"
import * as T from "@matechs/core/next/Effect"
import * as E from "@matechs/core/next/Exit"
import * as F from "@matechs/core/next/Fiber"
import * as Has from "@matechs/core/next/Has"
import * as L from "@matechs/core/next/Layer"
import * as Scope from "@matechs/core/next/Scope"
import * as Supervisor from "@matechs/core/next/Supervisor"
import { AtomicNumber } from "@matechs/core/next/Support/AtomicNumber"
import { AtomicReference } from "@matechs/core/next/Support/AtomicReference"
import * as MO from "@matechs/morphic"

export class Executor {
  readonly running = new Set<F.FiberContext<never, void>>()

  constructor(readonly env: T.DefaultEnv) {
    this.fiberContext = this.fiberContext.bind(this)
    this.runAsync = this.runAsync.bind(this)
  }

  fiberContext() {
    const initialIS = F.interruptible
    const fiberId = F.newFiberId()
    const scope = Scope.unsafeMakeScope<E.Exit<never, void>>()
    const supervisor = Supervisor.none

    const context = new F.FiberContext<never, void>(
      fiberId,
      this.env,
      initialIS,
      new Map(),
      supervisor,
      scope
    )

    return context
  }

  runAsync(effect: T.Effect<unknown, T.DefaultEnv, never, void>) {
    const context = this.fiberContext()

    this.running.add(context)

    context.evaluateLater(effect._I)

    context.onDone(() => {
      this.running.delete(context)
    })

    return context
  }
}

export const makeExecutor = () => T.access((_: T.DefaultEnv) => new Executor(_))

export type Handler = (
  next: FinalHandler
) => T.Effect<unknown, T.DefaultEnv & HasRequestState & HasRequestContext, never, void>

export type HandlerR<R> = T.AsyncRE<R, HttpError, void>
export type HandlerRE<R, E> = T.AsyncRE<R, E, void>

export type FinalHandler = T.Effect<
  unknown,
  T.DefaultEnv & HasRequestState & HasRequestContext,
  never,
  void
>

export class RequestState {
  private stateMap = new Map<unknown, unknown>()

  constructor(readonly requestId: number) {}

  put<V>(_: Value<V>) {
    return (v: V) =>
      T.effectTotal(() => {
        this.stateMap.set(_, v)
      })
  }

  get<V>(_: Value<V>) {
    return T.effectTotal(() => {
      const v = this.stateMap.get(_)
      if (v) {
        return v as V
      }
      return _.initial
    })
  }
}

export class Value<V> {
  readonly _V!: V

  constructor(readonly initial: V) {}
}

export const requestState = <V>(initial: V) => new Value(initial)

export const HasRequestState = T.has<RequestState>()
export type HasRequestState = T.HasType<typeof HasRequestState>

export const getRequestState = <V>(v: Value<V>) =>
  T.accessServiceM(HasRequestState)((s) => s.get(v))

export const setRequestState = <V>(v: Value<V>) => (value: V) =>
  T.accessServiceM(HasRequestState)((s) => s.put(v)(value))

export class Server {
  readonly interrupted = new AtomicReference(false)

  readonly requestId = new AtomicNumber(0)

  readonly server = http.createServer(
    (req: http.IncomingMessage, res: http.ServerResponse) => {
      if (!this.interrupted.get) {
        const rid = this.requestId.incrementAndGet()
        const rst = new RequestState(rid)

        const up = req?.url?.split("?")

        pipe(
          this.finalHandler(),
          T.provideService(HasRequestContext)(
            new RequestContext(
              up && up.length > 1 ? up[1] : "",
              up && up.length > 0 ? up[0] : "",
              req,
              res
            )
          ),
          T.provideService(HasRequestState)(rst),
          this.executor.runAsync
        )
      }
    }
  )

  readonly defaultHandler: FinalHandler = T.accessService(HasRequestContext)(
    ({ res }) => {
      if (!res.writableEnded) {
        res.statusCode = 404
        res.end()
      }
    }
  )

  handlers = new Array<Handler>()

  addHandler(h: Handler) {
    this.handlers.push(h)
  }

  removeHandler(h: Handler) {
    this.handlers = this.handlers.filter((h1) => h1 !== h)
  }

  finalHandler(
    rest: readonly Handler[] = this.handlers
  ): T.Effect<
    unknown,
    T.DefaultEnv & HasRequestState & HasRequestContext,
    never,
    void
  > {
    if (A.isNonEmpty(rest)) {
      return NA.head(rest)(this.finalHandler(NA.tail(rest)))
    } else {
      return this.defaultHandler
    }
  }

  constructor(readonly executor: Executor, readonly es: T.ExecutionStrategy) {}

  open(port: number, host: string) {
    return T.effectAsync<unknown, never, void>((cb) => {
      const onErr = (e: any) => {
        cb(T.die(e))
      }
      this.server.listen(port, host, () => {
        this.server.removeListener("error", onErr)
        cb(T.unit)
      })
      this.server.once("error", onErr)
    })
  }

  release() {
    return pipe(
      T.effectTotal(() => {
        this.interrupted.set(true)
      }),
      T.chain(() =>
        T.checkDescriptor((d) =>
          T.foreachExec_(this.es, this.executor.running, (f) => f.interruptAs(d.id))
        )
      ),
      T.chain((es) =>
        pipe(
          T.effectAsync<unknown, never, void>((cb) => {
            this.server.close((e) => {
              if (e) {
                cb(T.die(e))
              } else {
                cb(T.unit)
              }
            })
          }),
          T.result,
          T.map((e) => [es, e] as const)
        )
      ),
      T.chain(([exits, e]) =>
        pipe(
          exits.filter((e) => !(e._tag === "Failure" && C.interruptedOnly(e.cause))),
          (e) => E.collectAllPar(...e),
          (o) => {
            if (o._tag === "None") {
              return T.done(e)
            }
            return T.orDieKeep(T.done(E.zipWith_(o.value, e, constVoid, C.Then)))
          }
        )
      )
    )
  }
}

export interface ServerConfig {
  readonly port: number
  readonly host: string
  readonly interruptionStrategy: T.ExecutionStrategy
}

export const serverConfig = ({
  host,
  interruptionStrategy = T.parallelN(100),
  port
}: {
  port: number
  host: string
  interruptionStrategy?: T.ExecutionStrategy
}): ServerConfig => ({ host, port, interruptionStrategy })

export function server(
  has: Has.Augumented<Server>
): L.AsyncR<T.Has<ServerConfig> & T.DefaultEnv, T.Has<Server>> {
  return L.service(has)
    .prepare(
      T.accessServiceM(config(has))((sc) =>
        pipe(
          makeExecutor(),
          T.map((e) => new Server(e, sc.interruptionStrategy))
        )
      )
    )
    .open((s) => T.accessServiceM(config(has))((sc) => s.open(sc.port, sc.host)))
    .release((s) => s.release())
}

export const configDerivationContext = new Has.DerivationContext()

export const config = (has: Has.Augumented<Server>) =>
  configDerivationContext.derive(has, () => T.has<ServerConfig>())

export const accessConfigM = (has: Has.Augumented<Server>) =>
  T.accessServiceM(config(has))

export const defaultErrorHandler = <R, E extends HttpError>(f: HandlerRE<R, E>) =>
  T.foldM_(f, (e) => e.render(), T.succeedNow)

export class RequestContext {
  constructor(
    readonly query: string,
    readonly url: string,
    readonly req: http.IncomingMessage,
    readonly res: http.ServerResponse
  ) {}
}

export const HasRequestContext = T.has<RequestContext>()
export type HasRequestContext = T.HasType<typeof HasRequestContext>

export const getRequestContext = T.accessServiceM(HasRequestContext)(T.succeedNow)

export const getBodyBuffer: T.AsyncRE<HasRequestContext, never, Buffer> = pipe(
  T.accessService(HasRequestContext)((i) => i.req),
  T.chain((req) =>
    T.effectAsyncInterrupt<unknown, never, Buffer>((cb) => {
      const body: Uint8Array[] = []

      const onData: (chunk: any) => void = (chunk) => {
        body.push(chunk)
      }

      const onEnd = () => {
        cb(T.succeedNow(Buffer.concat(body)))
      }

      req.on("data", onData)
      req.on("end", onEnd)

      return T.effectTotal(() => {
        req.removeListener("data", onData)
        req.removeListener("end", onEnd)
      })
    })
  )
)

export const body = <A>(morph: { decode: (i: unknown) => Ei.Either<MO.Errors, A> }) =>
  pipe(
    getBodyBuffer,
    T.chain((b) =>
      pipe(
        T.effectPartial(identity)(() => JSON.parse(b.toString())),
        T.catchAll(() => T.fail(new JsonDecoding(b.toString()))),
        T.chain(
          (u: unknown): T.AsyncRE<T.DefaultEnv, BodyDecoding, A> => {
            const decoded = morph.decode(u)

            switch (decoded._tag) {
              case "Right": {
                return T.succeedNow(decoded.right)
              }
              case "Left": {
                return T.fail(new BodyDecoding(decoded.left))
              }
            }
          }
        )
      )
    )
  )

export const query = <A>(morph: { decode: (i: unknown) => Ei.Either<MO.Errors, A> }) =>
  pipe(
    getRequestContext,
    T.chain((i) =>
      pipe(
        T.effectPartial(identity)(() => qs.parse(`?${i.query}`)),
        T.catchAll(() => T.fail(new QueryParsing())),
        T.chain(
          (u: unknown): T.AsyncRE<T.DefaultEnv, QueryDecoding, A> => {
            const decoded = morph.decode(u)

            switch (decoded._tag) {
              case "Right": {
                return T.succeedNow(decoded.right)
              }
              case "Left": {
                return T.fail(new QueryDecoding(decoded.left))
              }
            }
          }
        )
      )
    )
  )

export const response = <A>(morph: { encode: (i: A) => unknown }) => (a: A) =>
  T.accessServiceM(HasRequestContext)((i) =>
    T.effectTotal(() => {
      i.res.setHeader("Content-Type", "application/json")
      i.res.write(JSON.stringify(morph.encode(a)))
      i.res.end()
    })
  )

export const status = (code: number) =>
  pipe(
    getRequestContext,
    T.chain((i) =>
      T.effectTotal(() => {
        i.res.statusCode = code
      })
    )
  )

export abstract class HttpError {
  abstract render(): T.Effect<unknown, HasRequestContext, never, void>
}

export type RequestError =
  | ParametersDecoding
  | JsonDecoding
  | BodyDecoding
  | QueryParsing
  | QueryDecoding

export class JsonDecoding extends HttpError {
  readonly _tag = "JsonDecoding"

  constructor(readonly original: unknown) {
    super()
  }

  render(): T.Effect<unknown, HasRequestContext, never, void> {
    return T.accessServiceM(HasRequestContext)((i) =>
      T.effectTotal(() => {
        i.res.statusCode = 422
        i.res.setHeader("Content-Type", "application/json")
        i.res.write(
          JSON.stringify({
            _tag: "JsonDecodingFailed"
          })
        )
        i.res.end()
      })
    )
  }
}

export class BodyDecoding extends HttpError {
  readonly _tag = "BodyDecoding"

  constructor(readonly errors: MO.Errors) {
    super()
  }

  render(): T.Effect<unknown, HasRequestContext, never, void> {
    return T.accessServiceM(HasRequestContext)((i) =>
      T.effectTotal(() => {
        i.res.statusCode = 422
        i.res.setHeader("Content-Type", "application/json")
        i.res.write(JSON.stringify({ error: MO.reportFailure(this.errors) }))
        i.res.end()
      })
    )
  }
}

export class ParametersDecoding extends HttpError {
  readonly _tag = "ParametersDecoding"

  constructor(readonly errors: MO.Errors) {
    super()
  }

  render(): T.Effect<unknown, HasRequestContext, never, void> {
    return T.accessServiceM(HasRequestContext)((i) =>
      T.effectTotal(() => {
        i.res.statusCode = 422
        i.res.setHeader("Content-Type", "application/json")
        i.res.write(JSON.stringify({ errors: MO.reportFailure(this.errors) }))
        i.res.end()
      })
    )
  }
}

export class QueryParsing extends HttpError {
  readonly _tag = "QueryParsing"

  constructor() {
    super()
  }

  render(): T.Effect<unknown, HasRequestContext, never, void> {
    return T.accessServiceM(HasRequestContext)((i) =>
      T.effectTotal(() => {
        i.res.statusCode = 422
        i.res.setHeader("Content-Type", "application/json")
        i.res.write(JSON.stringify({ error: "Invalid query params" }))
        i.res.end()
      })
    )
  }
}

export class QueryDecoding extends HttpError {
  readonly _tag = "QueryDecoding"

  constructor(readonly errors: MO.Errors) {
    super()
  }

  render(): T.Effect<unknown, HasRequestContext, never, void> {
    return T.accessServiceM(HasRequestContext)((i) =>
      T.effectTotal(() => {
        i.res.statusCode = 422
        i.res.setHeader("Content-Type", "application/json")
        i.res.write(JSON.stringify({ error: MO.reportFailure(this.errors) }))
        i.res.end()
      })
    )
  }
}
