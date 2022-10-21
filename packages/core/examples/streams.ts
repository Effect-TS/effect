Stream.fromChunk(Chunk.range(0, 1_000_000))
  .filter((n) => n % 2 === 0)
  .map((n) => n + 1)
  .scan(0, (a, b) => a + b)
  .runDrain
  .unsafeRunPromiseExit()
  .then(console.log)
