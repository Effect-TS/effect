import { transfer, UnpureBarrier } from "@effect-ts/core/test/stm/STM/test-utils";
import { constVoid } from "@tsplus/stdlib/data/Function";

describe.concurrent("STM", () => {
  describe.concurrent("Using `STM.atomically` perform concurrent computations that", () => {
    describe.concurrent("have a simple condition lock should suspend the whole transaction and", () => {
      it("resume directly when the condition is already satisfied", async () => {
        const program = Effect.Do()
          .bind("tref1", () => TRef.makeCommit(10))
          .bind("tref2", () => TRef.makeCommit("failed!"))
          .flatMap(({ tref1, tref2 }) =>
            tref1
              .get()
              .tap((n) => STM.check(n > 0))
              .tap(() => tref2.set("succeeded!"))
              .flatMap(() => tref2.get())
              .commit()
          );

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, "succeeded!");
      });

      it("resume directly when the condition is already satisfied and change again the tvar with non satisfying value, the transaction shouldn't be suspended.", async () => {
        const program = Effect.Do()
          .bind("tref", () => TRef.makeCommit(42))
          .bind("join", ({ tref }) =>
            tref
              .get()
              .retryUntil((n) => n === 42)
              .commit())
          .tap(({ tref }) => tref.set(9).commit())
          .bind("value", ({ tref }) => tref.get().commit());

        const { join, value } = await program.unsafeRunPromise();

        assert.strictEqual(join, 42);
        assert.strictEqual(value, 9);
      });

      it("resume after satisfying the condition", async () => {
        const barrier = new UnpureBarrier();
        const program = Effect.Do()
          .bind("done", () => Deferred.make<never, void>())
          .bind("tref1", () => TRef.makeCommit(0))
          .bind("tref2", () => TRef.makeCommit("failed!"))
          .bind("fiber", ({ done, tref1, tref2 }) =>
            (
              STM.atomically(
                STM.Do()
                  .bind("v1", () => tref1.get())
                  .tap(() => STM.succeed(barrier.open()))
                  .tap(({ v1 }) => STM.check(v1 > 42))
                  .tap(() => tref2.set("succeeded!"))
                  .flatMap(() => tref2.get())
              ) < done.succeed(undefined)
            ).fork())
          .tap(() => barrier.await())
          .bind("oldValue", ({ tref2 }) => tref2.get().commit())
          .tap(({ tref1 }) => tref1.set(43).commit())
          .tap(({ done }) => done.await())
          .bind("newValue", ({ tref2 }) => tref2.get().commit())
          .bind("join", ({ fiber }) => fiber.join());

        const { join, newValue, oldValue } = await program.unsafeRunPromise();

        assert.strictEqual(oldValue, "failed!");
        assert.strictEqual(newValue, join);
      });
    });

    describe.concurrent("have a complex condition lock should suspend the whole transaction and", () => {
      it("resume directly when the condition is already satisfied", async () => {
        const program = Effect.Do()
          .bind("sender", () => TRef.makeCommit(100))
          .bind("receiver", () => TRef.makeCommit(0))
          .tap(({ receiver, sender }) => transfer(receiver, sender, 150).fork())
          .tap(({ sender }) => sender.update((n) => n + 100).commit())
          .tap(({ sender }) =>
            sender
              .get()
              .retryUntil((n) => n === 50)
              .commit()
          )
          .bind("senderValue", ({ sender }) => sender.get().commit())
          .bind("receiverValue", ({ receiver }) => receiver.get().commit());

        const { receiverValue, senderValue } = await program.unsafeRunPromise();

        assert.strictEqual(senderValue, 50);
        assert.strictEqual(receiverValue, 150);
      });
    });

    describe.concurrent("transfer an amount to a sender and send it back the account should contains the amount to transfer", () => {
      it("run both transactions sequentially in 10 fibers", async () => {
        const program = Effect.Do()
          .bind("sender", () => TRef.makeCommit(100))
          .bind("receiver", () => TRef.makeCommit(0))
          .bindValue("toReceiver", ({ receiver, sender }) => transfer(receiver, sender, 150))
          .bindValue("toSender", ({ receiver, sender }) => transfer(sender, receiver, 150))
          .bind("fiber", ({ toReceiver, toSender }) => Effect.forkAll(Chunk.fill(10, () => toReceiver > toSender)))
          .tap(({ sender }) => sender.update((n) => n + 50).commit())
          .tap(({ fiber }) => fiber.join())
          .bind("senderValue", ({ sender }) => sender.get().commit())
          .bind("receiverValue", ({ receiver }) => receiver.get().commit());

        const { receiverValue, senderValue } = await program.unsafeRunPromise();

        assert.strictEqual(senderValue, 150);
        assert.strictEqual(receiverValue, 0);
      });

      it("run 10 transactions `toReceiver` and 10 `toSender` concurrently", async () => {
        const program = Effect.Do()
          .bind("sender", () => TRef.makeCommit(50))
          .bind("receiver", () => TRef.makeCommit(0))
          .bindValue("toReceiver", ({ receiver, sender }) => transfer(receiver, sender, 100))
          .bindValue("toSender", ({ receiver, sender }) => transfer(sender, receiver, 100))
          .bind("fiber1", ({ toReceiver }) => Effect.forkAll(Chunk.fill(10, () => toReceiver)))
          .bind("fiber2", ({ toSender }) => Effect.forkAll(Chunk.fill(10, () => toSender)))
          .tap(({ sender }) => sender.update((n) => n + 50).commit())
          .tap(({ fiber1 }) => fiber1.join())
          .tap(({ fiber2 }) => fiber2.join())
          .bind("senderValue", ({ sender }) => sender.get().commit())
          .bind("receiverValue", ({ receiver }) => receiver.get().commit());

        const { receiverValue, senderValue } = await program.unsafeRunPromise();

        assert.strictEqual(senderValue, 100);
        assert.strictEqual(receiverValue, 0);
      });

      it("run transactions `toReceiver` 10 times and `toSender` 10 times each in 100 fibers concurrently", async () => {
        const program = Effect.Do()
          .bind("sender", () => TRef.makeCommit(50))
          .bind("receiver", () => TRef.makeCommit(0))
          .bindValue("toReceiver", ({ receiver, sender }) => transfer(receiver, sender, 100).repeatN(9))
          .bindValue("toSender", ({ receiver, sender }) => transfer(sender, receiver, 100).repeatN(9))
          .bind("fiber", ({ toReceiver, toSender }) => toReceiver.zipPar(toSender).fork())
          .tap(({ sender }) => sender.update((n) => n + 50).commit())
          .tap(({ fiber }) => fiber.join())
          .bind("senderValue", ({ sender }) => sender.get().commit())
          .bind("receiverValue", ({ receiver }) => receiver.get().commit());

        const { receiverValue, senderValue } = await program.unsafeRunPromise();

        assert.strictEqual(senderValue, 100);
        assert.strictEqual(receiverValue, 0);
      });
    });

    it("perform atomically a single transaction that has a tvar for 20 fibers, each one checks the value and increment it", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .bind("fiber", ({ tRef }) =>
          Effect.forkAll(
            Chunk.range(0, 20).map((i) =>
              tRef
                .get()
                .flatMap((v) => STM.check(v === i))
                .zipRight(tRef.update((n) => n + 1).map(constVoid))
                .commit()
            )
          ))
        .tap(({ fiber }) => fiber.join())
        .flatMap(({ tRef }) => tRef.get().commit());

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 21);
    });

    describe.concurrent("perform atomically a transaction with a condition that couldn't be satisfied, it should be suspended", () => {
      it("interrupt the fiber should terminate the transaction", async () => {
        const barrier = new UnpureBarrier();
        const program = Effect.Do()
          .bind("tRef", () => TRef.makeCommit(0))
          .bind("fiber", ({ tRef }) =>
            tRef
              .get()
              .tap(() => STM.succeed(barrier.open()))
              .tap((v) => STM.check(v > 0))
              .tap(() => tRef.update((n) => 10 / n))
              .map(constVoid)
              .commit()
              .fork())
          .tap(() => barrier.await())
          .tap(({ fiber }) => fiber.interrupt())
          .tap(({ tRef }) => tRef.set(10).commit())
          .flatMap(({ tRef }) => Effect.sleep((10).millis) > tRef.get().commit());

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, 10);
      });

      it("interrupt the fiber that has executed the transaction in 100 different fibers, should terminate all transactions", async () => {
        const barrier = new UnpureBarrier();
        const program = Effect.Do()
          .bind("tRef", () => TRef.makeCommit(0))
          .bind("fiber", ({ tRef }) =>
            Effect.forkAll(
              Chunk.fill(100, () =>
                tRef
                  .get()
                  .tap(() => STM.succeed(barrier.open()))
                  .tap((v) => STM.check(v < 0))
                  .tap(() => tRef.set(10))
                  .commit())
            ))
          .tap(() => barrier.await())
          .tap(({ fiber }) => fiber.interrupt())
          .tap(({ tRef }) => tRef.set(-1).commit())
          .flatMap(({ tRef }) => Effect.sleep((10).millis) > tRef.get().commit());

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, -1);
      });

      it("interrupt the fiber and observe it, it should be resumed with Interrupted Cause", async () => {
        const program = Effect.Do()
          .bind("selfId", () => Effect.fiberId)
          .bind("tRef", () => TRef.makeCommit(1))
          .bind("fiber", ({ tRef }) =>
            tRef
              .get()
              .flatMap((n) => STM.check(n === 0))
              .commit()
              .fork())
          .tap(({ fiber }) => fiber.interrupt())
          .bind("observe", ({ fiber }) => fiber.join().sandbox().either());

        const { observe, selfId } = await program.unsafeRunPromise();

        assert.isTrue(
          observe.mapLeft((cause) => cause.untraced()) ==
            Either.left(Cause.interrupt(selfId))
        );
      });
    });

    it("Using `continueOrRetry` filter and map simultaneously the value produced by the transaction", async () => {
      const program = STM.succeed(Chunk.range(1, 20))
        .continueOrRetry((chunk) => chunk.forAll((n) => n > 0) ? Option.some("positive") : Option.none)
        .commit();

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, "positive");
    });

    it("Using `continueOrRetrySTM` filter and map simultaneously the value produced by the transaction", async () => {
      const program = STM.succeed(Chunk.range(1, 20))
        .continueOrRetrySTM((chunk) => chunk.forAll((n) => n > 0) ? Option.some(STM.succeed("positive")) : Option.none)
        .commit();

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, "positive");
    });
  });
});
