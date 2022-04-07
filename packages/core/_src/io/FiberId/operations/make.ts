import { RuntimeFiberId } from "@effect/core/io/FiberId/definition";

const _fiberCounter = new AtomicNumber(0);

/**
 * @tsplus static ets/FiberId/Ops __call
 */
export function make(
  id: number,
  startTimeSeconds: number,
  location: TraceElement
): FiberId {
  return new RuntimeFiberId(id, startTimeSeconds, location);
}

/**
 * @tsplus static ets/FiberId/Ops unsafeMake
 */
export function unsafeMake(location: TraceElement): FiberId.Runtime {
  return new RuntimeFiberId(
    _fiberCounter.getAndIncrement(),
    Math.floor(new Date().getTime() / 1000),
    location
  );
}
