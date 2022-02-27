import { Chunk } from "../../../collection/immutable/Chunk"
import * as Iter from "../../../collection/immutable/Iterable"
import { Option } from "../../../data/Option"
import { Cause } from "../../Cause/definition"
import { Effect } from "../../Effect"
import { Exit } from "../../Exit"
import { FiberId } from "../../FiberId"
import type { Runtime } from "../../FiberRef"
import type { Fiber } from "../definition"
import { makeSynthetic } from "./makeSynthetic"

/**
 * Collects all fibers into a single fiber producing an in-order list of the
 * results.
 */
export function collectAll<E, A>(fibers: Iterable<Fiber<E, A>>): Fiber<E, Chunk<A>> {
  return makeSynthetic({
    id: Iter.reduce_(fibers, FiberId.none, (id, fiber) => id + fiber.id),
    await: Effect.forEachPar(fibers, (fiber) =>
      fiber.await.flatMap((_) => Effect.done(_))
    ).exit(),
    children: Effect.forEachPar(fibers, (fiber) => fiber.children).map((_) =>
      _.flatten()
    ),
    inheritRefs: Effect.forEachDiscard(fibers, (fiber) => fiber.inheritRefs),
    poll: Effect.forEach(fibers, (f) => f.poll).map((_) =>
      _.reduceRight(
        Option.some(Exit.succeed(Chunk.empty()) as Exit<E, Chunk<A>>),
        (a, b) =>
          a.fold(
            () => Option.none,
            (ra) =>
              b.fold(
                () => Option.none,
                (rb) =>
                  Option.some(ra.zipWith(rb, (_a, _b) => _b.prepend(_a), Cause.both))
              )
          )
      )
    ),
    getRef: (ref) =>
      Effect.reduce(
        fibers,
        () => (ref as Runtime<any>).initial,
        (a, fiber) => fiber.getRef(ref).map((a2) => (ref as Runtime<any>).join(a, a2))
      ),
    interruptAs: (fiberId) =>
      Effect.forEach(fibers, (f) => f.interruptAs(fiberId)).map((_) =>
        _.reduceRight(Exit.succeed(Chunk.empty()) as Exit<E, Chunk<A>>, (a, b) =>
          a.zipWith(b, (_a, _b) => _b.prepend(_a), Cause.both)
        )
      )
  })
}
