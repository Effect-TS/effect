import { reduceRight } from "../../../collection/immutable/Chunk/api/reduceRight"
import * as Chunk from "../../../collection/immutable/Chunk/core"
import * as Iter from "../../../collection/immutable/Iterable"
import * as O from "../../../data/Option"
import * as Cause from "../../Cause/definition"
import { Effect } from "../../Effect"
import * as Exit from "../../Exit"
import * as FiberId from "../../FiberId"
import type { Fiber } from "../definition"
import { makeSynthetic } from "./makeSynthetic"

/**
 * Collects all fibers into a single fiber producing an in-order list of the
 * results.
 */
export function collectAll<E, A>(
  fibers: Iterable<Fiber<E, A>>
): Fiber<E, Chunk.Chunk<A>> {
  return makeSynthetic({
    id: Iter.reduce_(fibers, FiberId.none, (id, fiber) =>
      FiberId.combine_(id, fiber.id)
    ),
    await: Effect.forEachPar(fibers, (fiber) =>
      fiber.await.flatMap(Effect.done)
    ).exit(),
    children: Effect.forEachPar(fibers, (fiber) => fiber.children).map(Chunk.flatten),
    inheritRefs: Effect.forEachDiscard(fibers, (fiber) => fiber.inheritRefs),
    poll: Effect.forEach(fibers, (f) => f.poll).map(
      reduceRight(
        O.some(Exit.succeed(Chunk.empty()) as Exit.Exit<E, Chunk.Chunk<A>>),
        (a, b) =>
          O.fold_(
            a,
            () => O.none,
            (ra) =>
              O.fold_(
                b,
                () => O.none,
                (rb) =>
                  O.some(
                    Exit.zipWith_(
                      ra,
                      rb,
                      (_a, _b) => Chunk.prepend_(_b, _a),
                      Cause.both
                    )
                  )
              )
          )
      )
    ),
    getRef: (ref) =>
      Effect.reduce(fibers, ref.initial, (a, fiber) =>
        fiber.getRef(ref).map((a2) => ref.join(a, a2))
      ),
    interruptAs: (fiberId) =>
      Effect.forEach(fibers, (f) => f.interruptAs(fiberId)).map(
        reduceRight(
          Exit.succeed(Chunk.empty()) as Exit.Exit<E, Chunk.Chunk<A>>,
          (a, b) => Exit.zipWith_(a, b, (_a, _b) => Chunk.prepend_(_b, _a), Cause.both)
        )
      )
  })
}
