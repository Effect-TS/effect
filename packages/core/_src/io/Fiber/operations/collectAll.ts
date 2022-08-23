import { makeSynthetic } from "@effect/core/io/Fiber/definition"

/**
 * Collects all fibers into a single fiber producing an in-order list of the
 * results.
 *
 * @tsplus static effect/core/io/Fiber.Ops collectAll
 */
export function collectAll<E, A>(fibers: Collection<Fiber<E, A>>): Fiber<E, Chunk<A>> {
  return makeSynthetic({
    id: fibers.reduce(FiberId.none, (id, fiber) => id + fiber.id),
    await: Effect.forEachPar(fibers, (fiber) => fiber.await.flatten).exit,
    children: Effect.forEachPar(fibers, (fiber) => fiber.children).map((_) => _.flatten),
    inheritAll: Effect.forEachDiscard(fibers, (fiber) => fiber.inheritAll),
    poll: Effect.forEach(fibers, (fiber) => fiber.poll).map((chunk) =>
      chunk.reduceRight(
        Maybe.some(Exit.succeed(Chunk.empty()) as Exit<E, Chunk<A>>),
        (a, b) =>
          a.fold(
            () => Maybe.none,
            (ra) =>
              b.fold(
                () => Maybe.none,
                (rb) => Maybe.some(ra.zipWith(rb, (_a, _b) => _b.prepend(_a), Cause.both))
              )
          )
      )
    ),
    interruptAsFork: (fiberId) =>
      Effect.forEachDiscard(fibers, (fiber) => fiber.interruptAsFork(fiberId))
  })
}
