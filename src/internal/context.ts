import type * as C from "../Context.js"
import * as Equal from "../Equal.js"
import { dual } from "../Function.js"
import { globalValue } from "../GlobalValue.js"
import * as Hash from "../Hash.js"
import { NodeInspectSymbol, toJSON, toString } from "../Inspectable.js"
import type * as O from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import { hasProperty } from "../Predicate.js"
import type * as STM from "../STM.js"
import { EffectPrototype, effectVariance } from "./effectable.js"
import * as option from "./option.js"

/** @internal */
export const TagTypeId: C.TagTypeId = Symbol.for("effect/Context/Tag") as C.TagTypeId

/** @internal */
const STMSymbolKey = "effect/STM"

/** @internal */
export const STMTypeId: STM.STMTypeId = Symbol.for(
  STMSymbolKey
) as STM.STMTypeId

/** @internal */
export const TagProto: C.Tag<unknown, unknown> = {
  ...EffectPrototype,
  _tag: "Tag",
  _op: "Tag",
  [STMTypeId]: effectVariance,
  [TagTypeId]: {
    _S: (_: unknown) => _,
    _I: (_: unknown) => _
  },
  toString() {
    return toString(this.toJSON())
  },
  toJSON<I, A>(this: C.Tag<I, A>) {
    return {
      _id: "Tag",
      identifier: this.identifier,
      stack: this.stack
    }
  },
  [NodeInspectSymbol]() {
    return this.toJSON()
  },
  of<Service>(self: Service): Service {
    return self
  },
  context<Identifier, Service>(
    this: C.Tag<Identifier, Service>,
    self: Service
  ): C.Context<Identifier> {
    return make(this, self)
  }
}

const tagRegistry = globalValue("effect/Context/Tag/tagRegistry", () => new Map<any, C.Tag<any, any>>())

/** @internal */
export const makeTag = <Identifier, Service = Identifier>(identifier?: unknown): C.Tag<Identifier, Service> => {
  if (identifier && tagRegistry.has(identifier)) {
    return tagRegistry.get(identifier)!
  }
  const limit = Error.stackTraceLimit
  Error.stackTraceLimit = 2
  const creationError = new Error()
  Error.stackTraceLimit = limit
  const tag = Object.create(TagProto)
  Object.defineProperty(tag, "stack", {
    get() {
      return creationError.stack
    }
  })
  if (identifier) {
    tag.identifier = identifier
    tagRegistry.set(identifier, tag)
  }
  return tag
}

/** @internal */
export const TypeId: C.TypeId = Symbol.for("effect/Context") as C.TypeId

/** @internal */
export const ContextProto: Omit<C.Context<unknown>, "unsafeMap"> = {
  [TypeId]: {
    _S: (_: unknown) => _
  },
  [Equal.symbol]<A>(this: C.Context<A>, that: unknown): boolean {
    if (isContext(that)) {
      if (this.unsafeMap.size === that.unsafeMap.size) {
        for (const k of this.unsafeMap.keys()) {
          if (!that.unsafeMap.has(k) || !Equal.equals(this.unsafeMap.get(k), that.unsafeMap.get(k))) {
            return false
          }
        }
        return true
      }
    }
    return false
  },
  [Hash.symbol]<A>(this: C.Context<A>): number {
    return Hash.number(this.unsafeMap.size)
  },
  pipe<A>(this: C.Context<A>) {
    return pipeArguments(this, arguments)
  },
  toString() {
    return toString(this.toJSON())
  },
  toJSON<A>(this: C.Context<A>) {
    return {
      _id: "Context",
      services: Array.from(this.unsafeMap).map(toJSON)
    }
  },
  [NodeInspectSymbol]() {
    return (this as any).toJSON()
  }
}

/** @internal */
export const makeContext = <Services>(unsafeMap: Map<C.Tag<any, any>, any>): C.Context<Services> => {
  const context = Object.create(ContextProto)
  context.unsafeMap = unsafeMap
  return context
}

const serviceNotFoundError = (tag: C.Tag<any, any>) => {
  const error = new Error(`Service not found${tag.identifier ? `: ${String(tag.identifier)}` : ""}`)
  if (tag.stack) {
    const lines = tag.stack.split("\n")
    if (lines.length > 2) {
      const afterAt = lines[2].match(/at (.*)/)
      if (afterAt) {
        error.message = error.message + ` (defined at ${afterAt[1]})`
      }
    }
  }
  if (error.stack) {
    const lines = error.stack.split("\n")
    lines.splice(1, 3)
    error.stack = lines.join("\n")
  }
  return error
}

