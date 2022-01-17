import type { Has, Tag } from "../../Has"
import type { Managed } from "../definition"
import { provideServiceManaged } from "./provideServiceManaged"
import { succeedNow } from "./succeedNow"

/**
 * Provides the service with the required service entry.
 */
export function provideService<T>(_: Tag<T>) {
  return (service: T) =>
    <R1, E1, A1>(ma: Managed<R1 & Has<T>, E1, A1>): Managed<R1, E1, A1> =>
      provideServiceManaged(_)(succeedNow(service))(ma)
}
