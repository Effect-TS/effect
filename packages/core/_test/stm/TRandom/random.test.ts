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
          TRandom.nextIntBetween(tp[0], tp[1]).map((_) => {
            if (!(_ >= tp[0] && _ < tp[1])) {
              console.log(tp, _)
            }
            return _ >= tp[0] && _ < tp[1]
          })
      )).map(Chunk.$.forAll(identity)).commit
      const result = await ns.unsafeRunPromise()

      assert.isTrue(result)
    })
    it("nextRange", async () => {
      const ns = TRandom.withSeed(12345)(STM.forEach(
        numbers,
        (tp) =>
          TRandom.nextRange(tp[0], tp[1]).map((_) => {
            if (!(_ >= tp[0] && _ < tp[1])) {
              console.log(tp, _)
            }
            return _ >= tp[0] && _ < tp[1]
          })
      )).map(Chunk.$.forAll(identity)).commit
      const result = await ns.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})
