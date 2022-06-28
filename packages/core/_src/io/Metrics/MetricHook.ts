/**
 * @tsplus type effect/core/io/Metrics/MetricHook
 */
export interface MetricHook<In, Out> {
  readonly update: (input: In) => void
  readonly get: () => Out
}

/**
 * @tsplus type effect/core/io/Metrics/MetricHook.Ops
 */
export interface MetricHookOps {}
export const MetricHook: MetricHookOps = {}

export declare namespace MetricHook {
  export type Root = MetricHook<any, MetricState.Untyped>
  export type Untyped = MetricHook<any, any>

  export type Counter = MetricHook<number, MetricState.Counter>
  export type Gauge = MetricHook<number, MetricState.Gauge>
  export type Frequency = MetricHook<string, MetricState.Frequency>
  export type Histogram = MetricHook<number, MetricState.Histogram>
  export type Summary = MetricHook<Tuple<[number, number]>, MetricState.Summary>
}

/**
 * @tsplus static effect/core/io/Metrics/MetricHook.Ops __call
 */
export function make<In, Out>(
  update: (input: In) => void,
  get: () => Out
): MetricHook<In, Out> {
  return {
    update,
    get
  }
}

/**
 * @tsplus static effect/core/io/Metrics/MetricHook.Aspects onUpdate
 * @tsplus pipeable effect/core/io/Metrics/MetricHook onUpdate
 */
export function onUpdate<In, Out>(
  f: (input: In) => void
) {
  return (self: MetricHook<In, Out>): MetricHook<In, Out> => ({
    update: (input) => {
      self.update(input)
      return f(input)
    },
    get: self.get
  })
}
