export const n = 10
export const N = 1000
export const largePrime = 223
export const boom = new Error("boom")

export function makeTArray<A>(n: number, a: A): STM<never, never, TArray<A>> {
  return TArray.from(Chunk.fill(n, () => a))
}

export function makeStair(n: number): STM<never, never, TArray<number>> {
  return TArray.from(Chunk.range(1, n))
}

export function makeStairWithHoles(n: number): STM<never, never, TArray<Option<number>>> {
  return TArray.from(
    Chunk.range(1, n).map((i) => i % 3 === 0 ? Option.emptyOf<number>() : Option.some(i))
  )
}

export function makeRepeats(
  blocks: number,
  length: number
): STM<never, never, TArray<number>> {
  return TArray.from(
    Chunk.range(0, (blocks * length) - 1).map((i) => (i % length) + 1)
  )
}

export function valuesOf<A>(tArray: TArray<A>): STM<never, never, Chunk<A>> {
  return tArray.reduce(Chunk.empty<A>(), (acc, a) => acc.append(a))
}
