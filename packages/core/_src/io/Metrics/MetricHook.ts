/**
 * @tsplus type ets/Metrics/MetricHook
 */
export interface MetricHook<In, Out> {
  readonly update: (input: In) => void;
  readonly get: () => Out;
}

/**
 * @tsplus type ets/Metrics/MetricHook/Ops
 */
export interface MetricHookOps {}
export const MetricHook: MetricHookOps = {};

export declare namespace MetricHook {
  export type Root = MetricHook<any, MetricState.Untyped>;
  export type Untyped = MetricHook<any, any>;

  export type Counter = MetricHook<number, MetricState.Counter>;
  export type Gauge = MetricHook<number, MetricState.Gauge>;
  export type Frequency = MetricHook<string, MetricState.Frequency>;
  export type Histogram = MetricHook<number, MetricState.Histogram>;
  export type Summary = MetricHook<Tuple<[number, number]>, MetricState.Summary>;
}

/**
 * @tsplus static ets/Metrics/MetricHook/Ops __call
 */
export function make<In, Out>(
  update: (input: In) => void,
  get: () => Out
): MetricHook<In, Out> {
  return {
    update,
    get
  };
}

/**
 * @tsplus fluent ets/Metrics/MetricHook onUpdate
 */
export function onUpdate<In, Out>(
  self: MetricHook<In, Out>,
  f: (input: In) => void
): MetricHook<In, Out> {
  return {
    update: (input) => {
      self.update(input);
      return f(input);
    },
    get: self.get
  };
}
