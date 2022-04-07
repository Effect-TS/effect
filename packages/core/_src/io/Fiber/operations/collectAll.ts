import { makeSynthetic } from "@effect/core/io/Fiber/definition";

/**
 * Collects all fibers into a single fiber producing an in-order list of the
 * results.
 *
 * @tsplus static ets/Fiber/Ops collectAll
 */
export function collectAll<E, A>(fibers: Collection<Fiber<E, A>>): Fiber<E, Chunk<A>> {
  return makeSynthetic({
    id: fibers.reduce(FiberId.none, (id, fiber) => id + fiber.id()),
    await: Effect.forEachPar(fibers, (fiber) => fiber.await().flatMap((_) => Effect.done(_))).exit(),
    children: Effect.forEachPar(fibers, (fiber) => fiber.children()).map((_) => _.flatten()),
    inheritRefs: Effect.forEachDiscard(fibers, (fiber) => fiber.inheritRefs()),
    poll: Effect.forEach(fibers, (fiber) => fiber.poll()).map((chunk) =>
      chunk.reduceRight(
        Option.some(Exit.succeed(Chunk.empty()) as Exit<E, Chunk<A>>),
        (a, b) =>
          a.fold(
            () => Option.none,
            (ra) =>
              b.fold(
                () => Option.none,
                (rb) => Option.some(ra.zipWith(rb, (_a, _b) => _b.prepend(_a), Cause.both))
              )
          )
      )
    ),
    getRef: (ref) =>
      Effect.reduce(
        fibers,
        () => ref.initialValue(),
        (a, fiber) => fiber.getRef(ref).map((a2) => ref.join(a, a2))
      ),
    interruptAs: (fiberId) =>
      Effect.forEach(fibers, (fiber) => fiber.interruptAs(fiberId)).map((_) =>
        _.reduceRight(
          Exit.succeed(Chunk.empty()) as Exit<E, Chunk<A>>,
          (a, b) => a.zipWith(b, (_a, _b) => _b.prepend(_a), Cause.both)
        )
      )
  });
}
