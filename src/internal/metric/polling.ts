import type { Effect } from "../../Effect.js"
import type { Fiber } from "../../Fiber.js"
import { dual, pipe } from "../../Function.js"
import type { Metric } from "../../Metric.js"
import type { MetricPolling } from "../../MetricPolling.js"
import { pipeArguments } from "../../Pipeable.js"
import type { Schedule } from "../../Schedule.js"
import type { Scope } from "../../Scope.js"
import * as core from "../core.js"
import * as circular from "../effect/circular.js"
import * as metric from "../metric.js"
import * as schedule from "../schedule.js"

/** @internal */
const MetricPollingSymbolKey = "effect/MetricPolling"

/** @internal */
export const MetricPollingTypeId: MetricPolling.MetricPollingTypeId = Symbol.for(
  MetricPollingSymbolKey
) as MetricPolling.MetricPollingTypeId

/** @internal */
export const make = <Type, In, Out, R, E>(
  metric: Metric<Type, In, Out>,
  poll: Effect<R, E, In>
): MetricPolling<Type, In, R, E, Out> => {
  return {
    [MetricPollingTypeId]: MetricPollingTypeId,
    pipe() {
      return pipeArguments(this, arguments)
    },
    metric,
    poll
  }
}

/** @internal */
export const collectAll = <R, E, Out>(
  iterable: Iterable<MetricPolling<any, any, R, E, Out>>
): MetricPolling<Array<any>, Array<any>, R, E, Array<Out>> => {
  const metrics = Array.from(iterable)
  return {
    [MetricPollingTypeId]: MetricPollingTypeId,
    pipe() {
      return pipeArguments(this, arguments)
    },
    metric: metric.make(
      Array.of<any>(void 0) as Array<any>,
      (inputs: Array<any>, extraTags) => {
        for (let i = 0; i < inputs.length; i++) {
          const pollingMetric = metrics[i]!
          const input = pipe(inputs, (x) => x[i])
          pollingMetric.metric.unsafeUpdate(input, extraTags)
        }
      },
      (extraTags) =>
        Array.from(
          metrics.map((pollingMetric) => pollingMetric.metric.unsafeValue(extraTags))
        )
    ),
    poll: core.forEachSequential(metrics, (metric) => metric.poll)
  }
}

/** @internal */
export const launch = dual<
  <R2, A2>(
    schedule: Schedule<R2, unknown, A2>
  ) => <Type, In, R, E, Out>(
    self: MetricPolling<Type, In, R, E, Out>
  ) => Effect<R | R2 | Scope, never, Fiber<E, A2>>,
  <Type, In, R, E, Out, R2, A2>(
    self: MetricPolling<Type, In, R, E, Out>,
    schedule: Schedule<R2, unknown, A2>
  ) => Effect<R | R2 | Scope, never, Fiber<E, A2>>
>(2, (self, schedule) =>
  pipe(
    pollAndUpdate(self),
    core.zipRight(metric.value(self.metric)),
    circular.scheduleForked(schedule)
  ))

/** @internal */
export const poll = <Type, In, R, E, Out>(
  self: MetricPolling<Type, In, R, E, Out>
): Effect<R, E, In> => self.poll

/** @internal */
export const pollAndUpdate = <Type, In, R, E, Out>(
  self: MetricPolling<Type, In, R, E, Out>
): Effect<R, E, void> => core.flatMap(self.poll, (value) => metric.update(self.metric, value))

/** @internal */
export const retry = dual<
  <R2, E, _>(
    policy: Schedule<R2, E, _>
  ) => <Type, In, R, Out>(
    self: MetricPolling<Type, In, R, E, Out>
  ) => MetricPolling<Type, In, R | R2, E, Out>,
  <Type, In, R, Out, R2, E, _>(
    self: MetricPolling<Type, In, R, E, Out>,
    policy: Schedule<R2, E, _>
  ) => MetricPolling<Type, In, R | R2, E, Out>
>(2, (self, policy) => ({
  [MetricPollingTypeId]: MetricPollingTypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  metric: self.metric,
  poll: schedule.retry_Effect(self.poll, policy)
}))

/** @internal */
export const zip = dual<
  <Type2, In2, R2, E2, Out2>(
    that: MetricPolling<Type2, In2, R2, E2, Out2>
  ) => <Type, In, R, E, Out>(
    self: MetricPolling<Type, In, R, E, Out>
  ) => MetricPolling<
    readonly [Type, Type2],
    readonly [In, In2],
    R | R2,
    E | E2,
    [Out, Out2]
  >,
  <Type, In, R, E, Out, Type2, In2, R2, E2, Out2>(
    self: MetricPolling<Type, In, R, E, Out>,
    that: MetricPolling<Type2, In2, R2, E2, Out2>
  ) => MetricPolling<
    readonly [Type, Type2],
    readonly [In, In2],
    R | R2,
    E | E2,
    [Out, Out2]
  >
>(2, (self, that) => ({
  [MetricPollingTypeId]: MetricPollingTypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  metric: pipe(self.metric, metric.zip(that.metric)),
  poll: core.zip(self.poll, that.poll)
}))
