describe.concurrent("Stream", () => {
  describe.concurrent("retry", () => {
    it("retry a failing stream", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue(
          "stream",
          ({ ref }) => Stream.fromEffect(ref.getAndUpdate((n) => n + 1)) + Stream.fail(Maybe.none)
        )
        .flatMap(({ stream }) => stream.retry(Schedule.repeatForever).take(2).runCollect)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(0, 1))
    })

    it("cleanup resources before restarting the stream", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("stream", ({ ref }) =>
          Stream.unwrapScoped(
            Effect.addFinalizer(ref.getAndUpdate((n) => n + 1)).as(
              Stream.fromEffect(ref.get()) + Stream.fail(Maybe.none)
            )
          ))
        .flatMap(({ stream }) => stream.retry(Schedule.repeatForever).take(2).runCollect)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(0, 1))
    })

    // TODO(Mike/Max): implement after TestClock
    it.skip("retry a failing stream according to a schedule", async () => {
      // const program = Effect.Do()
      // .bind("times", () => Ref.make(List.empty<number>()))
      // .bindValue("stream", ({ times }) =>
      //   Stream.fromEffect(Clock.currentTime.flatMap((time) => times.update((list) => list.prepend(time))))
      //   .flatMap(() => Stream.fail(Maybe.none))
      // )
      // .bind("fiber", ({ stream }) => stream.retry(Schedule.exponential(Duration(10)).take(3).runDrain().fork()))
      // for {
      //   times <- Ref.make(List.empty[java.time.Instant])
      //   stream =
      //     ZStream
      //       .fromZIO(Clock.instant.flatMap(time => times.update(time +: _)))
      //       .flatMap(_ => ZStream.fail(None))
      //   streamFib <- stream.retry(Schedule.exponential(1.second)).take(3).runDrain().fork
      //   _         <- TestClock.adjust(1.second)
      //   _         <- TestClock.adjust(2.second)
      //   _         <- streamFib.interrupt
      //   results   <- times.get.map(_.map(_.getEpochSecond.toInt))
      // } yield assert(results)(equalTo(List(3, 1, 0)))
    })

    // TODO(Mike/Max): implement after TestClock
    it.skip("reset the schedule after a successful pull", async () => {
      //   for {
      //     times <- Ref.make(List.empty[java.time.Instant])
      //     ref   <- Ref.make(0)
      //     stream =
      //       ZStream
      //         .fromZIO(Clock.instant.flatMap(time => times.update(time +: _) *> ref.updateAndGet(_ + 1)))
      //         .flatMap { attemptNr =>
      //           if (attemptNr == 3 || attemptNr == 5) ZStream.succeed(attemptNr) else ZStream.fail(None)
      //         }
      //         .forever
      //     streamFib <- stream
      //                    .retry(Schedule.exponential(1.second))
      //                    .take(2)
      //                    .runDrain()
      //                    .fork
      //     _       <- TestClock.adjust(1.second)
      //     _       <- TestClock.adjust(2.second)
      //     _       <- TestClock.adjust(1.second)
      //     _       <- streamFib.join
      //     results <- times.get.map(_.map(_.getEpochSecond.toInt))
      //   } yield assert(results)(equalTo(List(4, 3, 3, 1, 0)))
    })
  })
})
