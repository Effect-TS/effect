import { assert, describe, it } from "@effect/vitest"
import { Array, Cause, Channel, Effect, type Pull, Result, Stream } from "effect"

describe("splitLines completed CR delivery", () => {
  const failure = "upstream failed"

  for (
    const [name, text] of [
      ["LF", "ready\n"],
      ["CRLF", "ready\r\n"],
      ["CR followed by text", "ready\rmore"],
      ["final CR", "ready\r"]
    ] as const
  ) {
    it.effect(`take(1) returns the complete line before failure: ${name}`, () =>
      Effect.gen(function*() {
        const result = yield* Stream.succeed(text).pipe(
          Stream.concat(Stream.fail(failure)),
          Stream.splitLines,
          Stream.take(1),
          Stream.runCollect,
          Effect.result
        )
        assert.deepStrictEqual(result, Result.succeed(["ready"]))
      }))

    it.effect(`emits the complete line before recovery: ${name}`, () =>
      Effect.gen(function*() {
        const result = yield* Stream.succeed(text).pipe(
          Stream.concat(Stream.fail(failure)),
          Stream.splitLines,
          Stream.catch(() => Stream.succeed("<recovered>")),
          Stream.runCollect
        )
        assert.deepStrictEqual(result, ["ready", "<recovered>"])
      }))

    it.effect(`take(1) does not pull past a completed line: ${name}`, () =>
      Effect.gen(function*() {
        let pulls = 0
        const source = Stream.fromPull(Effect.sync(() =>
          Effect.suspend((): Pull.Pull<Array.NonEmptyReadonlyArray<string>, string> => {
            pulls++
            return pulls === 1 ? Effect.succeed([text]) : Effect.fail(failure)
          })
        ))
        const result = yield* source.pipe(Stream.splitLines, Stream.take(1), Stream.runCollect, Effect.result)
        assert.deepStrictEqual({ pulls, result }, { pulls: 1, result: Result.succeed(["ready"]) })
      }))

    it.effect(`preserves the source error after emitting the complete line: ${name}`, () =>
      Effect.gen(function*() {
        const seen: Array<string> = []
        const error = { source: failure }
        const result = yield* Stream.succeed(text).pipe(
          Stream.concat(Stream.fail(error)),
          Stream.splitLines,
          Stream.runForEach((line) => Effect.sync(() => seen.push(line))),
          Effect.flip
        )
        assert.strictEqual(result, error)
        assert.deepStrictEqual(seen, ["ready"])
      }))
  }

  for (const fragments of [["ready\r"], ["rea", "dy\r"], ["ready", "\r"], ["", "ready\r", "", ""]]) {
    for (const layout of ["same array", "separate arrays"] as const) {
      it.effect(`delivers final CR across ${JSON.stringify(fragments)}, ${layout}`, () =>
        Effect.gen(function*() {
          const arrays = layout === "same array" ? [fragments] : fragments.map((s) => [s])
          const result = yield* Stream.fromArrays([], ...arrays, []).pipe(
            Stream.concat(Stream.fail(failure)),
            Stream.splitLines,
            Stream.take(1),
            Stream.runCollect,
            Effect.result
          )
          assert.deepStrictEqual(result, Result.succeed(["ready"]))
        }))
    }
  }

  for (const fragments of [["ready"], ["rea", "", "dy"], ["", "", ""]]) {
    it.effect(`does not flush incomplete text on failure: ${JSON.stringify(fragments)}`, () =>
      Effect.gen(function*() {
        const seen: Array<string> = []
        const result = yield* Stream.fromArrays(...fragments.map((s) => [s])).pipe(
          Stream.concat(Stream.fail(failure)),
          Stream.splitLines,
          Stream.runForEach((line) => Effect.sync(() => seen.push(line))),
          Effect.flip
        )
        assert.strictEqual(result, failure)
        assert.deepStrictEqual(seen, [])
      }))
  }

  it.effect("delivers the complete line through Channel.splitLines directly", () =>
    Effect.gen(function*() {
      const pull = yield* Channel.succeed(Array.of("ready\r")).pipe(
        Channel.concat(Channel.fail(failure)),
        Channel.pipeTo(Channel.splitLines()),
        Channel.toPull
      )
      assert.deepStrictEqual(yield* Effect.result(pull), Result.succeed(Array.of("ready")))
    }))

  it.effect("Channel pulls lazily across a CRLF seam and preserves the following error", () =>
    Effect.gen(function*() {
      const error = { source: failure }
      let pulls = 0
      const pull = yield* Channel.fromPull(Effect.succeed(
        Effect.suspend((): Pull.Pull<Array.NonEmptyReadonlyArray<string>, typeof error> => {
          pulls++
          if (pulls === 1) return Effect.succeed(["first\r"])
          if (pulls === 2) return Effect.succeed(["", "", "\nsecond\r", "", ""])
          return Effect.fail(error)
        })
      )).pipe(Channel.pipeTo(Channel.splitLines()), Channel.toPull)
      assert.strictEqual(pulls, 0)
      assert.deepStrictEqual(yield* pull, ["first"])
      assert.strictEqual(pulls, 1)
      assert.deepStrictEqual(yield* pull, ["second"])
      assert.strictEqual(pulls, 2)
      assert.strictEqual(yield* Effect.flip(pull), error)
      assert.strictEqual(pulls, 3)
    }))

  it.effect("Channel caches a non-void Done after a CR-terminated line", () =>
    Effect.gen(function*() {
      const done = { finished: true }
      let pulls = 0
      const pull = yield* Channel.fromPull(Effect.succeed(
        Effect.suspend((): Pull.Pull<Array.NonEmptyReadonlyArray<string>, string, typeof done> => {
          pulls++
          if (pulls === 1) return Effect.succeed(["ready\r"])
          if (pulls === 2) return Cause.done(done)
          return Effect.fail("pulled after done")
        })
      )).pipe(Channel.pipeTo(Channel.splitLines()), Channel.toPull)
      assert.deepStrictEqual(yield* pull, ["ready"])
      const expected = yield* Effect.exit(Cause.done(done))
      assert.deepStrictEqual(yield* Effect.exit(pull), expected)
      assert.deepStrictEqual(yield* Effect.exit(pull), expected)
      assert.strictEqual(pulls, 2)
    }))

  for (
    const [fragments, expected] of [
      [["ready\r", "", "\n"], ["ready"]],
      [["ready\r", "", "next"], ["ready"]],
      [["\r"], [""]],
      [["ready\r", "\r"], ["ready", ""]]
    ] as const
  ) {
    it.effect(`preserves exactly the complete lines before recovery: ${JSON.stringify(fragments)}`, () =>
      Effect.gen(function*() {
        const result = yield* Stream.fromArrays(...fragments.flatMap((s) => [[s], []])).pipe(
          Stream.concat(Stream.fail(failure)),
          Stream.splitLines,
          Stream.catch(() => Stream.succeed("<recovered>")),
          Stream.runCollect
        )
        assert.deepStrictEqual(result, [...expected, "<recovered>"])
      }))
  }

  for (
    const [fragments, expected] of [
      [[], []],
      [[""], []],
      [["\r"], [""]],
      [["\r", "\r"], ["", ""]],
      [["ready\r"], ["ready"]],
      [["ready\r", "", "\n"], ["ready"]],
      [["ready\r", "", "more"], ["ready", "more"]],
      [["ready\r", "", "\r"], ["ready", ""]],
      [["a\r", "", "\nb\r", "", "\n"], ["a", "b"]],
      [["a\r", "", "\n\r", "", "\n"], ["a", ""]],
      [["a\r", "", "\n\nb"], ["a", "", "b"]],
      [["ready"], ["ready"]]
    ] as const
  ) {
    it.effect(`normal completion does not duplicate or drop lines: ${JSON.stringify(fragments)}`, () =>
      Effect.gen(function*() {
        const stream = Stream.fromArrays([], ...fragments.flatMap((s) => [[s], []]), []).pipe(Stream.splitLines)
        assert.deepStrictEqual(yield* Stream.runCollect(stream), [...expected])
        assert.deepStrictEqual(yield* Stream.runCollect(stream), [...expected])
      }))
  }

  for (
    const [text, expected] of [["ready\r", ["ready"]], ["\r", [""]], ["ready\r\n", ["ready"]], ["ready", [
      "ready"
    ]]] as const
  ) {
    it.effect(`does not repull after normal completion: ${JSON.stringify(text)}`, () =>
      Effect.gen(function*() {
        let pulls = 0
        const source = Stream.fromPull(Effect.sync(() =>
          Effect.suspend((): Pull.Pull<Array.NonEmptyReadonlyArray<string>, string> => {
            pulls++
            if (pulls === 1) return Effect.succeed([text])
            if (pulls === 2) return Cause.done()
            return Effect.fail("pulled after done")
          })
        ))
        const pull = yield* source.pipe(Stream.splitLines, Stream.toPull)
        assert.deepStrictEqual(yield* pull, expected)
        const firstDone = yield* Effect.exit(pull)
        const secondDone = yield* Effect.exit(pull)
        assert.deepStrictEqual(firstDone, yield* Effect.exit(Cause.done()))
        assert.deepStrictEqual(secondDone, firstDone)
        assert.strictEqual(pulls, 2)
      }))
  }

  it.effect("preserves normal-completion results across all short text and delimiter partitions", () =>
    Effect.gen(function*() {
      const texts = [""]
      let layer = [""]
      for (let size = 1; size <= 4; size++) {
        layer = layer.flatMap((s) => [s + "a", s + "\r", s + "\n"])
        texts.push(...layer)
      }
      let cases = 0
      for (const text of texts) {
        const expected = text === "" ? [] : text.split(/\r\n|\r|\n/)
        if (/[\r\n]$/.test(text)) expected.pop()
        for (let mask = 0; mask < 2 ** Math.max(0, text.length - 1); mask++) {
          const fragments = [""]
          for (let i = 0; i < text.length; i++) {
            if (i > 0 && (mask & (1 << (i - 1))) !== 0) fragments.push("")
            fragments[fragments.length - 1] += text[i]
          }
          for (const arrays of [[fragments], fragments.flatMap((s) => [[s], [], [""]])]) {
            const result = yield* Stream.fromArrays(...arrays).pipe(Stream.splitLines, Stream.runCollect)
            assert.deepStrictEqual(result, expected, JSON.stringify({ text, arrays }))
            cases++
          }
        }
      }
      assert.strictEqual(cases, 1556)
    }))
})
