describe.concurrent("Stream", () => {
  it("interleave", async () => {
    const stream1 = Stream(2, 3)
    const stream2 = Stream(5, 6, 7)
    const program = stream1.interleave(stream2).runCollect

    const result = await program.unsafeRunPromise()

    assert.isTrue(result == Chunk(2, 5, 3, 6, 7))
  })

  it("interleaveWith", async () => {
    function interleave(b: Chunk<boolean>, s1: Chunk<number>, s2: Chunk<number>): Chunk<number> {
      return b.head
        .map((hd) => {
          if (hd) {
            return s1.length > 0
              ? interleave(b.unsafeTail, s1.unsafeTail, s2).prepend(s1.unsafeHead)
              : s2.isEmpty
              ? Chunk.empty<number>()
              : interleave(b.unsafeTail, Chunk.empty(), s2)
          }
          return s2.length > 0
            ? interleave(b.unsafeTail, s1, s2.unsafeTail).prepend(s2.unsafeHead)
            : s1.isEmpty
            ? Chunk.empty<number>()
            : interleave(b.unsafeTail, s1, Chunk.empty())
        })
        .getOrElse(Chunk.empty())
    }

    const booleanStream = Stream(true, false, true, true, false)
    const stream1 = Stream(1, 2, 3, 4, 5)
    const stream2 = Stream(6, 7, 8, 9, 10)
    const program = Effect.struct({
      interleavedStream: stream1.interleaveWith(stream2, booleanStream).runCollect,
      b: booleanStream.runCollect,
      s1: stream1.runCollect,
      s2: stream2.runCollect
    })

    const { b, interleavedStream, s1, s2 } = await program.unsafeRunPromise()

    const interleavedChunks = interleave(b, s1, s2)

    assert.isTrue(interleavedStream == interleavedChunks)
  })
})