/** @internal */
export const isContext = (u: unknown): u is C.Context<never> => hasProperty(u, TypeId)

/** @internal */
export const isTag = (u: unknown): u is C.Tag<any, any> => hasProperty(u, TagTypeId)

const _empty = makeContext(new Map())

/** @internal */
export const empty = (): C.Context<never> => _empty

/** @internal */
export const make = <T extends C.Tag<any, any>>(
  tag: T,
  service: C.Tag.Service<T>
): C.Context<C.Tag.Identifier<T>> => makeContext(new Map([[tag, service]]))

/** @internal */
export const add = dual<
  <T extends C.Tag<any, any>>(
    tag: T,
    service: C.Tag.Service<T>
  ) => <Services>(
    self: C.Context<Services>
  ) => C.Context<Services | C.Tag.Identifier<T>>,
  <Services, T extends C.Tag<any, any>>(
    self: C.Context<Services>,
    tag: T,
    service: C.Tag.Service<T>
  ) => C.Context<Services | C.Tag.Identifier<T>>
>(3, (self, tag, service) => {
  const map = new Map(self.unsafeMap)
  map.set(tag as C.Tag<unknown, unknown>, service)
  return makeContext(map)
})

/** @internal */
export const unsafeGet = dual<
  <S, I>(tag: C.Tag<I, S>) => <Services>(self: C.Context<Services>) => S,
  <Services, S, I>(self: C.Context<Services>, tag: C.Tag<I, S>) => S
>(2, (self, tag) => {
  if (!self.unsafeMap.has(tag)) {
    throw serviceNotFoundError(tag as any)
  }
  return self.unsafeMap.get(tag)! as any
})

/** @internal */
export const get: {
  <Services, T extends C.ValidTagsById<Services>>(tag: T): (self: C.Context<Services>) => C.Tag.Service<T>
  <Services, T extends C.ValidTagsById<Services>>(self: C.Context<Services>, tag: T): C.Tag.Service<T>
} = unsafeGet

/** @internal */
export const getOption = dual<
  <S, I>(tag: C.Tag<I, S>) => <Services>(self: C.Context<Services>) => O.Option<S>,
  <Services, S, I>(self: C.Context<Services>, tag: C.Tag<I, S>) => O.Option<S>
>(2, (self, tag) => {
  if (!self.unsafeMap.has(tag)) {
    return option.none
  }
  return option.some(self.unsafeMap.get(tag)! as any)
})

/** @internal */
export const merge = dual<
  <R1>(that: C.Context<R1>) => <Services>(self: C.Context<Services>) => C.Context<Services | R1>,
  <Services, R1>(self: C.Context<Services>, that: C.Context<R1>) => C.Context<Services | R1>
>(2, (self, that) => {
  const map = new Map(self.unsafeMap)
  for (const [tag, s] of that.unsafeMap) {
    map.set(tag, s)
  }
  return makeContext(map)
})

/** @internal */
export const pick =
  <Services, S extends Array<C.ValidTagsById<Services>>>(...tags: S) =>
  (self: C.Context<Services>): C.Context<
    { [k in keyof S]: C.Tag.Identifier<S[k]> }[number]
  > => {
    const tagSet = new Set<unknown>(tags)
    const newEnv = new Map()
    for (const [tag, s] of self.unsafeMap.entries()) {
      if (tagSet.has(tag)) {
        newEnv.set(tag, s)
      }
    }
    return makeContext<{ [k in keyof S]: C.Tag.Identifier<S[k]> }[number]>(newEnv)
  }

/** @internal */
export const omit =
  <Services, S extends Array<C.ValidTagsById<Services>>>(...tags: S) =>
  (self: C.Context<Services>): C.Context<
    Exclude<Services, { [k in keyof S]: C.Tag.Identifier<S[k]> }[keyof S]>
  > => {
    const newEnv = new Map(self.unsafeMap)
    for (const tag of tags) {
      newEnv.delete(tag)
    }
    return makeContext(newEnv)
  }
