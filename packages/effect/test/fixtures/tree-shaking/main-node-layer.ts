/**
 * The control: the same program provided with the aggregate
 * `NodeFileSystem.layer`, which bundles every implementation.
 * Run as `node main.js <file>`.
 */
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import * as Effect from "effect/Effect"
import { backup } from "./program.ts"

const path = process.argv[2]

Effect.runPromise(backup(path).pipe(Effect.provide(NodeFileSystem.layer))).then(
  (size) => process.stdout.write(`backed up ${size} bytes of ${path}\n`),
  (error) => {
    process.stderr.write(`${error}\n`)
    process.exit(1)
  }
)
