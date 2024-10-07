import * as Arr from "effect/Array"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import { dual } from "effect/Function"
import * as Inspectable from "effect/Inspectable"
import type * as App from "../HttpApp.js"
import type * as Multiplex from "../HttpMultiplex.js"
import * as Error from "../HttpServerError.js"
import * as ServerRequest from "../HttpServerRequest.js"
import type * as ServerResponse from "../HttpServerResponse.js"

/** @internal */
export const TypeId: Multiplex.TypeId = Symbol.for("@effect/platform/HttpMultiplex") as Multiplex.TypeId

class MultiplexImpl<E = never, R = never> extends Effectable.Class<
  ServerResponse.HttpServerResponse,
  E | Error.RouteNotFound,
  R | ServerRequest.HttpServerRequest
> implements Multiplex.HttpMultiplex<E, R> {
  readonly [TypeId]: Multiplex.TypeId

  constructor(
    readonly apps: ReadonlyArray<
      readonly [
        predicate: (request: ServerRequest.HttpServerRequest) => Effect.Effect<boolean, E, R>,
        app: App.Default<E, R>
      ]
    >
  ) {
    super()
    this[TypeId] = TypeId

    let execute: (request: ServerRequest.HttpServerRequest) => App.Default<E | Error.RouteNotFound, R> = (request) =>
      Effect.fail(new Error.RouteNotFound({ request }))

    for (let i = apps.length - 1; i >= 0; i--) {
      const [predicate, app] = apps[i]
      const previous = execute
      execute = (request) =>
        Effect.flatMap(
          predicate(request),
          (match) => match ? app : previous(request)
        )
    }

    this.execute = Effect.flatMap(ServerRequest.HttpServerRequest, execute)
  }

  execute: App.Default<E | Error.RouteNotFound, R>

  commit() {
    return this.execute
  }

  [Inspectable.NodeInspectSymbol]() {
    return Inspectable.toJSON(this)
  }
  toString(): string {
    return Inspectable.format(this)
  }
  toJSON(): unknown {
    return {
      _id: "@effect/platform/HttpMultiplex"
    }
  }
}

/** @internal */
export const empty: Multiplex.HttpMultiplex<never> = new MultiplexImpl([])

/** @internal */
export const make = <E, R>(
  apps: Iterable<
    readonly [
      predicate: (request: ServerRequest.HttpServerRequest) => Effect.Effect<boolean, E, R>,
      app: App.Default<E, R>
    ]
  >
): Multiplex.HttpMultiplex<E, R> => new MultiplexImpl(Arr.fromIterable(apps))

/** @internal */
export const add = dual<
  <E2, R2, E3, R3>(
    predicate: (request: ServerRequest.HttpServerRequest) => Effect.Effect<boolean, E2, R2>,
    app: App.Default<E3, R3>
  ) => <E, R>(self: Multiplex.HttpMultiplex<E, R>) => Multiplex.HttpMultiplex<E | E2 | E3, R | R2 | R3>,
  <E, R, E2, R2, E3, R3>(
    self: Multiplex.HttpMultiplex<E, R>,
    predicate: (request: ServerRequest.HttpServerRequest) => Effect.Effect<boolean, E2, R2>,
    app: App.Default<E3, R3>
  ) => Multiplex.HttpMultiplex<E | E2 | E3, R | R2 | R3>
>(
  3,
  (self, predicate, app) =>
    make([
      ...self.apps,
      [predicate, app]
    ] as any)
)

/** @internal */
export const headerExact = dual<
  <E2, R2>(
    header: string,
    value: string,
    app: App.Default<E2, R2>
  ) => <E, R>(self: Multiplex.HttpMultiplex<E, R>) => Multiplex.HttpMultiplex<E | E2, R | R2>,
  <E, R, E2, R2>(
    self: Multiplex.HttpMultiplex<E, R>,
    header: string,
    value: string,
    app: App.Default<E2, R2>
  ) => Multiplex.HttpMultiplex<E | E2, R | R2>
>(
  4,
  (self, header, value, app) =>
    add(self, (req) =>
      req.headers[header] !== undefined
        ? Effect.succeed(req.headers[header] === value)
        : Effect.succeed(false), app)
)

