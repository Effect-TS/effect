/** @effect-diagnostics floatingEffect:skip-file missingEffectError:skip-file */
import { Cause, Effect } from "effect"
import { describe, expect, it } from "tstyche"

class LoadError extends Error {
  readonly _tag = "LoadError"
}

type SyncOptions<A, E> = { readonly try: () => A; readonly catch: (error: unknown) => E }
type AsyncOptions<A, E> = {
  readonly try: (signal: AbortSignal) => PromiseLike<A>
  readonly catch: (error: unknown) => E
}
declare const consumeDomain: (effect: Effect.Effect<number, LoadError>) => void
declare const syncUnion: (() => number) | SyncOptions<number, LoadError>
declare const asyncUnion: ((signal: AbortSignal) => PromiseLike<number>) | AsyncOptions<number, LoadError>

describe("try direct error contracts", () => {
  it("S01 inferred direct uses UnknownError", () => {
    expect(Effect.try(() => 1)).type.toBe<Effect.Effect<number, Cause.UnknownError>>()
  })
  it("S02 one explicit generic preserves direct", () => {
    expect(Effect.try<number>(() => 1)).type.toBe<Effect.Effect<number, Cause.UnknownError>>()
  })
  it("S03 context cannot invent a domain error", () => {
    function load(): Effect.Effect<number, LoadError> {
      // @ts-expect-error Type 'Effect<number, UnknownError, never>' is not assignable to type 'Effect<number, LoadError, never>'
      return Effect.try((): number => {
        throw new Error("source")
      })
    }
    expect(load).type.toBe<() => Effect.Effect<number, LoadError>>()
  })
  it("S04 context cannot erase the error channel", () => {
    function load(): Effect.Effect<number> {
      // @ts-expect-error Type 'Effect<number, UnknownError, never>' is not assignable to type 'Effect<number, never, never>'
      return Effect.try(() => 1)
    }
    expect(load).type.toBe<() => Effect.Effect<number>>()
  })
  it("S05 argument context cannot invent a domain error", () => {
    // @ts-expect-error Argument of type 'Effect<number, UnknownError, never>' is not assignable to parameter of type 'Effect<number, LoadError, never>'
    consumeDomain(Effect.try(() => 1))
  })
  it("S06 explicit error generic cannot hide UnknownError", () => {
    expect(Effect.try<number, LoadError>(() => 1)).type.not.toBeAssignableTo<Effect.Effect<number, LoadError>>()
  })
  it("S07 explicit never cannot hide UnknownError", () => {
    expect(Effect.try<number, never>(() => 1)).type.not.toBeAssignableTo<Effect.Effect<number>>()
  })
  it("S08 inferred mapped options preserve exact error", () => {
    expect(Effect.try({ try: () => 1, catch: () => new LoadError() })).type.toBe<Effect.Effect<number, LoadError>>()
  })
  it("S09 mapped return context remains valid", () => {
    function load(): Effect.Effect<number, LoadError> {
      return Effect.try({ try: () => 1, catch: () => new LoadError() })
    }
    expect(load()).type.toBe<Effect.Effect<number, LoadError>>()
  })
  it("S10 explicit mapped generics remain valid", () => {
    expect(Effect.try<number, LoadError>({ try: () => 1, catch: () => new LoadError() })).type.toBe<
      Effect.Effect<number, LoadError>
    >()
  })
  it("S11 partial mapped generics retain UnknownError default", () => {
    expect(Effect.try<number>({ try: () => 1, catch: (error) => new Cause.UnknownError(error) })).type.toBe<
      Effect.Effect<number, Cause.UnknownError>
    >()
  })
  it("S12 explicit direct UnknownError remains valid", () => {
    expect(Effect.try<number, Cause.UnknownError>(() => 1)).type.toBe<Effect.Effect<number, Cause.UnknownError>>()
  })
  it("S13 generic direct wrapper remains valid", () => {
    function wrap<A>(f: () => A): Effect.Effect<A, Cause.UnknownError> {
      return Effect.try(f)
    }
    expect(wrap(() => "value")).type.toBe<Effect.Effect<string, Cause.UnknownError>>()
  })
  it("S14 generic mapped wrapper remains valid", () => {
    function wrap<A, E>(options: SyncOptions<A, E>): Effect.Effect<A, E> {
      return Effect.try(options)
    }
    expect(wrap({ try: () => "value", catch: () => new LoadError() })).type.toBe<Effect.Effect<string, LoadError>>()
  })
  it("S15 union input includes direct error", () => {
    expect(Effect.try(syncUnion)).type.toBe<Effect.Effect<number, LoadError | Cause.UnknownError>>()
  })
  it("S16 generic union wrapper remains valid", () => {
    function wrap<A, E>(options: (() => A) | SyncOptions<A, E>): Effect.Effect<A, E | Cause.UnknownError> {
      return Effect.try(options)
    }
    expect(wrap(syncUnion)).type.toBe<Effect.Effect<number, LoadError | Cause.UnknownError>>()
  })
  it("S17 explicit union wrapper remains valid", () => {
    function wrap<A, E>(options: (() => A) | SyncOptions<A, E>): Effect.Effect<A, E | Cause.UnknownError> {
      return Effect.try<A, E>(options)
    }
    expect(wrap(syncUnion)).type.toBe<Effect.Effect<number, LoadError | Cause.UnknownError>>()
  })
  it("S18 catch input stays unknown", () => {
    Effect.try({
      try: () => 1,
      catch: (error) => {
        expect(error).type.toBe<unknown>()
        return new LoadError()
      }
    })
  })
  it("S19 never-returning mapper stays infallible", () => {
    expect(Effect.try({
      try: () => 1,
      catch: (error): never => {
        throw error
      }
    })).type.toBe<Effect.Effect<number>>()
  })
  it("S20 direct constructor remains assignable to generic wrapper", () => {
    const wrap: <A>(f: () => A) => Effect.Effect<A, Cause.UnknownError> = Effect.try
    expect(wrap(() => 1)).type.toBe<Effect.Effect<number, Cause.UnknownError>>()
  })
  it("S21 mapped constructor remains assignable to generic wrapper", () => {
    const wrap: <A, E>(options: SyncOptions<A, E>) => Effect.Effect<A, E> = Effect.try
    expect(wrap({ try: () => 1, catch: () => new LoadError() })).type.toBe<Effect.Effect<number, LoadError>>()
  })
  it("S22 compatible broad context remains valid", () => {
    const load: Effect.Effect<number, unknown> = Effect.try(() => 1)
    expect(load).type.toBe<Effect.Effect<number, unknown>>()
  })
})

