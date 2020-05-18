import type { Applicative, HKT } from "../../Base"
import type { FunctionN } from "../../Function"

export type SinkStep<A, S> = SinkStepCont<S> | SinkStepDone<A, S>

export function sinkCont<S>(s: S): SinkStepCont<S> {
  return { _tag: "Cont", state: s }
}

export interface SinkStepCont<S> {
  readonly _tag: "Cont"
  readonly state: S
}

export function sinkDone<A, S>(s: S, leftover: readonly A[]): SinkStepDone<A, S> {
  return { _tag: "Done", state: s, leftover }
}

export function isSinkCont<A0, S>(s: SinkStep<A0, S>): s is SinkStepCont<S> {
  return s._tag === "Cont"
}

export function isSinkDone<S, A0>(s: SinkStep<S, A0>): s is SinkStepDone<S, A0> {
  return s._tag === "Done"
}

export interface SinkStepDone<A, S> {
  readonly _tag: "Done"
  readonly state: S
  readonly leftover: readonly A[]
}

export function sinkStepLeftover<A, S>(s: SinkStep<A, S>): readonly A[] {
  if (s._tag === "Cont") {
    return []
  } else {
    return s.leftover
  }
}

export function sinkStepState<A0, S>(s: SinkStep<A0, S>): S {
  return s.state
}

export function map<A0, S, S1>(
  step: SinkStep<A0, S>,
  f: FunctionN<[S], S1>
): SinkStep<A0, S1> {
  return {
    ...step,
    state: f(step.state)
  }
}

export function mapWith<S, S1>(
  f: FunctionN<[S], S1>
): <A>(step: SinkStep<A, S>) => SinkStep<A, S1> {
  return <A>(step: SinkStep<A, S>) => map(step, f)
}

export function traverse<F>(
  F: Applicative<F>
): <A0, S, S1>(
  step: SinkStep<A0, S>,
  f: FunctionN<[S], HKT<F, S1>>
) => HKT<F, SinkStep<A0, S1>> {
  return <A0, S, S1>(
    step: SinkStep<A0, S>,
    f: FunctionN<[S], HKT<F, S1>>
  ): HKT<F, SinkStep<A0, S1>> => F.map(f(step.state), (s1) => ({ ...step, state: s1 }))
}
