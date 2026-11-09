import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import { Effect, FileSystem, Layer, Path, Stream } from "effect"
import { DockerBuildContext } from "effect/docker"
import { Tar } from "effect/encoding"

const services = Layer.provideMerge(DockerBuildContext.layer, NodeServices.layer)

/** A directory with these files: a string is a file's content, `{ link }` a symbolic link. */
const directoryWith = Effect.fnUntraced(
  function*(files: Readonly<Record<string, string | { readonly link: string }>>) {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const root = yield* fs.makeTempDirectoryScoped()
    for (const [name, content] of Object.entries(files)) {
      const file = path.join(root, name)
      yield* fs.makeDirectory(path.dirname(file), { recursive: true })
      yield* typeof content === "string" ? fs.writeFileString(file, content) : fs.symlink(content.link, file)
    }
    return root
  }
)

const fromDirectory = (root: string, options?: { readonly dockerfile?: string }) =>
  DockerBuildContext.DockerBuildContext.use((contexts) => contexts.fromDirectory(root, options))

/** The headers of the context made from `root`. */
const headers = (root: string, options?: { readonly dockerfile?: string }) =>
  Effect.flatMap(fromDirectory(root, options), (context) =>
    context.pipe(
      Stream.pipeThroughChannel(Tar.decode()),
      Stream.mapEffect((entry) => Effect.as(Stream.runDrain(entry.body), entry.header)),
      Stream.runCollect
    ))

describe("DockerBuildContext", () => {
  it.effect("fromDirectory sends what docker build sends: the Dockerfile first, without what is ignored", () =>
    Effect.gen(function*() {
      const cases: ReadonlyArray<
        readonly [
          Readonly<Record<string, string | { readonly link: string }>>,
          string | undefined,
          ReadonlyArray<string>
        ]
      > = [
        // exclusions, an exception inside an excluded directory, the build files sent regardless, links unfollowed
        [
          {
            "Dockerfile": "FROM x",
            ".dockerignore": "*\n!src\n!node_modules/keep.txt\n**/*.log\n",
            "src/a.ts": "",
            "src/b.log": "",
            "src/link": { link: "a.ts" },
            "secret.txt": "",
            "node_modules/keep.txt": "",
            "node_modules/pkg/index.js": ""
          },
          undefined,
          ["Dockerfile", ".dockerignore", "node_modules/keep.txt", "src/", "src/a.ts", "src/link"]
        ],
        // the Dockerfile's own ignore file wins over the context's
        [
          {
            "docker/app.Dockerfile": "FROM x",
            "docker/app.Dockerfile.dockerignore": "secret.txt\n",
            ".dockerignore": "keep.txt\n",
            "keep.txt": "",
            "secret.txt": ""
          },
          "docker/app.Dockerfile",
          ["docker/app.Dockerfile", ".dockerignore", "docker/", "docker/app.Dockerfile.dockerignore", "keep.txt"]
        ],
        // a Dockerfile named as `docker build -f ./Dockerfile` names it is still the first entry
        [{ "Dockerfile": "FROM x", ".dockerignore": "", "a.txt": "" }, "./Dockerfile", [
          "Dockerfile",
          ".dockerignore",
          "a.txt"
        ]]
      ]
      for (const [files, dockerfile, expected] of cases) {
        const sent = yield* headers(yield* directoryWith(files), dockerfile === undefined ? undefined : { dockerfile })
        assert.deepStrictEqual(sent.map((header) => header.path), expected)
        assert.isTrue(sent.every((header) => header.uid === 0 && header.gid === 0))
      }
      const malformed = yield* Effect.flip(
        fromDirectory(yield* directoryWith({ "Dockerfile": "FROM x", ".dockerignore": "# ok\n!\n" }))
      )
      assert(malformed.reason._tag === "InvalidBuildContext")
      assert.match(malformed.reason.issue, /^line 2: /)
      const outside = yield* Effect.flip(
        fromDirectory(yield* directoryWith({ "Dockerfile": "FROM x" }), { dockerfile: "../Dockerfile" })
      )
      assert(outside.reason._tag === "InvalidBuildContext")
      assert.strictEqual(outside.reason.path, "../Dockerfile")
    }).pipe(Effect.provide(services)))
})