describe("tryPromise direct error contracts", () => {
  it("P01 inferred direct uses UnknownError", () => {
    expect(Effect.tryPromise(() => Promise.resolve(1))).type.toBe<Effect.Effect<number, Cause.UnknownError>>()
  })
  it("P02 one explicit generic preserves direct", () => {
    expect(Effect.tryPromise<number>(() => Promise.resolve(1))).type.toBe<Effect.Effect<number, Cause.UnknownError>>()
  })
  it("P03 context cannot invent a domain error", () => {
    function load(): Effect.Effect<number, LoadError> {
      // @ts-expect-error Type 'Effect<number, UnknownError, never>' is not assignable to type 'Effect<number, LoadError, never>'
      return Effect.tryPromise(() => Promise.reject<number>(new Error("source")))
    }
    expect(load).type.toBe<() => Effect.Effect<number, LoadError>>()
  })
  it("P04 context cannot erase the error channel", () => {
    function load(): Effect.Effect<number> {
      // @ts-expect-error Type 'Effect<number, UnknownError, never>' is not assignable to type 'Effect<number, never, never>'
      return Effect.tryPromise(() => Promise.resolve(1))
    }
    expect(load).type.toBe<() => Effect.Effect<number>>()
  })
  it("P05 argument context cannot invent a domain error", () => {
    // @ts-expect-error Argument of type 'Effect<number, UnknownError, never>' is not assignable to parameter of type 'Effect<number, LoadError, never>'
    consumeDomain(Effect.tryPromise(() => Promise.resolve(1)))
  })
  it("P06 explicit error generic cannot hide UnknownError", () => {
    expect(Effect.tryPromise<number, LoadError>(() => Promise.resolve(1))).type.not.toBeAssignableTo<
      Effect.Effect<number, LoadError>
    >()
  })
  it("P07 explicit never cannot hide UnknownError", () => {
    expect(Effect.tryPromise<number, never>(() => Promise.resolve(1))).type.not.toBeAssignableTo<
      Effect.Effect<number>
    >()
  })
  it("P08 inferred mapped options preserve exact error", () => {
    expect(Effect.tryPromise({ try: () => Promise.resolve(1), catch: () => new LoadError() })).type.toBe<
      Effect.Effect<number, LoadError>
    >()
  })
  it("P09 mapped return context remains valid", () => {
    function load(): Effect.Effect<number, LoadError> {
      return Effect.tryPromise({ try: () => Promise.resolve(1), catch: () => new LoadError() })
    }
    expect(load()).type.toBe<Effect.Effect<number, LoadError>>()
  })
  it("P10 explicit mapped generics remain valid", () => {
    expect(Effect.tryPromise<number, LoadError>({ try: () => Promise.resolve(1), catch: () => new LoadError() })).type
      .toBe<
        Effect.Effect<number, LoadError>
      >()
  })
  it("P11 partial mapped generics retain UnknownError default", () => {
    expect(
      Effect.tryPromise<number>({ try: () => Promise.resolve(1), catch: (error) => new Cause.UnknownError(error) })
    )
      .type.toBe<Effect.Effect<number, Cause.UnknownError>>()
  })
  it("P12 explicit direct UnknownError remains valid", () => {
    expect(Effect.tryPromise<number, Cause.UnknownError>(() => Promise.resolve(1))).type.toBe<
      Effect.Effect<number, Cause.UnknownError>
    >()
  })
  it("P13 generic direct wrapper remains valid", () => {
    function wrap<A>(f: (signal: AbortSignal) => PromiseLike<A>): Effect.Effect<A, Cause.UnknownError> {
      return Effect.tryPromise(f)
    }
    expect(wrap(() => Promise.resolve("value"))).type.toBe<Effect.Effect<string, Cause.UnknownError>>()
  })
  it("P14 generic mapped wrapper remains valid", () => {
    function wrap<A, E>(options: AsyncOptions<A, E>): Effect.Effect<A, E> {
      return Effect.tryPromise(options)
    }
    expect(wrap({ try: () => Promise.resolve("value"), catch: () => new LoadError() })).type.toBe<
      Effect.Effect<string, LoadError>
    >()
  })
  it("P15 union input includes direct error", () => {
    expect(Effect.tryPromise(asyncUnion)).type.toBe<Effect.Effect<number, LoadError | Cause.UnknownError>>()
  })
  it("P16 generic union wrapper remains valid", () => {
    function wrap<A, E>(
      options: ((signal: AbortSignal) => PromiseLike<A>) | AsyncOptions<A, E>
    ): Effect.Effect<A, E | Cause.UnknownError> {
      return Effect.tryPromise(options)
    }
    expect(wrap(asyncUnion)).type.toBe<Effect.Effect<number, LoadError | Cause.UnknownError>>()
  })
  it("P17 explicit union wrapper remains valid", () => {
    function wrap<A, E>(
      options: ((signal: AbortSignal) => PromiseLike<A>) | AsyncOptions<A, E>
    ): Effect.Effect<A, E | Cause.UnknownError> {
      return Effect.tryPromise<A, E>(options)
    }
    expect(wrap(asyncUnion)).type.toBe<Effect.Effect<number, LoadError | Cause.UnknownError>>()
  })
  it("P18 catch input stays unknown", () => {
    Effect.tryPromise({
      try: () => Promise.resolve(1),
      catch: (error) => {
        expect(error).type.toBe<unknown>()
        return new LoadError()
      }
    })
  })
  it("P19 never-returning mapper stays infallible", () => {
    expect(Effect.tryPromise({
      try: () => Promise.resolve(1),
      catch: (error): never => {
        throw error
      }
    })).type.toBe<
      Effect.Effect<number>
    >()
  })
  it("P20 direct constructor remains assignable to generic wrapper", () => {
    const wrap: <A>(f: (signal: AbortSignal) => PromiseLike<A>) => Effect.Effect<A, Cause.UnknownError> =
      Effect.tryPromise
    expect(wrap(() => Promise.resolve(1))).type.toBe<Effect.Effect<number, Cause.UnknownError>>()
  })
  it("P21 mapped constructor remains assignable to generic wrapper", () => {
    const wrap: <A, E>(options: AsyncOptions<A, E>) => Effect.Effect<A, E> = Effect.tryPromise
    expect(wrap({ try: () => Promise.resolve(1), catch: () => new LoadError() })).type.toBe<
      Effect.Effect<number, LoadError>
    >()
  })
  it("P22 compatible broad context remains valid", () => {
    const load: Effect.Effect<number, unknown> = Effect.tryPromise(() => Promise.resolve(1))
    expect(load).type.toBe<Effect.Effect<number, unknown>>()
  })
  it("P23 direct signal stays AbortSignal", () => {
    Effect.tryPromise((signal) => {
      expect(signal).type.toBe<AbortSignal>()
      return Promise.resolve(1)
    })
  })
  it("P24 mapped signal stays AbortSignal", () => {
    Effect.tryPromise({
      try: (signal) => {
        expect(signal).type.toBe<AbortSignal>()
        return Promise.resolve(1)
      },
      catch: () => new LoadError()
    })
  })
  it("P25 non-Promise PromiseLike remains supported", () => {
    function wrap<A>(value: PromiseLike<A>) {
      return Effect.tryPromise(() => value)
    }
    expect(wrap(Promise.resolve(1))).type.toBe<Effect.Effect<number, Cause.UnknownError>>()
  })
})
