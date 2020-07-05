import * as http from "http"

import { match } from "path-to-regexp"

import * as A from "@matechs/core/Array"
import * as C from "@matechs/core/Eff/Cause"
import * as T from "@matechs/core/Eff/Effect"
import * as E from "@matechs/core/Eff/Exit"
import * as F from "@matechs/core/Eff/Fiber"
import * as Has from "@matechs/core/Eff/Has"
import * as L from "@matechs/core/Eff/Layer"
import * as M from "@matechs/core/Eff/Managed"
import * as Scope from "@matechs/core/Eff/Scope"
import * as Supervisor from "@matechs/core/Eff/Supervisor"
import { AtomicReference } from "@matechs/core/Eff/Support/AtomicReference"
import { constVoid, pipe } from "@matechs/core/Function"
import * as NA from "@matechs/core/NonEmptyArray"

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
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: FinalHandler
) => T.Effect<unknown, T.DefaultEnv, never, void>

export type HandlerR<R> = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: FinalHandler
) => T.Effect<unknown, T.DefaultEnv & R, never, void>

export type FinalHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => T.Effect<unknown, T.DefaultEnv, never, void>

export class Server {
  readonly interrupted = new AtomicReference(false)

  readonly server = http.createServer(
    (req: http.IncomingMessage, res: http.ServerResponse) => {
      if (!this.interrupted.get) {
        this.executor.runAsync(this.finalHandler(req, res))
      }
    }
  )

  readonly defaultHandler: FinalHandler = (_, res) =>
    T.effectTotal(() => {
      if (!res.writableEnded) {
        res.statusCode = 404
        res.end()
      }
    })

  handlers = new Array<Handler>()

  addHandler(h: Handler) {
    this.handlers.push(h)
  }

  removeHandler(h: Handler) {
    this.handlers = this.handlers.filter((h1) => h1 !== h)
  }

  finalHandler(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    rest: readonly Handler[] = this.handlers
  ): T.Effect<unknown, T.DefaultEnv, never, void> {
    if (A.isNonEmpty(rest)) {
      return NA.head(rest)(req, res, (reqR, resN) =>
        this.finalHandler(reqR, resN, NA.tail(rest))
      )
    } else {
      return this.defaultHandler(req, res)
    }
  }

  constructor(readonly executor: Executor) {}

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
          T.foreachPar_(this.executor.running, (f) => f.interruptAs(d.id))
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

export class ServerConfig {
  constructor(readonly port: number, readonly host: string) {}
}

export function server<S>(
  has: Has.Augumented<Server, S>
): L.AsyncR<T.Has<ServerConfig, S> & T.DefaultEnv, T.Has<Server, S>> {
  return L.service(has)
    .prepare(
      pipe(
        makeExecutor(),
        T.map((e) => new Server(e))
      )
    )
    .open((s) => T.accessServiceM(config(has))((sc) => s.open(sc.port, sc.host)))
    .release((s) => s.release())
}

export type HttpMethod =
  | "GET"
  | "HEAD"
  | "POST"
  | "PUT"
  | "DELETE"
  | "CONNECT"
  | "OPTIONS"
  | "TRACE"
  | "PATCH"

export type RouteHandler<R> = (params: unknown) => HandlerR<R>

export function route<K>(has: T.Has<Server, K>) {
  return <R>(method: HttpMethod, pattern: string, f: RouteHandler<R>) => {
    const matcher = match(pattern)

    const acquire = T.accessServiceM(has)((server) =>
      T.access((r: R & T.DefaultEnv) => {
        const handler: Handler = (req, res, next) => {
          if (req.url && req.method && req.method === method) {
            const matchResult = matcher(req.url)

            if (matchResult === false) {
              return next(req, res)
            } else {
              return T.provideAll_(f(matchResult.params)(req, res, next), r)
            }
          } else {
            return next(req, res)
          }
        }

        server.addHandler(handler)

        return {
          handler
        }
      })
    )

    return pipe(
      M.makeExit_(acquire, ({ handler }) =>
        T.accessServiceM(has)((s) =>
          T.effectTotal(() => {
            s.removeHandler(handler)
          })
        )
      ),
      M.map(() => ({})),
      L.fromManagedEnv
    )
  }
}

export function use<K>(has: T.Has<Server, K>) {
  return <R>(pattern: string, f: RouteHandler<R>) => {
    const matcher = match(pattern)

    const acquire = T.accessServiceM(has)((server) =>
      T.access((r: R & T.DefaultEnv) => {
        const handler: Handler = (req, res, next) => {
          if (req.url && req.method) {
            const matchResult = matcher(req.url)

            if (matchResult === false) {
              return next(req, res)
            } else {
              return T.provideAll_(f(matchResult.params)(req, res, next), r)
            }
          } else {
            return next(req, res)
          }
        }

        server.addHandler(handler)

        return {
          handler
        }
      })
    )

    return pipe(
      M.makeExit_(acquire, ({ handler }) =>
        T.accessServiceM(has)((s) =>
          T.effectTotal(() => {
            s.removeHandler(handler)
          })
        )
      ),
      M.map(() => ({})),
      L.fromManagedEnv
    )
  }
}

export const configDerivationContext = new Has.DerivationContext()

export const config = <K>(has: Has.Augumented<Server, K>) =>
  configDerivationContext.derive(has, () =>
    T.has<ServerConfig>()<K>(has[Has.HasURI].brand)
  )

export const getBody = <R>(f: (body: Buffer) => HandlerR<R>): HandlerR<R> => (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: FinalHandler
) =>
  pipe(
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
    }),
    T.chain((body) => f(body)(req, res, next))
  )
