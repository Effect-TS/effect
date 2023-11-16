import * as Args from "@effect/cli/Args"
import * as CliConfig from "@effect/cli/CliConfig"
import * as Command from "@effect/cli/Command"
import * as Compgen from "@effect/cli/Compgen"
import * as Completion from "@effect/cli/Completion"
import * as Options from "@effect/cli/Options"
import * as Tail from "@effect/cli/test/utils/tail"
import * as WordCount from "@effect/cli/test/utils/wc"
import * as FileSystem from "@effect/platform-node/FileSystem"
import * as NodeContext from "@effect/platform-node/NodeContext"
import * as Path from "@effect/platform-node/Path"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Order from "effect/Order"
import * as ReadonlyArray from "effect/ReadonlyArray"
import { describe, expect, it } from "vitest"

const MainLive = Layer.provideMerge(NodeContext.layer, Compgen.layer)

const runEffect = <E, A>(
  self: Effect.Effect<Compgen.Compgen | NodeContext.NodeContext, E, A>
): Promise<A> => Effect.provide(self, MainLive).pipe(Effect.runPromise)

describe("Completion", () => {
  it("a different command name in the arguments list should not affect completion", () =>
    Effect.gen(function*(_) {
      const words = ReadonlyArray.make("foo-alias")
      const index = 1
      const command = Command.standard("foo", {
        args: Args.choice([["bar", 1], ["baz", 2], ["qux", 3]])
      })
      const config = CliConfig.defaultConfig
      const compgen = yield* _(Compgen.Compgen)
      const result = yield* _(Completion.getCompletions(words, index, command, config, compgen))
      const expected = ReadonlyArray.make("bar ", "baz ", "qux ")
      expect(result).toEqual(expected)
    }).pipe(runEffect))

  describe("Commands - No Options or Args", () => {
    it("should return no completions", () =>
      Effect.gen(function*(_) {
        const words = ReadonlyArray.of("true")
        const index = 1
        const command = Command.standard("true")
        const config = CliConfig.defaultConfig
        const compgen = yield* _(Compgen.Compgen)
        const result = yield* _(Completion.getCompletions(words, index, command, config, compgen))
        expect(result).toEqual(ReadonlyArray.empty())
      }).pipe(runEffect))
  })

  describe("Commands - No Options, Single Args", () => {
    describe("Boolean Primitives", () => {
      it("no partial word should complete with 'false' and 'true'", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo")
          const index = 1
          const command = Command.standard("foo", { args: Args.boolean() })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(Completion.getCompletions(words, index, command, config, compgen))
          const expected = ReadonlyArray.make("false ", "true ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("partial word 'f' should complete with 'false'", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "f")
          const index = 1
          const command = Command.standard("foo", { args: Args.boolean() })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(Completion.getCompletions(words, index, command, config, compgen))
          const expected = ReadonlyArray.make("false ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("partial word 't' should complete with 'true'", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "t")
          const index = 1
          const command = Command.standard("foo", { args: Args.boolean() })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(Completion.getCompletions(words, index, command, config, compgen))
          const expected = ReadonlyArray.make("true ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("partial word 'true' should return 'true'", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "true")
          const index = 1
          const command = Command.standard("foo", { args: Args.boolean() })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(Completion.getCompletions(words, index, command, config, compgen))
          const expected = ReadonlyArray.make("true ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("partial word 'false' should return 'false'", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "false")
          const index = 1
          const command = Command.standard("foo", { args: Args.boolean() })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(Completion.getCompletions(words, index, command, config, compgen))
          const expected = ReadonlyArray.make("false ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("partial word 'x' should return no completions", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "x")
          const index = 1
          const command = Command.standard("foo", { args: Args.boolean() })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(Completion.getCompletions(words, index, command, config, compgen))
          const expected = ReadonlyArray.empty()
          expect(result).toEqual(expected)
        }).pipe(runEffect))
    })

    describe("Choice Primitives", () => {
      it("no partial word should return the complete list of choices", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo")
          const index = 1
          const command = Command.standard("foo", {
            args: Args.choice([["bar", 1], ["baz", 2], ["bippy", 3]])
          })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(Completion.getCompletions(words, index, command, config, compgen))
          const expected = ReadonlyArray.make("bar ", "baz ", "bippy ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("partial word 'b' should complete with 'bar', 'baz', and 'bippy'", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "b")
          const index = 1
          const command = Command.standard("foo", {
            args: Args.choice([["bar", 1], ["baz", 2], ["bippy", 3]])
          })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(Completion.getCompletions(words, index, command, config, compgen))
          const expected = ReadonlyArray.make("bar ", "baz ", "bippy ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("partial word 'ba' should complete with 'bar' and 'baz'", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "ba")
          const index = 1
          const command = Command.standard("foo", {
            args: Args.choice([["bar", 1], ["baz", 2], ["bippy", 3]])
          })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(Completion.getCompletions(words, index, command, config, compgen))
          const expected = ReadonlyArray.make("bar ", "baz ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("partial word 'baz' should return 'baz'", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "baz")
          const index = 1
          const command = Command.standard("foo", {
            args: Args.choice([["bar", 1], ["baz", 2], ["bippy", 3]])
          })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(Completion.getCompletions(words, index, command, config, compgen))
          const expected = ReadonlyArray.make("baz ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))
    })

    describe("Float Primitives", () => {
      it("no partial word should return no completions", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo")
          const index = 1
          const command = Command.standard("foo", { args: Args.float() })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(Completion.getCompletions(words, index, command, config, compgen))
          const expected = ReadonlyArray.empty()
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("partial word '32.6' should return no completions", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "32.6")
          const index = 1
          const command = Command.standard("foo", { args: Args.float() })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(Completion.getCompletions(words, index, command, config, compgen))
          const expected = ReadonlyArray.empty()
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("partial word 'x' should return no completions", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "x")
          const index = 1
          const command = Command.standard("foo", { args: Args.float() })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(Completion.getCompletions(words, index, command, config, compgen))
          const expected = ReadonlyArray.empty()
          expect(result).toEqual(expected)
        }).pipe(runEffect))
    })

    describe("Path Primitives", () => {
      it("Args.file, no prefix provided", () =>
        Effect.gen(function*(_) {
          const path = yield* _(Path.Path)
          const fileSystem = yield* _(FileSystem.FileSystem)
          const tempDir = yield* _(fileSystem.makeTempDirectoryScoped())
          yield* _(Effect.all([
            fileSystem.writeFile(path.join(tempDir, "foo.txt"), new Uint8Array()),
            fileSystem.writeFile(path.join(tempDir, "bar.pdf"), new Uint8Array()),
            fileSystem.writeFile(path.join(tempDir, "bippy.sh"), new Uint8Array()),
            fileSystem.makeDirectory(path.join(tempDir, "fooDir")),
            fileSystem.makeDirectory(path.join(tempDir, "barDir")),
            fileSystem.makeDirectory(path.join(tempDir, "bippyDir"))
          ]))
          yield* _(
            Effect.gen(function*(_) {
              const words = ReadonlyArray.make("program")
              const index = 1
              const command = Command.standard("foo", { args: Args.file() })
              const config = CliConfig.defaultConfig
              const compgen = yield* _(Compgen.Compgen)
              const result = yield* _(
                Completion.getCompletions(words, index, command, config, compgen),
                Effect.map(ReadonlyArray.sort(Order.string))
              )
              const expected = [
                "bar.pdf ",
                "barDir/",
                "bippy.sh ",
                "bippyDir/",
                "foo.txt ",
                "fooDir/"
              ]
              expect(result).toEqual(expected)
            }).pipe(Effect.provide(Compgen.testLayer(tempDir)))
          )
        }).pipe(Effect.scoped, runEffect))

      it("Args.file, prefix provided", () =>
        Effect.gen(function*(_) {
          const path = yield* _(Path.Path)
          const fileSystem = yield* _(FileSystem.FileSystem)
          const tempDir = yield* _(fileSystem.makeTempDirectoryScoped())
          yield* _(Effect.all([
            fileSystem.writeFile(path.join(tempDir, "foo.txt"), new Uint8Array()),
            fileSystem.writeFile(path.join(tempDir, "bar.pdf"), new Uint8Array()),
            fileSystem.writeFile(path.join(tempDir, "bippy.sh"), new Uint8Array()),
            fileSystem.makeDirectory(path.join(tempDir, "fooDir")),
            fileSystem.makeDirectory(path.join(tempDir, "barDir")),
            fileSystem.makeDirectory(path.join(tempDir, "bippyDir"))
          ]))
          yield* _(
            Effect.gen(function*(_) {
              const words = ReadonlyArray.make("program", "f")
              const index = 1
              const command = Command.standard("foo", { args: Args.file() })
              const config = CliConfig.defaultConfig
              const compgen = yield* _(Compgen.Compgen)
              const result = yield* _(
                Completion.getCompletions(words, index, command, config, compgen),
                Effect.map(ReadonlyArray.sort(Order.string))
              )
              const expected = ["foo.txt ", "fooDir/"]
              expect(result).toEqual(expected)
            }).pipe(Effect.provide(Compgen.testLayer(tempDir)))
          )
        }).pipe(Effect.scoped, runEffect))

      it("Args.file, complete file name provided", () =>
        Effect.gen(function*(_) {
          const path = yield* _(Path.Path)
          const fileSystem = yield* _(FileSystem.FileSystem)
          const tempDir = yield* _(fileSystem.makeTempDirectoryScoped())
          yield* _(Effect.all([
            fileSystem.writeFile(path.join(tempDir, "foo.txt"), new Uint8Array()),
            fileSystem.writeFile(path.join(tempDir, "bar.pdf"), new Uint8Array()),
            fileSystem.writeFile(path.join(tempDir, "bippy.sh"), new Uint8Array()),
            fileSystem.makeDirectory(path.join(tempDir, "fooDir")),
            fileSystem.makeDirectory(path.join(tempDir, "barDir")),
            fileSystem.makeDirectory(path.join(tempDir, "bippyDir"))
          ]))
          yield* _(
            Effect.gen(function*(_) {
              const words = ReadonlyArray.make("program", "foo.txt")
              const index = 1
              const command = Command.standard("foo", { args: Args.file() })
              const config = CliConfig.defaultConfig
              const compgen = yield* _(Compgen.Compgen)
              const result = yield* _(
                Completion.getCompletions(words, index, command, config, compgen),
                Effect.map(ReadonlyArray.sort(Order.string))
              )
              const expected = ["foo.txt "]
              expect(result).toEqual(expected)
            }).pipe(Effect.provide(Compgen.testLayer(tempDir)))
          )
        }).pipe(Effect.scoped, runEffect))

      it("Args.file, prefix of non-existent file should return no completions", () =>
        Effect.gen(function*(_) {
          const path = yield* _(Path.Path)
          const fileSystem = yield* _(FileSystem.FileSystem)
          const tempDir = yield* _(fileSystem.makeTempDirectoryScoped())
          yield* _(Effect.all([
            fileSystem.writeFile(path.join(tempDir, "foo.txt"), new Uint8Array()),
            fileSystem.writeFile(path.join(tempDir, "bar.pdf"), new Uint8Array()),
            fileSystem.writeFile(path.join(tempDir, "bippy.sh"), new Uint8Array()),
            fileSystem.makeDirectory(path.join(tempDir, "fooDir")),
            fileSystem.makeDirectory(path.join(tempDir, "barDir")),
            fileSystem.makeDirectory(path.join(tempDir, "bippyDir"))
          ]))
          yield* _(
            Effect.gen(function*(_) {
              const words = ReadonlyArray.make("program", "does-not-exist")
              const index = 1
              const command = Command.standard("foo", { args: Args.file() })
              const config = CliConfig.defaultConfig
              const compgen = yield* _(Compgen.Compgen)
              const result = yield* _(
                Completion.getCompletions(words, index, command, config, compgen),
                Effect.map(ReadonlyArray.sort(Order.string))
              )
              const expected = ReadonlyArray.empty()
              expect(result).toEqual(expected)
            }).pipe(Effect.provide(Compgen.testLayer(tempDir)))
          )
        }).pipe(Effect.scoped, runEffect))

      it("Args.directory, no prefix provided", () =>
        Effect.gen(function*(_) {
          const path = yield* _(Path.Path)
          const fileSystem = yield* _(FileSystem.FileSystem)
          const tempDir = yield* _(fileSystem.makeTempDirectoryScoped())
          yield* _(Effect.all([
            fileSystem.writeFile(path.join(tempDir, "foo.txt"), new Uint8Array()),
            fileSystem.writeFile(path.join(tempDir, "bar.pdf"), new Uint8Array()),
            fileSystem.writeFile(path.join(tempDir, "bippy.sh"), new Uint8Array()),
            fileSystem.makeDirectory(path.join(tempDir, "fooDir")),
            fileSystem.makeDirectory(path.join(tempDir, "barDir")),
            fileSystem.makeDirectory(path.join(tempDir, "bippyDir"))
          ]))
          yield* _(
            Effect.gen(function*(_) {
              const words = ReadonlyArray.make("program")
              const index = 1
              const command = Command.standard("foo", { args: Args.directory() })
              const config = CliConfig.defaultConfig
              const compgen = yield* _(Compgen.Compgen)
              const result = yield* _(
                Completion.getCompletions(words, index, command, config, compgen),
                Effect.map(ReadonlyArray.sort(Order.string))
              )
              const expected = ReadonlyArray.make("barDir/", "bippyDir/", "fooDir/")
              expect(result).toEqual(expected)
            }).pipe(Effect.provide(Compgen.testLayer(tempDir)))
          )
        }).pipe(Effect.scoped, runEffect))

      it("Args.directory, prefix provided", () =>
        Effect.gen(function*(_) {
          const path = yield* _(Path.Path)
          const fileSystem = yield* _(FileSystem.FileSystem)
          const tempDir = yield* _(fileSystem.makeTempDirectoryScoped())
          yield* _(Effect.all([
            fileSystem.writeFile(path.join(tempDir, "foo.txt"), new Uint8Array()),
            fileSystem.writeFile(path.join(tempDir, "bar.pdf"), new Uint8Array()),
            fileSystem.writeFile(path.join(tempDir, "bippy.sh"), new Uint8Array()),
            fileSystem.makeDirectory(path.join(tempDir, "fooDir")),
            fileSystem.makeDirectory(path.join(tempDir, "barDir")),
            fileSystem.makeDirectory(path.join(tempDir, "bippyDir"))
          ]))
          yield* _(
            Effect.gen(function*(_) {
              const words = ReadonlyArray.make("program", "f")
              const index = 1
              const command = Command.standard("foo", { args: Args.directory() })
              const config = CliConfig.defaultConfig
              const compgen = yield* _(Compgen.Compgen)
              const result = yield* _(
                Completion.getCompletions(words, index, command, config, compgen),
                Effect.map(ReadonlyArray.sort(Order.string))
              )
              const expected = ReadonlyArray.make("fooDir/")
              expect(result).toEqual(expected)
            }).pipe(Effect.provide(Compgen.testLayer(tempDir)))
          )
        }).pipe(Effect.scoped, runEffect))

      it("Args.directory, complete directory name provided", () =>
        Effect.gen(function*(_) {
          const path = yield* _(Path.Path)
          const fileSystem = yield* _(FileSystem.FileSystem)
          const tempDir = yield* _(fileSystem.makeTempDirectoryScoped())
          yield* _(Effect.all([
            fileSystem.writeFile(path.join(tempDir, "foo.txt"), new Uint8Array()),
            fileSystem.writeFile(path.join(tempDir, "bar.pdf"), new Uint8Array()),
            fileSystem.writeFile(path.join(tempDir, "bippy.sh"), new Uint8Array()),
            fileSystem.makeDirectory(path.join(tempDir, "fooDir")),
            fileSystem.makeDirectory(path.join(tempDir, "barDir")),
            fileSystem.makeDirectory(path.join(tempDir, "bippyDir"))
          ]))
          yield* _(
            Effect.gen(function*(_) {
              const words = ReadonlyArray.make("program", "fooDir")
              const index = 1
              const command = Command.standard("foo", { args: Args.directory() })
              const config = CliConfig.defaultConfig
              const compgen = yield* _(Compgen.Compgen)
              const result = yield* _(
                Completion.getCompletions(words, index, command, config, compgen),
                Effect.map(ReadonlyArray.sort(Order.string))
              )
              const expected = ReadonlyArray.make("fooDir/")
              expect(result).toEqual(expected)
            }).pipe(Effect.provide(Compgen.testLayer(tempDir)))
          )
        }).pipe(Effect.scoped, runEffect))
    })
  })

  describe("Commands - No Options, Multiple Args", () => {
    it("partial word 'baz' should return 'baz' and 'bazinga'", () =>
      Effect.gen(function*(_) {
        const words = ReadonlyArray.make("foo", "baz")
        const index = 1
        const command = Command.standard("foo", {
          args: Args.all([
            Args.choice([["bar", 1], ["baz", 2], ["bazinga", 3]]),
            Args.boolean()
          ])
        })
        const config = CliConfig.defaultConfig
        const compgen = yield* _(Compgen.Compgen)
        const result = yield* _(Completion.getCompletions(words, index, command, config, compgen))
        const expected = ReadonlyArray.make("baz ", "bazinga ")
        expect(result).toEqual(expected)
      }).pipe(runEffect))

    it("partial word 'tru' should return 'true'", () =>
      Effect.gen(function*(_) {
        const words = ReadonlyArray.make("foo", "baz", "tru")
        const index = 2
        const command = Command.standard("foo", {
          args: Args.all([
            Args.choice([["bar", 1], ["baz", 2], ["bazinga", 3]]),
            Args.boolean()
          ])
        })
        const config = CliConfig.defaultConfig
        const compgen = yield* _(Compgen.Compgen)
        const result = yield* _(Completion.getCompletions(words, index, command, config, compgen))
        const expected = ReadonlyArray.make("true ")
        expect(result).toEqual(expected)
      }).pipe(runEffect))

    it("completing ['foo', 'baz', 'tru'] at position 1 should complete with 'baz' and 'bazinga'", () =>
      Effect.gen(function*(_) {
        const words = ReadonlyArray.make("foo", "baz", "tru")
        const index = 1
        const command = Command.standard("foo", {
          args: Args.all([
            Args.choice([["bar", 1], ["baz", 2], ["bazinga", 3]]),
            Args.boolean()
          ])
        })
        const config = CliConfig.defaultConfig
        const compgen = yield* _(Compgen.Compgen)
        const result = yield* _(Completion.getCompletions(words, index, command, config, compgen))
        const expected = ReadonlyArray.make("baz ", "bazinga ")
        expect(result).toEqual(expected)
      }).pipe(runEffect))

    it("completing ['foo', 'x', 'tru'] at position 2 should return no completions ('x' is invalid)", () =>
      Effect.gen(function*(_) {
        const words = ReadonlyArray.make("foo", "x", "tru")
        const index = 2
        const command = Command.standard("foo", {
          args: Args.all([
            Args.choice([["bar", 1], ["baz", 2], ["bazinga", 3]]),
            Args.boolean()
          ])
        })
        const config = CliConfig.defaultConfig
        const compgen = yield* _(Compgen.Compgen)
        const result = yield* _(Completion.getCompletions(words, index, command, config, compgen))
        const expected = ReadonlyArray.empty()
        expect(result).toEqual(expected)
      }).pipe(runEffect))
  })

  describe("Command - Options, No Args", () => {
    describe("Boolean Options", () => {
      const options = Options.all([
        Options.boolean("a"),
        Options.boolean("b"),
        Options.boolean("c"),
        Options.boolean("d")
      ])

      it("no prefix should show all flags", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo")
          const index = 1
          const command = Command.standard("foo", { options })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(
            Completion.getCompletions(words, index, command, config, compgen)
          )
          const expected = ReadonlyArray.make("-a ", "-b ", "-c ", "-d ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("'-' prefix should show all flags", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "-")
          const index = 1
          const command = Command.standard("foo", { options })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(
            Completion.getCompletions(words, index, command, config, compgen)
          )
          const expected = ReadonlyArray.make("-a ", "-b ", "-c ", "-d ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("'-a' prefix should show flags: '-b'", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "-a")
          const index = 2
          const command = Command.standard("foo", {
            options: Options.all([
              Options.boolean("a"),
              Options.boolean("b")
            ])
          })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(
            Completion.getCompletions(words, index, command, config, compgen)
          )
          const expected = ReadonlyArray.make("-b ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("'-b' prefix should show flags: '-a'", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "-b")
          const index = 2
          const command = Command.standard("foo", {
            options: Options.all([
              Options.boolean("a"),
              Options.boolean("b")
            ])
          })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(
            Completion.getCompletions(words, index, command, config, compgen)
          )
          const expected = ReadonlyArray.make("-a ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("'-a' prefix should show flags: '-b' '-c' '-d'", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "-a")
          const index = 2
          const command = Command.standard("foo", { options })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(
            Completion.getCompletions(words, index, command, config, compgen)
          )
          const expected = ReadonlyArray.make("-b ", "-c ", "-d ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("'-d -a' prefix should show flags: '-b' '-c'", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "-d", "-a")
          const index = 3
          const command = Command.standard("foo", { options })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(
            Completion.getCompletions(words, index, command, config, compgen)
          )
          const expected = ReadonlyArray.make("-b ", "-c ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("'-d -c -b -' prefix should show flags: '-a'", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "-d", "-c", "-b", "-")
          const index = 4
          const command = Command.standard("foo", { options })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(
            Completion.getCompletions(words, index, command, config, compgen)
          )
          const expected = ReadonlyArray.make("-a ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("invalid flags should return no completions", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "-x")
          const index = 2
          const command = Command.standard("foo", { options })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(
            Completion.getCompletions(words, index, command, config, compgen)
          )
          const expected = ReadonlyArray.empty()
          expect(result).toEqual(expected)
        }).pipe(runEffect))
    })

    describe("Integer Options", () => {
      const options = Options.all([
        Options.integer("a"),
        Options.integer("b"),
        Options.integer("c"),
        Options.integer("d")
      ])

      it("no prefix should show all flags", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo")
          const index = 1
          const command = Command.standard("foo", { options })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(
            Completion.getCompletions(words, index, command, config, compgen)
          )
          const expected = ReadonlyArray.make("-a ", "-b ", "-c ", "-d ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("'-c' without integer value should return no completions", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "-c")
          const index = 2
          const command = Command.standard("foo", { options })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(
            Completion.getCompletions(words, index, command, config, compgen)
          )
          const expected = ReadonlyArray.empty()
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("'-c' with integer value should complete with '-a' '-b' '-d'", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "-c", "1")
          const index = 3
          const command = Command.standard("foo", { options })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(
            Completion.getCompletions(words, index, command, config, compgen)
          )
          const expected = ReadonlyArray.make("-a ", "-b ", "-d ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("'-c' and '-b' with integer value should complete with '-a' '-d'", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "-c", "1", "-b", "2")
          const index = 5
          const command = Command.standard("foo", { options })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(
            Completion.getCompletions(words, index, command, config, compgen)
          )
          const expected = ReadonlyArray.make("-a ", "-d ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("'-c' with integer value and '-b' without integer value should return no completions", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "-c", "1", "-b")
          const index = 5
          const command = Command.standard("foo", { options })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(
            Completion.getCompletions(words, index, command, config, compgen)
          )
          const expected = ReadonlyArray.empty()
          expect(result).toEqual(expected)
        }).pipe(runEffect))
    })

    describe("Enumeration Options", () => {
      const options = Options.choiceWithValue("qux", [
        ["bar", 1],
        ["baz", 2],
        ["bippy", 3]
      ])

      it("partial option names should complete with the same name of the option", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "--q")
          const index = 1
          const command = Command.standard("foo", { options })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(
            Completion.getCompletions(words, index, command, config, compgen)
          )
          const expected = ReadonlyArray.make("--qux ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("no partial words should return the complete list of choices", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "--qux")
          const index = 2
          const command = Command.standard("foo", { options })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(
            Completion.getCompletions(words, index, command, config, compgen)
          )
          const expected = ReadonlyArray.make("bar ", "baz ", "bippy ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("partial word 'b' should complete with 'bar' 'baz' 'bippy'", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "--qux", "b")
          const index = 2
          const command = Command.standard("foo", { options })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(
            Completion.getCompletions(words, index, command, config, compgen)
          )
          const expected = ReadonlyArray.make("bar ", "baz ", "bippy ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("partial word 'ba' should complete with 'bar' 'baz'", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "--qux", "ba")
          const index = 2
          const command = Command.standard("foo", { options })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(
            Completion.getCompletions(words, index, command, config, compgen)
          )
          const expected = ReadonlyArray.make("bar ", "baz ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("partial word 'baz' should complete with 'baz'", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("foo", "--qux", "baz")
          const index = 2
          const command = Command.standard("foo", { options })
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(
            Completion.getCompletions(words, index, command, config, compgen)
          )
          const expected = ReadonlyArray.make("baz ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))
    })
  })

  describe("Command - Options and Args", () => {
    describe("Tail", () => {
      it("should complete the '-n' option name", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("tail", "-")
          const index = 1
          const command = Tail.command
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(
            Completion.getCompletions(words, index, command, config, compgen)
          )
          const expected = ReadonlyArray.make("-n ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("should complete file name", () =>
        Effect.gen(function*(_) {
          const path = yield* _(Path.Path)
          const fileSystem = yield* _(FileSystem.FileSystem)
          const tempDir = yield* _(fileSystem.makeTempDirectoryScoped())
          yield* _(Effect.all([
            fileSystem.writeFile(path.join(tempDir, "foo.txt"), new Uint8Array()),
            fileSystem.writeFile(path.join(tempDir, "bar.pdf"), new Uint8Array()),
            fileSystem.writeFile(path.join(tempDir, "bippy.sh"), new Uint8Array()),
            fileSystem.makeDirectory(path.join(tempDir, "fooDir")),
            fileSystem.makeDirectory(path.join(tempDir, "barDir")),
            fileSystem.makeDirectory(path.join(tempDir, "bippyDir"))
          ]))
          yield* _(
            Effect.gen(function*(_) {
              const words = ReadonlyArray.make("tail", "f")
              const index = 1
              const command = Tail.command
              const config = CliConfig.defaultConfig
              const compgen = yield* _(Compgen.Compgen)
              const result = yield* _(
                Completion.getCompletions(words, index, command, config, compgen),
                Effect.map(ReadonlyArray.sort(Order.string))
              )
              const expected = ReadonlyArray.make("foo.txt ", "fooDir/")
              expect(result).toEqual(expected)
            }).pipe(Effect.provide(Compgen.testLayer(tempDir)))
          )
        }).pipe(Effect.scoped, runEffect))
    })

    describe("WordCount", () => {
      it("should complete the option names", () =>
        Effect.gen(function*(_) {
          const words = ReadonlyArray.make("wc", "-")
          const index = 1
          const command = WordCount.command
          const config = CliConfig.defaultConfig
          const compgen = yield* _(Compgen.Compgen)
          const result = yield* _(
            Completion.getCompletions(words, index, command, config, compgen)
          )
          const expected = ReadonlyArray.make("-c ", "-l ", "-m ", "-w ")
          expect(result).toEqual(expected)
        }).pipe(runEffect))

      it("should complete the first file name", () =>
        Effect.gen(function*(_) {
          const path = yield* _(Path.Path)
          const fileSystem = yield* _(FileSystem.FileSystem)
          const tempDir = yield* _(fileSystem.makeTempDirectoryScoped())
          yield* _(Effect.all([
            fileSystem.writeFile(path.join(tempDir, "foo.txt"), new Uint8Array()),
            fileSystem.writeFile(path.join(tempDir, "bar.pdf"), new Uint8Array()),
            fileSystem.writeFile(path.join(tempDir, "bippy.sh"), new Uint8Array()),
            fileSystem.makeDirectory(path.join(tempDir, "fooDir")),
            fileSystem.makeDirectory(path.join(tempDir, "barDir")),
            fileSystem.makeDirectory(path.join(tempDir, "bippyDir"))
          ]))
          yield* _(
            Effect.gen(function*(_) {
              const words = ReadonlyArray.make("wc", "-l", "-c", "f")
              const index = 3
              const command = WordCount.command
              const config = CliConfig.defaultConfig
              const compgen = yield* _(Compgen.Compgen)
              const result = yield* _(
                Completion.getCompletions(words, index, command, config, compgen),
                Effect.map(ReadonlyArray.sort(Order.string))
              )
              const expected = ReadonlyArray.make("foo.txt ", "fooDir/")
              expect(result).toEqual(expected)
            }).pipe(Effect.provide(Compgen.testLayer(tempDir)))
          )
        }).pipe(Effect.scoped, runEffect))

      it("should complete the second file name", () =>
        Effect.gen(function*(_) {
          const path = yield* _(Path.Path)
          const fileSystem = yield* _(FileSystem.FileSystem)
          const tempDir = yield* _(fileSystem.makeTempDirectoryScoped())
          yield* _(Effect.all([
            fileSystem.writeFile(path.join(tempDir, "foo.txt"), new Uint8Array()),
            fileSystem.writeFile(path.join(tempDir, "bar.pdf"), new Uint8Array()),
            fileSystem.writeFile(path.join(tempDir, "bippy.sh"), new Uint8Array()),
            fileSystem.makeDirectory(path.join(tempDir, "fooDir")),
            fileSystem.makeDirectory(path.join(tempDir, "barDir")),
            fileSystem.makeDirectory(path.join(tempDir, "bippyDir"))
          ]))
          yield* _(
            Effect.gen(function*(_) {
              const words = ReadonlyArray.make("wc", "-l", "-c", "blah.md", "f")
              const index = 4
              const command = WordCount.command
              const config = CliConfig.defaultConfig
              const compgen = yield* _(Compgen.Compgen)
              const result = yield* _(
                Completion.getCompletions(words, index, command, config, compgen),
                Effect.map(ReadonlyArray.sort(Order.string))
              )
              const expected = ReadonlyArray.make("foo.txt ", "fooDir/")
              expect(result).toEqual(expected)
            }).pipe(Effect.provide(Compgen.testLayer(tempDir)))
          )
        }).pipe(Effect.scoped, runEffect))
    })
  })
})
