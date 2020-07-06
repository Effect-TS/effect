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
import * as Ei from "@matechs/core/Either"
import { constVoid, pipe, identity } from "@matechs/core/Function"
import * as NA from "@matechs/core/NonEmptyArray"
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
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: FinalHandler
) => T.Effect<unknown, T.DefaultEnv, never, void>

export type HandlerE<E> = T.AsyncRE<T.DefaultEnv & HasRouteInput, E, void>
export type HandlerR<R> = T.AsyncRE<R, HttpError, void>
export type HandlerRE<R, E> = T.AsyncRE<R, E, void>

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

export class RouteInput {
  constructor(
    readonly params: unknown,
    readonly req: http.IncomingMessage,
    readonly res: http.ServerResponse,
    readonly next: FinalHandler
  ) {}
}

export const HasRouteInput = T.has<RouteInput>()()
export type HasRouteInput = T.HasType<typeof HasRouteInput>

export const accessRouteInputM = T.accessServiceM(HasRouteInput)

export type RouteHandler<R> = T.AsyncRE<R & HasRouteInput, HttpError, void>

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
              return pipe(
                f,
                defaultErrorHandler,
                T.provideService(HasRouteInput)(
                  new RouteInput(matchResult.params, req, res, next)
                ),
                T.provideAll(r)
              )
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
              return pipe(
                f,
                defaultErrorHandler,
                T.provideService(HasRouteInput)(
                  new RouteInput(matchResult.params, req, res, next)
                ),
                T.provideAll(r)
              )
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

export const accessConfigM = <K>(has: Has.Augumented<Server, K>) =>
  T.accessServiceM(config(has))

export const defaultErrorHandler = <U, R, E extends HttpError>(f: HandlerRE<R, E>) =>
  T.foldM_(f, (e) => e.render(), T.succeedNow)

export const getBody = <R, E>(
  f: (body: Buffer) => HandlerRE<R, E>
): HandlerRE<R & HasRouteInput, E> =>
  pipe(
    T.accessService(HasRouteInput)((i) => i.req),
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
    ),
    T.chain((body) => f(body))
  )

export const params_ = <R1, E, A>(
  morph: {
    decode: (i: unknown) => Ei.Either<MO.Errors, A>
  },
  f: (a: A) => HandlerRE<R1, E>
) => params(f)(morph)

export const params = <R1, E, A>(f: (a: A) => HandlerRE<R1, E>) => (morph: {
  decode: (i: unknown) => Ei.Either<MO.Errors, A>
}) =>
  accessRouteInputM(
    (i): HandlerRE<R1, E | ParametersDecoding> => {
      const decoded = morph.decode(i.params)

      switch (decoded._tag) {
        case "Right": {
          return f(decoded.right)
        }
        case "Left": {
          return T.fail(new ParametersDecoding(decoded.left))
        }
      }
    }
  )

export const body_ = <R1, E, A>(
  morph: {
    decode: (i: unknown) => Ei.Either<MO.Errors, A>
  },
  f: (a: A) => HandlerRE<R1, E>
) => body(f)(morph)

export const body = <R1, E, A>(f: (a: A) => HandlerRE<R1, E>) => (morph: {
  decode: (i: unknown) => Ei.Either<MO.Errors, A>
}) =>
  getBody((b) =>
    pipe(
      T.effectPartial(identity)(() => JSON.parse(b.toString())),
      T.catchAll(() => T.fail(new JsonDecoding(b.toString()))),
      T.chain(
        (u: unknown): T.AsyncRE<R1 & T.DefaultEnv, E | BodyDecoding, void> => {
          const decoded = morph.decode(u)

          switch (decoded._tag) {
            case "Right": {
              return f(decoded.right)
            }
            case "Left": {
              return T.fail(new BodyDecoding(decoded.left))
            }
          }
        }
      )
    )
  )

export const response_ = <A>(morph: { encode: (i: A) => unknown }, a: A) =>
  response(a)(morph)

export const response = <A>(a: A) => (morph: { encode: (i: A) => unknown }) =>
  T.accessServiceM(HasRouteInput)((i) =>
    T.effectTotal(() => {
      i.res.setHeader("Content-Type", "application/json")
      i.res.write(JSON.stringify(morph.encode(a)))
      i.res.end()
    })
  )

export const next = accessRouteInputM((i) => i.next(i.req, i.res))

export const status = (code: number) =>
  accessRouteInputM((i) =>
    T.effectTotal(() => {
      i.res.statusCode = code
    })
  )

export abstract class HttpError {
  abstract render(): T.Effect<unknown, HasRouteInput, never, void>
}

export type RequestError = ParametersDecoding | JsonDecoding | BodyDecoding

export class JsonDecoding extends HttpError {
  readonly _tag = "JsonDecoding"

  constructor(readonly original: unknown) {
    super()
  }

  render(): T.Effect<unknown, HasRouteInput, never, void> {
    return T.accessServiceM(HasRouteInput)((i) =>
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

  render(): T.Effect<unknown, HasRouteInput, never, void> {
    return T.accessServiceM(HasRouteInput)((i) =>
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

  render(): T.Effect<unknown, HasRouteInput, never, void> {
    return T.accessServiceM(HasRouteInput)((i) =>
      T.effectTotal(() => {
        i.res.statusCode = 422
        i.res.setHeader("Content-Type", "application/json")
        i.res.write(JSON.stringify({ error: MO.reportFailure(this.errors) }))
        i.res.end()
      })
    )
  }
}
