import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import * as it from "effect/test/utils/extend"
import { describe, expect } from "vitest"

class Prefix extends Effect.Service<Prefix>()("Prefix", {
  sync: () => ({ prefix: "PRE" })
}) {}

class Postfix extends Effect.Service<Postfix>()("Postfix", {
  sync: () => ({ postfix: "POST" })
}) {}

const messages: Array<string> = []

class Logger extends Effect.Service<Logger>()("Logger", {
  accessors: true,
  effect: Effect.gen(function*() {
    const { prefix } = yield* Prefix
    const { postfix } = yield* Postfix
    return {
      info: (message: string) =>
        Effect.sync(() => {
          messages.push(`[${prefix}][${message}][${postfix}]`)
        })
    }
  }),
  dependencies: [Prefix.Default, Postfix.Default]
}) {
  static Test = Layer.succeed(this, Logger.make({ info: () => Effect.void }))
  static TestWithNew = Layer.succeed(this, new Logger({ info: () => Effect.void }))
}

describe("Effect", () => {
  it.effect("Service correctly wires dependencies", () =>
    Effect.gen(function*() {
      messages.splice(0)
      const { _tag } = yield* Logger
      expect(_tag).toEqual("Logger")
      yield* Logger.info("Ok")
      expect(messages).toEqual(["[PRE][Ok][POST]"])
      const { prefix } = yield* Prefix
      expect(prefix).toEqual("PRE")
      const { postfix } = yield* Postfix
      expect(postfix).toEqual("POST")
      expect(yield* Postfix.use((_) => _._tag)).toEqual("Postfix")
    }).pipe(
      Effect.provide([Logger.Default, Prefix.Default, Postfix.Default])
    ))

  it.effect("Test instance works", () =>
    Effect.gen(function*() {
      messages.splice(0)
      const { _tag } = yield* Logger
      expect(_tag).toEqual("Logger")
      yield* Logger.info("Ok")
      expect(messages).toEqual([])
    }).pipe(
      Effect.provide([Logger.Test])
    ))

  it.effect("Test with new instance works", () =>
    Effect.gen(function*() {
      messages.splice(0)
      const { _tag } = yield* Logger
      expect(_tag).toEqual("Logger")
      yield* Logger.info("Ok")
      expect(messages).toEqual([])
    }).pipe(
      Effect.provide([Logger.TestWithNew])
    ))

  it.effect("Service instances are real", () =>
    Effect.gen(function*() {
      const prefix = yield* Prefix
      const postfix = yield* Postfix
      expect(prefix).toBeInstanceOf(Prefix)
      expect(prefix).not.toBeInstanceOf(Postfix)
      expect(postfix).toBeInstanceOf(Postfix)
      expect(postfix).not.toBeInstanceOf(Prefix)
    }).pipe(
      Effect.provide([Prefix.Default, Postfix.Default])
    ))

  it.effect("Moo", () =>
    Effect.gen(function*() {
      class TimeLive {
        #now: Date | undefined
        constructor(now?: Date) {
          this.#now = now
        }

        get now() {
          return this.#now ||= new Date()
        } // others omitted
      }
      abstract class Time extends Effect.Service<Time>()("Time", {
        effect: Effect.sync(() => new TimeLive()),
        accessors: true
      }) {
      }

      expect(yield* Time.use((_) => _.now).pipe(Effect.provide(Time.Default))).toBeInstanceOf(Date)
    }))

  it.effect("Moo2", () =>
    Effect.gen(function*() {
      class TimeLive {
        #now: Date | undefined
        constructor(now?: Date) {
          this.#now = now
        }

        get now() {
          return this.#now ||= new Date()
        } // others omitted
      }
      abstract class Time extends TagMakeId("Time", Effect.sync(() => new TimeLive()))<Time>() {}

      expect(yield* Time.use((_) => _.now).pipe(Effect.provide(Time.toLayer()))).toBeInstanceOf(Date)
    }))
})

export * from "effect/Context"

export const ServiceTag = Symbol()
export type ServiceTag = typeof ServiceTag

export abstract class PhantomTypeParameter<Identifier extends keyof any, InstantiatedType> {
  protected abstract readonly [ServiceTag]: {
    readonly [NameP in Identifier]: (_: InstantiatedType) => InstantiatedType
  }
}

export type ServiceShape<T extends Context.TagClassShape<any, any>> = Omit<
  T,
  keyof Context.TagClassShape<any, any>
>

/**
 * @tsplus type ServiceTagged
 */
export abstract class ServiceTagged<ServiceKey> extends PhantomTypeParameter<string, ServiceKey> {}

/**
 * @tsplus static ServiceTagged make
 */
export function makeService<T extends ServiceTagged<any>>(_: Omit<T, ServiceTag>) {
  return _ as T
}

let i = 0
const randomId = () => "unknown-service-" + i++

export function assignTag<Id, Service = Id>(key?: string, creationError?: Error) {
  return <S extends object>(cls: S): S & Context.Tag<Id, Service> => {
    const tag = Context.GenericTag<Id, Service>(key ?? randomId())
    let fields = tag
    if (Reflect.ownKeys(cls).includes("key")) {
      const { key, ...rest } = tag
      fields = rest as any
    }
    const t = Object.assign(cls, Object.getPrototypeOf(tag), fields)
    if (!creationError) {
      const limit = Error.stackTraceLimit
      Error.stackTraceLimit = 2
      creationError = new Error()
      Error.stackTraceLimit = limit
    }
    // the stack is used to get the location of the tag definition, if a service is not found in the registry
    Object.defineProperty(t, "stack", {
      get() {
        return creationError!.stack
      }
    })
    return t
  }
}

