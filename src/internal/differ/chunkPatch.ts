import { Chunk } from "../../Chunk.js"
import type { Differ } from "../../Differ.js"
import { Equal } from "../../Equal.js"
import { dual, pipe } from "../../Function.js"
import { Data } from "../data.js"

/** @internal */
export const ChunkPatchTypeId: Differ.Chunk.TypeId = Symbol.for(
  "effect/DifferChunkPatch"
) as Differ.Chunk.TypeId

function variance<A, B>(a: A): B {
  return a as unknown as B
}

const PatchProto = {
  ...Data.Structural.prototype,
  [ChunkPatchTypeId]: {
    _Value: variance,
    _Patch: variance
  }
}

interface Empty<Value, Patch> extends Differ.Chunk.Patch<Value, Patch> {
  readonly _tag: "Empty"
}

const EmptyProto = Object.assign(Object.create(PatchProto), {
  _tag: "Empty"
})

const _empty = Object.create(EmptyProto)

/**
 * @internal
 */
export const empty = <Value, Patch>(): Differ.Chunk.Patch<Value, Patch> => _empty

interface AndThen<Value, Patch> extends Differ.Chunk.Patch<Value, Patch> {
  readonly _tag: "AndThen"
  readonly first: Differ.Chunk.Patch<Value, Patch>
  readonly second: Differ.Chunk.Patch<Value, Patch>
}

const AndThenProto = Object.assign(Object.create(PatchProto), {
  _tag: "AndThen"
})

const makeAndThen = <Value, Patch>(
  first: Differ.Chunk.Patch<Value, Patch>,
  second: Differ.Chunk.Patch<Value, Patch>
): Differ.Chunk.Patch<Value, Patch> => {
  const o = Object.create(AndThenProto)
  o.first = first
  o.second = second
  return o
}

interface Append<Value, Patch> extends Differ.Chunk.Patch<Value, Patch> {
  readonly _tag: "Append"
  readonly values: Chunk<Value>
}

const AppendProto = Object.assign(Object.create(PatchProto), {
  _tag: "Append"
})

const makeAppend = <Value, Patch>(values: Chunk<Value>): Differ.Chunk.Patch<Value, Patch> => {
  const o = Object.create(AppendProto)
  o.values = values
  return o
}

interface Slice<Value, Patch> extends Differ.Chunk.Patch<Value, Patch> {
  readonly _tag: "Slice"
  readonly from: number
  readonly until: number
}

const SliceProto = Object.assign(Object.create(PatchProto), {
  _tag: "Slice"
})

const makeSlice = <Value, Patch>(from: number, until: number): Differ.Chunk.Patch<Value, Patch> => {
  const o = Object.create(SliceProto)
  o.from = from
  o.until = until
  return o
}

interface Update<Value, Patch> extends Differ.Chunk.Patch<Value, Patch> {
  readonly _tag: "Update"
  readonly index: number
  readonly patch: Patch
}

const UpdateProto = Object.assign(Object.create(PatchProto), {
  _tag: "Update"
})

const makeUpdate = <Value, Patch>(index: number, patch: Patch): Differ.Chunk.Patch<Value, Patch> => {
  const o = Object.create(UpdateProto)
  o.index = index
  o.patch = patch
  return o
}

type Instruction =
  | Empty<any, any>
  | AndThen<any, any>
  | Append<any, any>
  | Slice<any, any>
  | Update<any, any>

/** @internal */
export const diff = <Value, Patch>(
  options: {
    readonly oldValue: Chunk<Value>
    readonly newValue: Chunk<Value>
    readonly differ: Differ<Value, Patch>
  }
): Differ.Chunk.Patch<Value, Patch> => {
  let i = 0
  let patch = empty<Value, Patch>()
  while (i < options.oldValue.length && i < options.newValue.length) {
    const oldElement = Chunk.unsafeGet(i)(options.oldValue)
    const newElement = Chunk.unsafeGet(i)(options.newValue)
    const valuePatch = options.differ.diff(oldElement, newElement)
    if (!Equal.equals(valuePatch, options.differ.empty)) {
      patch = pipe(patch, combine(makeUpdate(i, valuePatch)))
    }
    i = i + 1
  }
  if (i < options.oldValue.length) {
    patch = pipe(patch, combine(makeSlice(0, i)))
  }
  if (i < options.newValue.length) {
    patch = pipe(patch, combine(makeAppend(Chunk.drop(i)(options.newValue))))
  }
  return patch
}

/** @internal */
export const combine = dual<
  <Value, Patch>(
    that: Differ.Chunk.Patch<Value, Patch>
  ) => (
    self: Differ.Chunk.Patch<Value, Patch>
  ) => Differ.Chunk.Patch<Value, Patch>,
  <Value, Patch>(
    self: Differ.Chunk.Patch<Value, Patch>,
    that: Differ.Chunk.Patch<Value, Patch>
  ) => Differ.Chunk.Patch<Value, Patch>
>(2, (self, that) => makeAndThen(self, that))

/** @internal */
export const patch = dual<
  <Value, Patch>(
    oldValue: Chunk<Value>,
    differ: Differ<Value, Patch>
  ) => (self: Differ.Chunk.Patch<Value, Patch>) => Chunk<Value>,
  <Value, Patch>(
    self: Differ.Chunk.Patch<Value, Patch>,
    oldValue: Chunk<Value>,
    differ: Differ<Value, Patch>
  ) => Chunk<Value>
>(3, <Value, Patch>(
  self: Differ.Chunk.Patch<Value, Patch>,
  oldValue: Chunk<Value>,
  differ: Differ<Value, Patch>
) => {
  let chunk = oldValue
  let patches: Chunk<Differ.Chunk.Patch<Value, Patch>> = Chunk.of(self)
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
      case "Append": {
        chunk = Chunk.appendAll(head.values)(chunk)
        patches = tail
        break
      }
      case "Slice": {
        const array = Chunk.toReadonlyArray(chunk)
        chunk = Chunk.unsafeFromArray(array.slice(head.from, head.until))
        patches = tail
        break
      }
      case "Update": {
        const array = Chunk.toReadonlyArray(chunk) as Array<Value>
        array[head.index] = differ.patch(head.patch, array[head.index]!)
        chunk = Chunk.unsafeFromArray(array)
        patches = tail
        break
      }
    }
  }
  return chunk
})
