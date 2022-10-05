describe.concurrent("Sink", () => {
  describe.concurrent("flatMap", () => {
    it("non-empty input", () =>
      Do(($) => {
        const sink = Sink.head<number>().flatMap((x) => Sink.succeed(x))
        const stream = Stream(1, 2, 3)
        const result = $(stream.run(sink))
        assert.isTrue(result == Maybe.some(1))
      }).unsafeRunPromise())

    it("empty input", () =>
      Do(($) => {
        const sink = Sink.head<number>().flatMap((x) => Sink.succeed(x))
        const stream = Stream.empty
        const result = $(stream.run(sink))
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())

    it("with leftovers", () =>
      Do(($) => {
        const chunks = Chunk(
          Chunk(1, 2),
          Chunk(3, 4, 5),
          Chunk.empty<number>(),
          Chunk(7, 8, 9, 10)
        )
        const sink = Sink.head<number>().flatMap((head) =>
          Sink.count().map((count) => [head, count] as const)
        )
        const stream = Stream.fromChunks(...chunks)
        const result = $(stream.run(sink))
        const [head, count] = result
        assert.isTrue(head == chunks.flatten.head)
        assert.strictEqual(
          count + head.fold(0, () => 1),
          chunks.map((chunk) => chunk.size).reduce(0, (a, b) => a + b)
        )
      }).unsafeRunPromise())

    // TODO(Mike/Max): implement after Gen
    // test("leftovers are kept in order") {
    //   Ref.make(Chunk[Chunk[Int]]()).flatMap { readData =>
    //     def takeN(n: Int) =
    //       ZSink.take[Int](n).mapZIO(c => readData.update(_ :+ c))

    //     def taker(data: Chunk[Chunk[Int]], n: Int): (Chunk[Int], Chunk[Chunk[Int]], Boolean) = {
    //       import scala.collection.mutable
    //       val buffer   = mutable.Buffer(data: _*)
    //       val builder  = mutable.Buffer[Int]()
    //       var wasSplit = false

    //       while (builder.size < n && buffer.nonEmpty) {
    //         val popped = buffer.remove(0)

    //         if ((builder.size + popped.size) <= n) builder ++= popped
    //         else {
    //           val splitIndex  = n - builder.size
    //           val (take, ret) = popped.splitAt(splitIndex)
    //           builder ++= take
    //           buffer.prepend(ret)

    //           if (splitIndex > 0)
    //             wasSplit = true
    //         }
    //       }

    //       (Chunk.fromIterable(builder), Chunk.fromIterable(buffer), wasSplit)
    //     }

    //     val gen =
    //       for {
    //         sequenceSize <- Gen.int(1, 50)
    //         takers       <- Gen.int(1, 5)
    //         takeSizes    <- Gen.listOfN(takers)(Gen.int(1, sequenceSize))
    //         inputs       <- Gen.chunkOfN(sequenceSize)(ZStreamGen.tinyChunkOf(Gen.int))
    //         (expectedTakes, leftoverInputs, wasSplit) = takeSizes.foldLeft((Chunk[Chunk[Int]](), inputs, false)) {
    //                                                       case ((takenChunks, leftover, _), takeSize) =>
    //                                                         val (taken, rest, wasSplit) =
    //                                                           taker(leftover, takeSize)
    //                                                         (takenChunks :+ taken, rest, wasSplit)
    //                                                     }
    //         expectedLeftovers = if (wasSplit) leftoverInputs.head
    //                             else Chunk()
    //       } yield (inputs, takeSizes, expectedTakes, expectedLeftovers)

    //     check(gen) { case (inputs, takeSizes, expectedTakes, expectedLeftovers) =>
    //       val takingSinks = takeSizes.map(takeN(_)).reduce(_ *> _).channel.doneCollect
    //       val channel     = ZChannel.writeAll(inputs: _*) >>> takingSinks

    //       (channel.run <*> readData.getAndSet(Chunk())).map { case (leftovers, _, takenChunks) =>
    //         assert(leftovers.flatten)(equalTo(expectedLeftovers)) &&
    //           assert(takenChunks)(equalTo(expectedTakes))
    //       }
    //     }
    //   }
    // } @@ jvmOnly
  })
})