export type ServiceAcessorShape<Self, Type> =
  & (Type extends Record<PropertyKey, any> ? {
      [
        k in keyof Type as Type[k] extends ((...args: [...infer Args]) => infer Ret)
          ? ((...args: Readonly<Args>) => Ret) extends Type[k] ? k : never
          : k
      ]: Type[k] extends (...args: [...infer Args]) => Effect.Effect<infer A, infer E, infer R>
        ? (...args: Readonly<Args>) => Effect.Effect<A, E, Self | R>
        : Type[k] extends (...args: [...infer Args]) => infer A ?
          (...args: Readonly<Args>) => Effect.Effect<A, never, Self>
        : Type[k] extends Effect.Effect<infer A, infer E, infer R> ? Effect.Effect<A, E, Self | R>
        : Effect.Effect<Type[k], never, Self>
    }
    : {})
  & {
    use: <X>(
      body: (_: Type) => X
    ) => X extends Effect.Effect<infer A, infer E, infer R> ? Effect.Effect<A, E, R | Self>
      : Effect.Effect<X, never, Self>
  }

export const proxify = <T extends object>(Tag: T) =>
<Self, Shape>():
  & T
  & ServiceAcessorShape<Self, Shape> =>
{
  const cache = new Map()
  const done = new Proxy(Tag, {
    get(_target: any, prop: any, _receiver) {
      if (prop === "use") {
        // @ts-expect-error abc
        return (body) => Effect.andThen(Tag, body)
      }
      if (prop in Tag) {
        return Tag[prop]
      }
      if (cache.has(prop)) {
        return cache.get(prop)
      }
      // @ts-expect-error abc
      const fn = (...args: Array<any>) => Effect.andThen(Tag, (s: any) => s[prop](...args))
      // @ts-expect-error abc
      const cn = Effect.andThen(Tag, (s) => s[prop])
      Object.assign(fn, cn)
      Object.setPrototypeOf(fn, Object.getPrototypeOf(cn))
      cache.set(prop, fn)
      return fn
    }
  })
  return done
}

export function TagId<const Key extends string>(key: Key) {
  return <Id, ServiceImpl>() => {
    const limit = Error.stackTraceLimit
    Error.stackTraceLimit = 2
    const creationError = new Error()
    Error.stackTraceLimit = limit
    const c:
      & (abstract new(
        service: ServiceImpl
      ) => Readonly<ServiceImpl> & Context.TagClassShape<Key, ServiceImpl>)
      & {
        toLayer: <E, R>(
          eff: Effect.Effect<Omit<Id, keyof Context.TagClassShape<any, any>>, E, R>
        ) => Layer.Layer<Id, E, R>
        toLayerScoped: <E, R>(
          eff: Effect.Effect<Omit<Id, keyof Context.TagClassShape<any, any>>, E, R>
        ) => Layer.Layer<Id, E, Exclude<R, Scope.Scope>>
        of: (service: Omit<Id, keyof Context.TagClassShape<any, any>>) => Id
      } = class {
        constructor(service: any) {
          // TODO: instead, wrap the service, and direct calls?
          Object.assign(this, service)
        }
        static of = (service: ServiceImpl) => service
        static toLayer = <E, R>(eff: Effect.Effect<ServiceImpl, E, R>) => {
          return Layer.effect(this as any, eff)
        }
        static toLayerScoped = <E, R>(eff: Effect.Effect<ServiceImpl, E, R>) => {
          return Layer.scoped(this as any, eff)
        }
      } as any

    return proxify(assignTag<Id, Id>(key, creationError)(c))<Id, ServiceImpl>()
  }
}

export const TagMakeId = <ServiceImpl, R, E, const Key extends string>(
  key: Key,
  make: Effect.Effect<ServiceImpl, E, R>
) =>
<Id>() => {
  const limit = Error.stackTraceLimit
  Error.stackTraceLimit = 2
  const creationError = new Error()
  Error.stackTraceLimit = limit
  const c:
    & (abstract new(
      service: ServiceImpl
    ) => Readonly<ServiceImpl> & Context.TagClassShape<Key, ServiceImpl>)
    & {
      toLayer: {
        (): Layer.Layer<Id, E, R>
        <E, R>(eff: Effect.Effect<Omit<Id, keyof Context.TagClassShape<any, any>>, E, R>): Layer.Layer<Id, E, R>
      }
      toLayerScoped: {
        (): Layer.Layer<Id, E, Exclude<R, Scope.Scope>>
        <E, R>(eff: Effect.Effect<Context.TagClassShape<any, any>, E, R>): Layer.Layer<Id, E, Exclude<R, Scope.Scope>>
      }
      of: (service: Context.TagClassShape<any, any>) => Id
      make: Effect.Effect<Id, E, R>
    } = class {
      constructor(service: any) {
        // TODO: instead, wrap the service, and direct calls?
        Object.assign(this, service)
      }

      static of = (service: ServiceImpl) => service
      static make = make
      // works around an issue where defining layer on the class messes up and causes the Tag to infer to `any, any` :/
      static toLayer = (arg?: any) => {
        return Layer.effect(this as any, arg ?? this.make)
      }

      static toLayerScoped = (arg?: any) => {
        return Layer.scoped(this as any, arg ?? this.make)
      }
    } as any

  return proxify(assignTag<Id, Id>(key, creationError)(c))<Id, ServiceImpl>()
}
