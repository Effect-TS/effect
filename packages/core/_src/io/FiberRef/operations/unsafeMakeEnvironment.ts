import { FiberRefInternal } from "@effect/core/io/FiberRef/operations/_internal/FiberRefInternal";

/**
 * @tsplus static ets/FiberRef/Ops unsafeMakeEnvironment
 */
export function unsafeMakeEnvironment<A>(
  initial: Service.Env<A>
): FiberRef<Service.Env<A>, Service.Patch<A, A>> {
  return new FiberRefInternal(
    initial,
    Service.Patch.diff,
    (first, second) => first.combine(second),
    (patch) => (value) => patch.patch(value),
    Service.Patch.empty()
  );
}
