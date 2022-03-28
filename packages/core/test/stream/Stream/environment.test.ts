import type { Has } from "../../../src/data/Has"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Layer } from "../../../src/io/Layer"
import { Managed } from "../../../src/io/Managed"
import { Stream } from "../../../src/stream/Stream"
import { NumberService } from "./test-utils"

describe("Stream", () => {
  describe("environment", () => {
    it("simple example", async () => {
      const program = Stream.environment<string>().provideEnvironment("test").runHead()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some("test"))
    })
  })

  describe("environmentWith", () => {
    it("simple example", async () => {
      const program = Stream.environmentWith((r: string) => r)
        .provideEnvironment("test")
        .runHead()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some("test"))
    })
  })

  describe("environmentWithEffect", () => {
    it("simple example", async () => {
      const program = Stream.environmentWithEffect((r: Has<NumberService>) =>
        Effect.succeed(NumberService.read(r))
      )
        .provideEnvironment(NumberService.has({ n: 10 }))
        .runHead().some

      const result = await program.unsafeRunPromise()

      expect(result.n).toEqual(10)
    })

    it("environmentWithZIO fails", async () => {
      const program = Stream.environmentWithEffect((r: Has<NumberService>) =>
        Effect.fail("fail")
      )
        .provideEnvironment(NumberService.has({ n: 10 }))
        .runHead()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("fail"))
    })
  })

  describe("environmentWithStream", () => {
    it("environmentWithStream", async () => {
      const program = Stream.environmentWithStream((r: Has<NumberService>) =>
        Stream.succeed(NumberService.read(r))
      )
        .provideEnvironment(NumberService.has({ n: 10 }))
        .runHead().some

      const result = await program.unsafeRunPromise()

      expect(result.n).toEqual(10)
    })

    it("environmentWithStream fails", async () => {
      const program = Stream.environmentWithStream((r: Has<NumberService>) =>
        Stream.fail("fail")
      )
        .provideEnvironment(NumberService.has({ n: 10 }))
        .runHead()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("fail"))
    })
  })

  describe("provideLayer", () => {
    it("simple example", async () => {
      const program = Stream.managed(Managed.service(NumberService))
        .provideLayer(Layer.succeed(NumberService.has({ n: 10 })))
        .runHead()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some({ n: 10 }))
    })
  })
})
