describe.concurrent("Sink", () => {
  describe.concurrent("flatMap", () => {
    it("non-empty input", async () => {
      const program = Stream(1, 2, 3).run(
        Sink.head<number>().flatMap((x) => Sink.succeed(x))
      );

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some(1));
    });

    it("empty input", async () => {
      const program = Stream.empty.run(
        Sink.head<number>().flatMap((x) => Sink.succeed(x))
      );

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.none);
    });

    it("with leftovers", async () => {
      const chunks = Chunk(
        Chunk(1, 2),
        Chunk(3, 4, 5),
        Chunk.empty<number>(),
        Chunk(7, 8, 9, 10)
      );
      const headAndCount = Sink.head<number>().flatMap((head) => Sink.count().map((count) => Tuple(head, count)));
      const program = Stream.fromChunks(...chunks).run(headAndCount);

      const {
        tuple: [head, count]
      } = await program.unsafeRunPromise();

      assert.isTrue(head == chunks.flatten().head);
      assert.strictEqual(count + head.fold(0, () => 1), chunks.map((chunk) => chunk.size).reduce(0, (a, b) => a + b));
    });

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
  });
});
