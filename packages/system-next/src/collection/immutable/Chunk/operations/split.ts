import { Chunk, concreteId } from "../definition"

/**
 * Splits this chunk into `n` equally sized chunks.
 *
 * @tsplus fluent ets/Chunk split
 */
export function split_<A>(self: Chunk<A>, n: number): Chunk<Chunk<A>> {
  const length = concreteId(self).length
  const k = Math.floor(n)
  const quotient = Math.floor(length / k)
  const remainder = length % k

  let chunks = Chunk.empty<Chunk<A>>()
  let i = 0

  let chunk = Chunk.empty<A>()

  self.forEach((a) => {
    chunk = chunk.append(a)
    if (
      (i <= remainder && concreteId(chunk).length > quotient) ||
      (i > remainder && concreteId(chunk).length >= quotient)
    ) {
      chunks = chunks.append(chunk)
      chunk = Chunk.empty()
    }
    i++
  })

  if (concreteId(chunk).length > 0) {
    chunks = chunks.append(chunk)
  }

  return chunks
}

/**
 * Splits this chunk into `n` equally sized chunks.
 *
 * @ets_data_first split_
 */
export function split(n: number) {
  return <A>(self: Chunk<A>): Chunk<Chunk<A>> => self.split(n)
}
