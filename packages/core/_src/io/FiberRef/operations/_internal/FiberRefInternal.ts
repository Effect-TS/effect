import { _Patch, _Value, FiberRefSym } from "@effect/core/io/FiberRef/definition";

export class FiberRefInternal<Value, Patch> implements FiberRef.WithPatch<Value, Patch> {
  readonly [FiberRefSym]: FiberRefSym = FiberRefSym;
  readonly [_Value]!: () => Value;
  readonly [_Patch]!: Patch;

  constructor(
    readonly _initial: Value,
    readonly _diff: (oldValue: Value, newValue: Value) => Patch,
    readonly _combine: (first: Patch, second: Patch) => Patch,
    readonly _patch: (patch: Patch) => (oldValue: Value) => Value,
    readonly _fork: Patch
  ) {}
}

/**
 * @tsplus macro remove
 */
export function concreteFiberRef<Value>(_: FiberRef<Value>): asserts _ is FiberRefInternal<Value, unknown> {
  //
}
