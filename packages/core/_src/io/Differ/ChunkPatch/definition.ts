export const ChunkPatchSym = Symbol.for("@effect/core/io/Differ.ChunkPatch")
export type ChunkPatchSym = typeof ChunkPatchSym

export const ChunkPatchValueSym = Symbol.for("@effect/core/io/Differ.ChunkPatch.Value")
export type ChunkPatchValueSym = typeof ChunkPatchValueSym

export const ChunkPatchPatchSym = Symbol.for("@effect/core/io/Differ.ChunkPatch.Patch")
export type ChunkPatchPatchSym = typeof ChunkPatchPatchSym

/**
 * A patch which describes updates to a chunk of values.
 *
 * @tsplus type effect/core/io/Differ.ChunkPatch
 */
export interface ChunkPatch<Value, Patch> {
  readonly [ChunkPatchSym]: ChunkPatchSym
  readonly [ChunkPatchValueSym]: () => Value
  readonly [ChunkPatchPatchSym]: () => Patch
}

/**
 * @tsplus type effect/core/io/Differ.ChunkPatch.Ops
 */
export interface ChunkPatchOps {
  readonly $: ChunkPatchAspects
}
/**
 * @tsplus static effect/core/io/Differ.Ops ChunkPatch
 */
export const ChunkPatch: ChunkPatchOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/Differ.ChunkPatch.Aspects
 */
export interface ChunkPatchAspects {}

/**
 * @tsplus unify effect/core/io/Differ.ChunkPatch
 */
export function unifyChunkPatch<X extends ChunkPatch<any, any>>(self: X): ChunkPatch<
  [X] extends [{ [ChunkPatchValueSym]: () => infer Value }] ? Value : never,
  [X] extends [{ [ChunkPatchPatchSym]: () => infer Patch }] ? Patch : never
> {
  return self
}

export abstract class BaseChunkPatch<Value, Patch> implements ChunkPatch<Value, Patch> {
  readonly [ChunkPatchSym]: ChunkPatchSym = ChunkPatchSym
  readonly [ChunkPatchValueSym]!: () => Value
  readonly [ChunkPatchPatchSym]!: () => Patch
}

export class AppendChunkPatch<Value, Patch> extends BaseChunkPatch<Value, Patch> {
  readonly _tag = "Append"
  constructor(readonly values: Chunk<Value>) {
    super()
  }
}

export class SliceChunkPatch<Value, Patch> extends BaseChunkPatch<Value, Patch> {
  readonly _tag = "Slice"
  constructor(readonly from: number, readonly until: number) {
    super()
  }
}

export class UpdateChunkPatch<Value, Patch> extends BaseChunkPatch<Value, Patch> {
  readonly _tag = "Update"
  constructor(readonly index: number, readonly patch: Patch) {
    super()
  }
}

export class AndThenChunkPatch<Value, Patch> extends BaseChunkPatch<Value, Patch> {
  readonly _tag = "AndThen"
  constructor(readonly first: ChunkPatch<Value, Patch>, readonly second: ChunkPatch<Value, Patch>) {
    super()
  }
}

export class EmptyChunkPatch<Value, Patch> extends BaseChunkPatch<Value, Patch> {
  readonly _tag = "Empty"
}

export type ChunkPatchInstruction =
  | AppendChunkPatch<any, any>
  | SliceChunkPatch<any, any>
  | UpdateChunkPatch<any, any>
  | AndThenChunkPatch<any, any>
  | EmptyChunkPatch<any, any>

/**
 * @tsplus macro identity
 */
export function chunkPatchInstruction<Value, Patch>(
  self: ChunkPatch<Value, Patch>
): ChunkPatchInstruction {
  // @ts-expect-error
  return self
}
