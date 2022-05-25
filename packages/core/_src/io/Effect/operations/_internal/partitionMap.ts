export function partitionMap<A, A1, A2>(
  as: Collection<A>,
  f: (a: A) => Either<A1, A2>
): Tuple<[Chunk<A1>, Chunk<A2>]> {
  return Chunk.from(as).reduceRight(
    Tuple(Chunk.empty<A1>(), Chunk.empty<A2>()),
    (a, { tuple: [es, bs] }) =>
      f(a).fold(
        (e) => Tuple(es.prepend(e), bs),
        (b) => Tuple(es, bs.prepend(b))
      )
  )
}
