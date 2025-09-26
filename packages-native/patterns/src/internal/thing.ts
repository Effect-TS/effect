/**
 * Internal implementation details for the `Thing` model.
 *
 * @since 0.0.0
 * @internal
 */
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"

/** @internal */
export const TypeId: unique symbol = Symbol.for("@effect-native/patterns/Thing") as TypeId

/** @internal */
export type TypeId = typeof TypeId

/** @internal */
export interface Thing<A> extends Pipeable, Equal.Equal {
  readonly [TypeId]: TypeId
  readonly id: string
  readonly label: string
  readonly value: A
  readonly tags: ReadonlyArray<string>
}

/** @internal */
export interface ThingInput<A> {
  readonly id: string
  readonly label: string
  readonly value: A
  readonly tags?: Iterable<string>
}

const normalizeTags = (tags: Iterable<string> = []): ReadonlyArray<string> => {
  const unique = new Set<string>()
  for (const tag of tags) {
    unique.add(tag)
  }
  return Array.from(unique).sort()
}

const equalsThing = <A>(self: Thing<A>, that: Thing<unknown>): boolean =>
  self.id === that.id &&
  self.label === that.label &&
  Equal.equals(self.value, that.value) &&
  self.tags.length === that.tags.length &&
  self.tags.every((tag, index) => tag === that.tags[index])

const hashThing = (self: Thing<unknown>): number => {
  let hash = Hash.hash(self.id)
  hash = Hash.combine(Hash.hash(self.label))(hash)
  hash = Hash.combine(Hash.hash(self.value))(hash)
  hash = Hash.combine(Hash.array(self.tags))(hash)
  return Hash.cached(self, hash)
}

const Proto = {
  [TypeId]: TypeId,
  pipe<A>(this: Thing<A>) {
    return pipeArguments(this, arguments)
  },
  [Equal.symbol]<A>(this: Thing<A>, that: unknown): boolean {
    return isThing(that) && equalsThing(this, that)
  },
  [Hash.symbol]<A>(this: Thing<A>): number {
    return hashThing(this)
  }
}

/** @internal */
export const make = <A>(input: ThingInput<A>): Thing<A> => {
  const tags = normalizeTags(input.tags)
  const instance: Thing<A> = Object.assign(Object.create(Proto), {
    id: input.id,
    label: input.label,
    value: input.value,
    tags
  })
  return instance
}

/** @internal */
export const isThing = (u: unknown): u is Thing<unknown> => typeof u === "object" && u !== null && TypeId in u

/** @internal */
export const mapValue = <A, B>(self: Thing<A>, f: (value: A) => B): Thing<B> =>
  make({
    id: self.id,
    label: self.label,
    value: f(self.value),
    tags: self.tags
  })

/** @internal */
export const addTag = <A>(self: Thing<A>, tag: string): Thing<A> => {
  if (self.tags.includes(tag)) {
    return self
  }
  return make({
    id: self.id,
    label: self.label,
    value: self.value,
    tags: [...self.tags, tag]
  })
}
