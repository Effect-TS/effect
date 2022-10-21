export function partitionMap<A, A1, A2>(
  as: Collection<A>,
  f: (a: A) => Either<A1, A2>
): readonly [Chunk<A1>, Chunk<A2>] {
  return Chunk.from(as).reduceRight(
    [Chunk.empty<A1>(), Chunk.empty<A2>()] as const,
    (a, [es, bs]) =>
      f(a).fold(
        (e) => [es.prepend(e), bs] as const,
        (b) => [es, bs.prepend(b)] as const
      )
  )
}
