import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import { dual } from "effect/Function"
import * as Inspectable from "effect/Inspectable"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type * as App from "../../Http/App.js"
import type * as Multiplex from "../../Http/Multiplex.js"
import * as Error from "../../Http/ServerError.js"
import * as ServerRequest from "../../Http/ServerRequest.js"
import type * as ServerResponse from "../../Http/ServerResponse.js"

/** @internal */
export const TypeId: Multiplex.TypeId = Symbol.for("@effect/platform/Http/Multiplex") as Multiplex.TypeId

class MultiplexImpl<E = never, R = never>
  extends Effectable.Class<ServerResponse.ServerResponse, E | Error.RouteNotFound, R | ServerRequest.ServerRequest>
  implements Multiplex.Multiplex<E, R>
{
  readonly [TypeId]: Multiplex.TypeId

  constructor(
    readonly apps: ReadonlyArray<
      readonly [
        predicate: (request: ServerRequest.ServerRequest) => Effect.Effect<boolean, E, R>,
        app: App.Default<E, R>
      ]
    >
  ) {
    super()
    this[TypeId] = TypeId

    let execute: (request: ServerRequest.ServerRequest) => App.Default<E | Error.RouteNotFound, R> = (request) =>
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

    this.execute = Effect.flatMap(ServerRequest.ServerRequest, execute)
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
      _id: "@effect/platform/Http/Multiplex"
    }
  }
}

/** @internal */
export const empty: Multiplex.Multiplex<never> = new MultiplexImpl([])

/** @internal */
export const make = <R, E>(
  apps: Iterable<
    readonly [predicate: (request: ServerRequest.ServerRequest) => Effect.Effect<boolean, E, R>, app: App.Default<E, R>]
  >
): Multiplex.Multiplex<E, R> => new MultiplexImpl(ReadonlyArray.fromIterable(apps))

/** @internal */
export const add = dual<
  <R2, E2, R3, E3>(
    predicate: (request: ServerRequest.ServerRequest) => Effect.Effect<boolean, E2, R2>,
    app: App.Default<E3, R3>
  ) => <R, E>(self: Multiplex.Multiplex<E, R>) => Multiplex.Multiplex<E | E2 | E3, R | R2 | R3>,
  <R, E, R2, E2, R3, E3>(
    self: Multiplex.Multiplex<E, R>,
    predicate: (request: ServerRequest.ServerRequest) => Effect.Effect<boolean, E2, R2>,
    app: App.Default<E3, R3>
  ) => Multiplex.Multiplex<E | E2 | E3, R | R2 | R3>
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
  <R2, E2>(
    header: string,
    value: string,
    app: App.Default<E2, R2>
  ) => <R, E>(self: Multiplex.Multiplex<E, R>) => Multiplex.Multiplex<E | E2, R | R2>,
  <R, E, R2, E2>(
    self: Multiplex.Multiplex<E, R>,
    header: string,
    value: string,
    app: App.Default<E2, R2>
  ) => Multiplex.Multiplex<E | E2, R | R2>
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
  <R2, E2>(
    header: string,
    regex: RegExp,
    app: App.Default<E2, R2>
  ) => <R, E>(self: Multiplex.Multiplex<E, R>) => Multiplex.Multiplex<E | E2, R | R2>,
  <R, E, R2, E2>(
    self: Multiplex.Multiplex<E, R>,
    header: string,
    regex: RegExp,
    app: App.Default<E2, R2>
  ) => Multiplex.Multiplex<E | E2, R | R2>
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
  <R2, E2>(
    header: string,
    prefix: string,
    app: App.Default<E2, R2>
  ) => <R, E>(self: Multiplex.Multiplex<E, R>) => Multiplex.Multiplex<E | E2, R | R2>,
  <R, E, R2, E2>(
    self: Multiplex.Multiplex<E, R>,
    header: string,
    prefix: string,
    app: App.Default<E2, R2>
  ) => Multiplex.Multiplex<E | E2, R | R2>
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
  <R2, E2>(
    header: string,
    suffix: string,
    app: App.Default<E2, R2>
  ) => <R, E>(self: Multiplex.Multiplex<E, R>) => Multiplex.Multiplex<E | E2, R | R2>,
  <R, E, R2, E2>(
    self: Multiplex.Multiplex<E, R>,
    header: string,
    suffix: string,
    app: App.Default<E2, R2>
  ) => Multiplex.Multiplex<E | E2, R | R2>
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
  <R2, E2>(
    regex: RegExp,
    app: App.Default<E2, R2>
  ) => <R, E>(self: Multiplex.Multiplex<E, R>) => Multiplex.Multiplex<E | E2, R | R2>,
  <R, E, R2, E2>(
    self: Multiplex.Multiplex<E, R>,
    regex: RegExp,
    app: App.Default<E2, R2>
  ) => Multiplex.Multiplex<E | E2, R | R2>
>(3, (self, regex, app) => headerRegex(self, "host", regex, app))

/** @internal */
export const hostStartsWith = dual<
  <R2, E2>(
    prefix: string,
    app: App.Default<E2, R2>
  ) => <R, E>(self: Multiplex.Multiplex<E, R>) => Multiplex.Multiplex<E | E2, R | R2>,
  <R, E, R2, E2>(
    self: Multiplex.Multiplex<E, R>,
    prefix: string,
    app: App.Default<E2, R2>
  ) => Multiplex.Multiplex<E | E2, R | R2>
>(3, (self, prefix, app) => headerStartsWith(self, "host", prefix, app))

/** @internal */
export const hostEndsWith = dual<
  <R2, E2>(
    suffix: string,
    app: App.Default<E2, R2>
  ) => <R, E>(self: Multiplex.Multiplex<E, R>) => Multiplex.Multiplex<E | E2, R | R2>,
  <R, E, R2, E2>(
    self: Multiplex.Multiplex<E, R>,
    suffix: string,
    app: App.Default<E2, R2>
  ) => Multiplex.Multiplex<E | E2, R | R2>
>(3, (self, suffix, app) => headerEndsWith(self, "host", suffix, app))

/** @internal */
export const hostExact = dual<
  <R2, E2>(
    host: string,
    app: App.Default<E2, R2>
  ) => <R, E>(self: Multiplex.Multiplex<E, R>) => Multiplex.Multiplex<E | E2, R | R2>,
  <R, E, R2, E2>(
    self: Multiplex.Multiplex<E, R>,
    host: string,
    app: App.Default<E2, R2>
  ) => Multiplex.Multiplex<E | E2, R | R2>
>(3, (self, host, app) => headerExact(self, "host", host, app))
