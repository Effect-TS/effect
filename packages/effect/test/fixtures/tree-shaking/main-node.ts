/**
 * The composition root over the real Node implementations: it provides the two
 * operations the program requires, read off `NodeFileSystem`, so the bundle
 * contains exactly those two of its thirty-two implementations.
 * Run as `node main.js <file>`.
 */
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { backup } from "./program.ts"

const path = process.argv[2]

Effect.runPromise(backup(path).pipe(Effect.provide(Layer.mergeAll(NodeFileSystem.readFile, NodeFileSystem.writeFile))))
  .then(
    (size) => process.stdout.write(`backed up ${size} bytes of ${path}\n`),
    (error) => {
      process.stderr.write(`${error}\n`)
      process.exit(1)
    }
  )
