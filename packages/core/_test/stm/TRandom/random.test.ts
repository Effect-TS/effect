function getRndInteger(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min
}

function getRnd(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

const ints = Chunk.makeBy(100, (_) => Tuple(_, _ + getRndInteger(1, 1000)))
const numbers = Chunk.makeBy(100, (_) => Tuple(_, _ + getRnd(1, 1000)))

describe.concurrent("TRandom", () => {
  describe.concurrent("locks", () => {
    it("nextIntBetween", async () => {
      const ns = TRandom.withSeed(12345)(STM.forEach(
        ints,
        (tp) =>
          TRandom.nextIntBetween(tp.get(0), tp.get(1)).map((_) => {
            if (!(_ >= tp.get(0) && _ < tp.get(1))) {
              console.log(tp, _)
            }
            return _ >= tp.get(0) && _ < tp.get(1)
          })
      )).map(Chunk.$.forAll(identity)).commit()
      const result = await ns.unsafeRunPromise()

      assert.isTrue(result)
    })
    it("nextRange", async () => {
      const ns = TRandom.withSeed(12345)(STM.forEach(
        numbers,
        (tp) =>
          TRandom.nextRange(tp.get(0), tp.get(1)).map((_) => {
            if (!(_ >= tp.get(0) && _ < tp.get(1))) {
              console.log(tp, _)
            }
            return _ >= tp.get(0) && _ < tp.get(1)
          })
      )).map(Chunk.$.forAll(identity)).commit()
      const result = await ns.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})
