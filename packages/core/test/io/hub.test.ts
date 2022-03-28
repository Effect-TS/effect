import { List } from "../../src/collection/immutable/List"
import { Effect } from "../../src/io/Effect"
import { Hub } from "../../src/io/Hub"
import { Promise } from "../../src/io/Promise"

describe("Hub", () => {
  describe("sequential publishers and subscribers", () => {
    it("with one publisher and one subscriber", async () => {
      const as = List.range(0, 10)
      const program = Effect.Do()
        .bind("promise1", () => Promise.make<never, void>())
        .bind("promise2", () => Promise.make<never, void>())
        .bind("hub", () => Hub.bounded<number>(10))
        .bind("subscriber", ({ hub, promise1, promise2 }) =>
          hub
            .subscribe()
            .use(
              (subscription) =>
                promise1.succeed(undefined) >
                promise2.await() >
                Effect.forEach(as, () => subscription.take())
            )
            .fork()
        )
        .tap(({ promise1 }) => promise1.await())
        .tap(({ hub }) => Effect.forEach(as, (n) => hub.publish(n)))
        .tap(({ promise2 }) => promise2.succeed(undefined))
        .flatMap(({ subscriber }) => subscriber.join())

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(as.toArray())
    })

    it("with one publisher and two subscribers", async () => {
      const as = List.range(0, 10)
      const program = Effect.Do()
        .bind("promise1", () => Promise.make<never, void>())
        .bind("promise2", () => Promise.make<never, void>())
        .bind("promise3", () => Promise.make<never, void>())
        .bind("hub", () => Hub.bounded<number>(10))
        .bind("subscriber1", ({ hub, promise1, promise3 }) =>
          hub
            .subscribe()
            .use(
              (subscription) =>
                promise1.succeed(undefined) >
                promise3.await() >
                Effect.forEach(as, () => subscription.take())
            )
            .fork()
        )
        .bind("subscriber2", ({ hub, promise1, promise2, promise3 }) =>
          hub
            .subscribe()
            .use(
              (subscription) =>
                promise2.succeed(undefined) >
                promise3.await() >
                Effect.forEach(as, () => subscription.take())
            )
            .fork()
        )
        .tap(({ promise1 }) => promise1.await())
        .tap(({ promise2 }) => promise2.await())
        .tap(({ hub }) => Effect.forEach(as, (n) => hub.publish(n)))
        .tap(({ promise3 }) => promise3.succeed(undefined))
        .bind("v1", ({ subscriber1 }) => subscriber1.join())
        .bind("v2", ({ subscriber2 }) => subscriber2.join())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1.toArray()).toEqual(as.toArray())
      expect(v2.toArray()).toEqual(as.toArray())
    })
  })

  describe("concurrent publishers and subscribers", () => {
    describe("back pressure", () => {
      it("one to one", async () => {
        const as = List.range(0, 64)
        const program = Effect.Do()
          .bind("promise", () => Promise.make<never, void>())
          .bind("hub", () => Hub.bounded<number>(64))
          .bind("subscriber", ({ hub, promise }) =>
            hub
              .subscribe()
              .use(
                (subscription) =>
                  promise.succeed(undefined) >
                  Effect.forEach(as, () => subscription.take())
              )
              .fork()
          )
          .tap(({ promise }) => promise.await())
          .tap(({ hub }) => Effect.forEach(as, (n) => hub.publish(n)).fork())
          .flatMap(({ subscriber }) => subscriber.join())

        const result = await program.unsafeRunPromise()

        expect(result.toArray()).toEqual(as.toArray())
      })

      it("one to many", async () => {
        const as = List.range(0, 64)
        const program = Effect.Do()
          .bind("promise1", () => Promise.make<never, void>())
          .bind("promise2", () => Promise.make<never, void>())
          .bind("hub", () => Hub.bounded<number>(64))
          .bind("subscriber1", ({ hub, promise1 }) =>
            hub
              .subscribe()
              .use(
                (subscription) =>
                  promise1.succeed(undefined) >
                  Effect.forEach(as, () => subscription.take())
              )
              .fork()
          )
          .bind("subscriber2", ({ hub, promise2 }) =>
            hub
              .subscribe()
              .use(
                (subscription) =>
                  promise2.succeed(undefined) >
                  Effect.forEach(as, () => subscription.take())
              )
              .fork()
          )
          .tap(({ promise1 }) => promise1.await())
          .tap(({ promise2 }) => promise2.await())
          .tap(({ hub }) => Effect.forEach(as, (n) => hub.publish(n)).fork())
          .bind("v1", ({ subscriber1 }) => subscriber1.join())
          .bind("v2", ({ subscriber2 }) => subscriber2.join())

        const { v1, v2 } = await program.unsafeRunPromise()

        expect(v1.toArray()).toEqual(as.toArray())
        expect(v2.toArray()).toEqual(as.toArray())
      })

      it("many to many", async () => {
        const as = List.range(1, 65)
        const program = Effect.Do()
          .bind("promise1", () => Promise.make<never, void>())
          .bind("promise2", () => Promise.make<never, void>())
          .bind("hub", () => Hub.bounded<number>(64 * 2))
          .bind("subscriber1", ({ hub, promise1 }) =>
            hub
              .subscribe()
              .use(
                (subscription) =>
                  promise1.succeed(undefined) >
                  Effect.forEach(as + as, () => subscription.take())
              )
              .fork()
          )
          .bind("subscriber2", ({ hub, promise2 }) =>
            hub
              .subscribe()
              .use(
                (subscription) =>
                  promise2.succeed(undefined) >
                  Effect.forEach(as + as, () => subscription.take())
              )
              .fork()
          )
          .tap(({ promise1 }) => promise1.await())
          .tap(({ promise2 }) => promise2.await())
          .bind("fiber", ({ hub }) => Effect.forEach(as, (n) => hub.publish(n)).fork())
          .tap(({ hub }) =>
            Effect.forEach(
              as.map((n) => -n),
              (n) => hub.publish(n)
            ).fork()
          )
          .bind("v1", ({ subscriber1 }) => subscriber1.join())
          .bind("v2", ({ subscriber2 }) => subscriber2.join())
          .tap(({ fiber }) => fiber.join())

        const { v1, v2 } = await program.unsafeRunPromise()

        expect(v1.filter((n) => n > 0).toArray()).toEqual(as.toArray())
        expect(v1.filter((n) => n < 0).toArray()).toEqual(as.map((n) => -n).toArray())
        expect(v2.filter((n) => n > 0).toArray()).toEqual(as.toArray())
        expect(v2.filter((n) => n < 0).toArray()).toEqual(as.map((n) => -n).toArray())
      })
    })

    describe("dropping", () => {
      it("one to one", async () => {
        const as = List.range(0, 64)
        const program = Effect.Do()
          .bind("promise", () => Promise.make<never, void>())
          .bind("hub", () => Hub.dropping<number>(64))
          .bind("subscriber", ({ hub, promise }) =>
            hub
              .subscribe()
              .use(
                (subscription) =>
                  promise.succeed(undefined) >
                  Effect.forEach(as, () => subscription.take())
              )
              .fork()
          )
          .tap(({ promise }) => promise.await())
          .tap(({ hub }) => Effect.forEach(as, (n) => hub.publish(n)).fork())
          .flatMap(({ subscriber }) => subscriber.join())

        const result = await program.unsafeRunPromise()

        expect(result.toArray()).toEqual(as.toArray())
      })

      it("one to many", async () => {
        const as = List.range(0, 64)
        const program = Effect.Do()
          .bind("promise1", () => Promise.make<never, void>())
          .bind("promise2", () => Promise.make<never, void>())
          .bind("hub", () => Hub.dropping<number>(64))
          .bind("subscriber1", ({ hub, promise1 }) =>
            hub
              .subscribe()
              .use(
                (subscription) =>
                  promise1.succeed(undefined) >
                  Effect.forEach(as, () => subscription.take())
              )
              .fork()
          )
          .bind("subscriber2", ({ hub, promise2 }) =>
            hub
              .subscribe()
              .use(
                (subscription) =>
                  promise2.succeed(undefined) >
                  Effect.forEach(as, () => subscription.take())
              )
              .fork()
          )
          .tap(({ promise1 }) => promise1.await())
          .tap(({ promise2 }) => promise2.await())
          .tap(({ hub }) => Effect.forEach(as, (n) => hub.publish(n)).fork())
          .bind("v1", ({ subscriber1 }) => subscriber1.join())
          .bind("v2", ({ subscriber2 }) => subscriber2.join())

        const { v1, v2 } = await program.unsafeRunPromise()

        expect(v1.toArray()).toEqual(as.toArray())
        expect(v2.toArray()).toEqual(as.toArray())
      })

      it("many to many", async () => {
        const as = List.range(1, 65)
        const program = Effect.Do()
          .bind("promise1", () => Promise.make<never, void>())
          .bind("promise2", () => Promise.make<never, void>())
          .bind("hub", () => Hub.dropping<number>(64 * 2))
          .bind("subscriber1", ({ hub, promise1 }) =>
            hub
              .subscribe()
              .use(
                (subscription) =>
                  promise1.succeed(undefined) >
                  Effect.forEach(as + as, () => subscription.take())
              )
              .fork()
          )
          .bind("subscriber2", ({ hub, promise2 }) =>
            hub
              .subscribe()
              .use(
                (subscription) =>
                  promise2.succeed(undefined) >
                  Effect.forEach(as + as, () => subscription.take())
              )
              .fork()
          )
          .tap(({ promise1 }) => promise1.await())
          .tap(({ promise2 }) => promise2.await())
          .bind("fiber", ({ hub }) => Effect.forEach(as, (n) => hub.publish(n)).fork())
          .tap(({ hub }) =>
            Effect.forEach(
              as.map((n) => -n),
              (n) => hub.publish(n)
            ).fork()
          )
          .bind("v1", ({ subscriber1 }) => subscriber1.join())
          .bind("v2", ({ subscriber2 }) => subscriber2.join())
          .tap(({ fiber }) => fiber.join())

        const { v1, v2 } = await program.unsafeRunPromise()

        expect(v1.filter((n) => n > 0).toArray()).toEqual(as.toArray())
        expect(v1.filter((n) => n < 0).toArray()).toEqual(as.map((n) => -n).toArray())
        expect(v2.filter((n) => n > 0).toArray()).toEqual(as.toArray())
        expect(v2.filter((n) => n < 0).toArray()).toEqual(as.map((n) => -n).toArray())
      })
    })

    describe("sliding", () => {
      it("one to one", async () => {
        const as = List.range(0, 64)
        const program = Effect.Do()
          .bind("promise", () => Promise.make<never, void>())
          .bind("hub", () => Hub.sliding<number>(64))
          .bind("subscriber", ({ hub, promise }) =>
            hub
              .subscribe()
              .use(
                (subscription) =>
                  promise.succeed(undefined) >
                  Effect.forEach(as, () => subscription.take())
              )
              .fork()
          )
          .tap(({ promise }) => promise.await())
          .tap(({ hub }) => Effect.forEach(as, (n) => hub.publish(n)).fork())
          .flatMap(({ subscriber }) => subscriber.join())

        const result = await program.unsafeRunPromise()

        expect(result.toArray()).toEqual(as.toArray())
      })

      it("one to many", async () => {
        const as = List.range(0, 64)
        const program = Effect.Do()
          .bind("promise1", () => Promise.make<never, void>())
          .bind("promise2", () => Promise.make<never, void>())
          .bind("hub", () => Hub.sliding<number>(64))
          .bind("subscriber1", ({ hub, promise1 }) =>
            hub
              .subscribe()
              .use(
                (subscription) =>
                  promise1.succeed(undefined) >
                  Effect.forEach(as, () => subscription.take())
              )
              .fork()
          )
          .bind("subscriber2", ({ hub, promise2 }) =>
            hub
              .subscribe()
              .use(
                (subscription) =>
                  promise2.succeed(undefined) >
                  Effect.forEach(as, () => subscription.take())
              )
              .fork()
          )
          .tap(({ promise1 }) => promise1.await())
          .tap(({ promise2 }) => promise2.await())
          .tap(({ hub }) => Effect.forEach(as, (n) => hub.publish(n)).fork())
          .bind("v1", ({ subscriber1 }) => subscriber1.join())
          .bind("v2", ({ subscriber2 }) => subscriber2.join())

        const { v1, v2 } = await program.unsafeRunPromise()

        expect(v1.toArray()).toEqual(as.toArray())
        expect(v2.toArray()).toEqual(as.toArray())
      })

      it("many to many", async () => {
        const as = List.range(1, 65)
        const program = Effect.Do()
          .bind("promise1", () => Promise.make<never, void>())
          .bind("promise2", () => Promise.make<never, void>())
          .bind("hub", () => Hub.sliding<number>(64 * 2))
          .bind("subscriber1", ({ hub, promise1 }) =>
            hub
              .subscribe()
              .use(
                (subscription) =>
                  promise1.succeed(undefined) >
                  Effect.forEach(as + as, () => subscription.take())
              )
              .fork()
          )
          .bind("subscriber2", ({ hub, promise2 }) =>
            hub
              .subscribe()
              .use(
                (subscription) =>
                  promise2.succeed(undefined) >
                  Effect.forEach(as + as, () => subscription.take())
              )
              .fork()
          )
          .tap(({ promise1 }) => promise1.await())
          .tap(({ promise2 }) => promise2.await())
          .bind("fiber", ({ hub }) => Effect.forEach(as, (n) => hub.publish(n)).fork())
          .tap(({ hub }) =>
            Effect.forEach(
              as.map((n) => -n),
              (n) => hub.publish(n)
            ).fork()
          )
          .bind("v1", ({ subscriber1 }) => subscriber1.join())
          .bind("v2", ({ subscriber2 }) => subscriber2.join())
          .tap(({ fiber }) => fiber.join())

        const { v1, v2 } = await program.unsafeRunPromise()

        expect(v1.filter((n) => n > 0).toArray()).toEqual(as.toArray())
        expect(v1.filter((n) => n < 0).toArray()).toEqual(as.map((n) => -n).toArray())
        expect(v2.filter((n) => n > 0).toArray()).toEqual(as.toArray())
        expect(v2.filter((n) => n < 0).toArray()).toEqual(as.map((n) => -n).toArray())
      })
    })

    describe("unbounded", () => {
      it("one to one", async () => {
        const as = List.range(0, 64)
        const program = Effect.Do()
          .bind("promise", () => Promise.make<never, void>())
          .bind("hub", () => Hub.unbounded<number>())
          .bind("subscriber", ({ hub, promise }) =>
            hub
              .subscribe()
              .use(
                (subscription) =>
                  promise.succeed(undefined) >
                  Effect.forEach(as, () => subscription.take())
              )
              .fork()
          )
          .tap(({ promise }) => promise.await())
          .tap(({ hub }) => Effect.forEach(as, (n) => hub.publish(n)).fork())
          .flatMap(({ subscriber }) => subscriber.join())

        const result = await program.unsafeRunPromise()

        expect(result.toArray()).toEqual(as.toArray())
      })

      it("one to many", async () => {
        const as = List.range(0, 64)
        const program = Effect.Do()
          .bind("promise1", () => Promise.make<never, void>())
          .bind("promise2", () => Promise.make<never, void>())
          .bind("hub", () => Hub.unbounded<number>())
          .bind("subscriber1", ({ hub, promise1 }) =>
            hub
              .subscribe()
              .use(
                (subscription) =>
                  promise1.succeed(undefined) >
                  Effect.forEach(as, () => subscription.take())
              )
              .fork()
          )
          .bind("subscriber2", ({ hub, promise2 }) =>
            hub
              .subscribe()
              .use(
                (subscription) =>
                  promise2.succeed(undefined) >
                  Effect.forEach(as, () => subscription.take())
              )
              .fork()
          )
          .tap(({ promise1 }) => promise1.await())
          .tap(({ promise2 }) => promise2.await())
          .tap(({ hub }) => Effect.forEach(as, (n) => hub.publish(n)).fork())
          .bind("v1", ({ subscriber1 }) => subscriber1.join())
          .bind("v2", ({ subscriber2 }) => subscriber2.join())

        const { v1, v2 } = await program.unsafeRunPromise()

        expect(v1.toArray()).toEqual(as.toArray())
        expect(v2.toArray()).toEqual(as.toArray())
      })

      it("many to many", async () => {
        const as = List.range(1, 65)
        const program = Effect.Do()
          .bind("promise1", () => Promise.make<never, void>())
          .bind("promise2", () => Promise.make<never, void>())
          .bind("hub", () => Hub.unbounded<number>())
          .bind("subscriber1", ({ hub, promise1 }) =>
            hub
              .subscribe()
              .use(
                (subscription) =>
                  promise1.succeed(undefined) >
                  Effect.forEach(as + as, () => subscription.take())
              )
              .fork()
          )
          .bind("subscriber2", ({ hub, promise2 }) =>
            hub
              .subscribe()
              .use(
                (subscription) =>
                  promise2.succeed(undefined) >
                  Effect.forEach(as + as, () => subscription.take())
              )
              .fork()
          )
          .tap(({ promise1 }) => promise1.await())
          .tap(({ promise2 }) => promise2.await())
          .bind("fiber", ({ hub }) => Effect.forEach(as, (n) => hub.publish(n)).fork())
          .tap(({ hub }) =>
            Effect.forEach(
              as.map((n) => -n),
              (n) => hub.publish(n)
            ).fork()
          )
          .bind("v1", ({ subscriber1 }) => subscriber1.join())
          .bind("v2", ({ subscriber2 }) => subscriber2.join())
          .tap(({ fiber }) => fiber.join())

        const { v1, v2 } = await program.unsafeRunPromise()

        expect(v1.filter((n) => n > 0).toArray()).toEqual(as.toArray())
        expect(v1.filter((n) => n < 0).toArray()).toEqual(as.map((n) => -n).toArray())
        expect(v2.filter((n) => n > 0).toArray()).toEqual(as.toArray())
        expect(v2.filter((n) => n < 0).toArray()).toEqual(as.map((n) => -n).toArray())
      })
    })
  })
})