/** @internal */
export const headerRegex = dual<
  <E2, R2>(
    header: string,
    regex: RegExp,
    app: App.Default<E2, R2>
  ) => <E, R>(self: Multiplex.HttpMultiplex<E, R>) => Multiplex.HttpMultiplex<E | E2, R | R2>,
  <E, R, E2, R2>(
    self: Multiplex.HttpMultiplex<E, R>,
    header: string,
    regex: RegExp,
    app: App.Default<E2, R2>
  ) => Multiplex.HttpMultiplex<E | E2, R | R2>
>(
  4,
  (self, header, regex, app) =>
    add(self, (req) =>
      req.headers[header] !== undefined
        ? Effect.succeed(regex.test(req.headers[header]))
        : Effect.succeed(false), app)
)

/** @internal */
export const headerStartsWith = dual<
  <E2, R2>(
    header: string,
    prefix: string,
    app: App.Default<E2, R2>
  ) => <E, R>(self: Multiplex.HttpMultiplex<E, R>) => Multiplex.HttpMultiplex<E | E2, R | R2>,
  <E, R, E2, R2>(
    self: Multiplex.HttpMultiplex<E, R>,
    header: string,
    prefix: string,
    app: App.Default<E2, R2>
  ) => Multiplex.HttpMultiplex<E | E2, R | R2>
>(
  4,
  (self, header, prefix, app) =>
    add(self, (req) =>
      req.headers[header] !== undefined
        ? Effect.succeed(req.headers[header].startsWith(prefix))
        : Effect.succeed(false), app)
)

/** @internal */
export const headerEndsWith = dual<
  <E2, R2>(
    header: string,
    suffix: string,
    app: App.Default<E2, R2>
  ) => <E, R>(self: Multiplex.HttpMultiplex<E, R>) => Multiplex.HttpMultiplex<E | E2, R | R2>,
  <E, R, E2, R2>(
    self: Multiplex.HttpMultiplex<E, R>,
    header: string,
    suffix: string,
    app: App.Default<E2, R2>
  ) => Multiplex.HttpMultiplex<E | E2, R | R2>
>(
  4,
  (self, header, suffix, app) =>
    add(self, (req) =>
      req.headers[header] !== undefined
        ? Effect.succeed(req.headers[header].endsWith(suffix))
        : Effect.succeed(false), app)
)

/** @internal */
export const hostRegex = dual<
  <E2, R2>(
    regex: RegExp,
    app: App.Default<E2, R2>
  ) => <E, R>(self: Multiplex.HttpMultiplex<E, R>) => Multiplex.HttpMultiplex<E | E2, R | R2>,
  <E, R, E2, R2>(
    self: Multiplex.HttpMultiplex<E, R>,
    regex: RegExp,
    app: App.Default<E2, R2>
  ) => Multiplex.HttpMultiplex<E | E2, R | R2>
>(3, (self, regex, app) => headerRegex(self, "host", regex, app))

/** @internal */
export const hostStartsWith = dual<
  <E2, R2>(
    prefix: string,
    app: App.Default<E2, R2>
  ) => <E, R>(self: Multiplex.HttpMultiplex<E, R>) => Multiplex.HttpMultiplex<E | E2, R | R2>,
  <E, R, E2, R2>(
    self: Multiplex.HttpMultiplex<E, R>,
    prefix: string,
    app: App.Default<E2, R2>
  ) => Multiplex.HttpMultiplex<E | E2, R | R2>
>(3, (self, prefix, app) => headerStartsWith(self, "host", prefix, app))

/** @internal */
export const hostEndsWith = dual<
  <E2, R2>(
    suffix: string,
    app: App.Default<E2, R2>
  ) => <E, R>(self: Multiplex.HttpMultiplex<E, R>) => Multiplex.HttpMultiplex<E | E2, R | R2>,
  <E, R, E2, R2>(
    self: Multiplex.HttpMultiplex<E, R>,
    suffix: string,
    app: App.Default<E2, R2>
  ) => Multiplex.HttpMultiplex<E | E2, R | R2>
>(3, (self, suffix, app) => headerEndsWith(self, "host", suffix, app))

/** @internal */
export const hostExact = dual<
  <E2, R2>(
    host: string,
    app: App.Default<E2, R2>
  ) => <E, R>(self: Multiplex.HttpMultiplex<E, R>) => Multiplex.HttpMultiplex<E | E2, R | R2>,
  <E, R, E2, R2>(
    self: Multiplex.HttpMultiplex<E, R>,
    host: string,
    app: App.Default<E2, R2>
  ) => Multiplex.HttpMultiplex<E | E2, R | R2>
>(3, (self, host, app) => headerExact(self, "host", host, app))
