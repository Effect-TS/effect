import { Chunk } from "../../exports/Chunk.js"
import type { Differ } from "../../exports/Differ.js"
import { Equal } from "../../exports/Equal.js"
import { dual } from "../../exports/Function.js"
import { HashMap } from "../../exports/HashMap.js"
import { Structural } from "../data.js"

/** @internal */
export const HashMapPatchTypeId: Differ.HashMap.TypeId = Symbol.for(
  "effect/DifferHashMapPatch"
) as Differ.HashMap.TypeId

function variance<A, B>(a: A): B {
  return a as unknown as B
}

/** @internal */
const PatchProto = {
  ...Structural.prototype,
  [HashMapPatchTypeId]: {
    _Value: variance,
    _Key: variance,
    _Patch: variance
  }
}

interface Empty<Key, Value, Patch> extends Differ.HashMap.Patch<Key, Value, Patch> {
  readonly _tag: "Empty"
}

const EmptyProto = Object.assign(Object.create(PatchProto), {
  _tag: "Empty"
})

const _empty = Object.create(EmptyProto)

/** @internal */
export const empty = <Key, Value, Patch>(): Differ.HashMap.Patch<Key, Value, Patch> => _empty

interface AndThen<Key, Value, Patch> extends Differ.HashMap.Patch<Key, Value, Patch> {
  readonly _tag: "AndThen"
  readonly first: Differ.HashMap.Patch<Key, Value, Patch>
  readonly second: Differ.HashMap.Patch<Key, Value, Patch>
}

const AndThenProto = Object.assign(Object.create(PatchProto), {
  _tag: "AndThen"
})

const makeAndThen = <Key, Value, Patch>(
  first: Differ.HashMap.Patch<Key, Value, Patch>,
  second: Differ.HashMap.Patch<Key, Value, Patch>
): Differ.HashMap.Patch<Key, Value, Patch> => {
  const o = Object.create(AndThenProto)
  o.first = first
  o.second = second
  return o
}

interface Add<Key, Value, Patch> extends Differ.HashMap.Patch<Key, Value, Patch> {
  readonly _tag: "Add"
  readonly key: Key
  readonly value: Value
}

const AddProto = Object.assign(Object.create(PatchProto), {
  _tag: "Add"
})

const makeAdd = <Key, Value, Patch>(key: Key, value: Value): Differ.HashMap.Patch<Key, Value, Patch> => {
  const o = Object.create(AddProto)
  o.key = key
  o.value = value
  return o
}

interface Remove<Key, Value, Patch> extends Differ.HashMap.Patch<Key, Value, Patch> {
  readonly _tag: "Remove"
  readonly key: Key
}

const RemoveProto = Object.assign(Object.create(PatchProto), {
  _tag: "Remove"
})

const makeRemove = <Key, Value, Patch>(key: Key): Differ.HashMap.Patch<Key, Value, Patch> => {
  const o = Object.create(RemoveProto)
  o.key = key
  return o
}

interface Update<Key, Value, Patch> extends Differ.HashMap.Patch<Key, Value, Patch> {
  readonly _tag: "Update"
  readonly key: Key
  readonly patch: Patch
}

const UpdateProto = Object.assign(Object.create(PatchProto), {
  _tag: "Update"
})

const makeUpdate = <Key, Value, Patch>(key: Key, patch: Patch): Differ.HashMap.Patch<Key, Value, Patch> => {
  const o = Object.create(UpdateProto)
  o.key = key
  o.patch = patch
  return o
}

type Instruction =
  | Add<any, any, any>
  | Remove<any, any, any>
  | Update<any, any, any>
  | Empty<any, any, any>
  | AndThen<any, any, any>

/** @internal */
export const diff = <Key, Value, Patch>(
  options: {
    readonly oldValue: HashMap<Key, Value>
    readonly newValue: HashMap<Key, Value>
    readonly differ: Differ<Value, Patch>
  }
): Differ.HashMap.Patch<Key, Value, Patch> => {
  const [removed, patch] = HashMap.reduce(
    [options.oldValue, empty<Key, Value, Patch>()] as const,
    ([map, patch], newValue: Value, key: Key) => {
      const option = HashMap.get(key)(map)
      switch (option._tag) {
        case "Some": {
          const valuePatch = options.differ.diff(option.value, newValue)
          if (Equal.equals(valuePatch, options.differ.empty)) {
            return [HashMap.remove(key)(map), patch] as const
          }
          return [
            HashMap.remove(key)(map),
            combine<Key, Value, Patch>(makeUpdate(key, valuePatch))(patch)
          ] as const
        }
        case "None": {
          return [map, combine<Key, Value, Patch>(makeAdd(key, newValue))(patch)] as const
        }
      }
    }
  )(options.newValue)
  return HashMap.reduce(
    patch,
    (patch, _, key: Key) => combine<Key, Value, Patch>(makeRemove(key))(patch)
  )(removed)
}

/** @internal */
export const combine = dual<
  <Key, Value, Patch>(
    that: Differ.HashMap.Patch<Key, Value, Patch>
  ) => (
    self: Differ.HashMap.Patch<Key, Value, Patch>
  ) => Differ.HashMap.Patch<Key, Value, Patch>,
  <Key, Value, Patch>(
    self: Differ.HashMap.Patch<Key, Value, Patch>,
    that: Differ.HashMap.Patch<Key, Value, Patch>
  ) => Differ.HashMap.Patch<Key, Value, Patch>
>(2, (self, that) => makeAndThen(self, that))

/** @internal */
export const patch = dual<
  <Key, Value, Patch>(
    oldValue: HashMap<Key, Value>,
    differ: Differ<Value, Patch>
  ) => (
    self: Differ.HashMap.Patch<Key, Value, Patch>
  ) => HashMap<Key, Value>,
  <Key, Value, Patch>(
    self: Differ.HashMap.Patch<Key, Value, Patch>,
    oldValue: HashMap<Key, Value>,
    differ: Differ<Value, Patch>
  ) => HashMap<Key, Value>
>(3, <Key, Value, Patch>(
  self: Differ.HashMap.Patch<Key, Value, Patch>,
  oldValue: HashMap<Key, Value>,
  differ: Differ<Value, Patch>
) => {
  let map = oldValue
  let patches: Chunk<Differ.HashMap.Patch<Key, Value, Patch>> = Chunk.of(self)
  while (Chunk.isNonEmpty(patches)) {
    const head: Instruction = Chunk.headNonEmpty(patches) as Instruction
    const tail = Chunk.tailNonEmpty(patches)
    switch (head._tag) {
      case "Empty": {
        patches = tail
        break
      }
      case "AndThen": {
        patches = Chunk.prepend(head.first)(Chunk.prepend(head.second)(tail))
        break
      }
      case "Add": {
        map = HashMap.set(head.key, head.value)(map)
        patches = tail
        break
      }
      case "Remove": {
        map = HashMap.remove(head.key)(map)
        patches = tail
        break
      }
      case "Update": {
        const option = HashMap.get(head.key)(map)
        if (option._tag === "Some") {
          map = HashMap.set(head.key, differ.patch(head.patch, option.value))(map)
        }
        patches = tail
        break
      }
    }
  }
  return map
})
