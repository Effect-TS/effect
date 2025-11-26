#!/usr/bin/env node

/**
 * CLI entry point for the note command.
 *
 * @since 0.1.0
 */

import { Args, Command } from "@effect/cli"
import { FileSystem, Path } from "@effect/platform"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import * as Console from "effect/Console"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Match from "effect/Match"

import { makeContent, makeFilename } from "./Note.js"
import { TitleInput } from "./Validate.js"

/**
 * CLI-specific errors with user-friendly messages.
 *
 * @since 0.1.0
 * @category Errors
 */
export type NoteError = ExistingArgFile | FileAlreadyExists | WriteError

/**
 * Error when an argument matches an existing file in the current directory.
 *
 * @since 0.1.0
 * @category Errors
 */
export class ExistingArgFile extends Data.TaggedError("ExistingArgFile")<{
  readonly word: string
}> {
  get message() {
    return `"${this.word}" matches an existing file. You may have confused this tool with another command.`
  }
}

/**
 * Error when the target note file already exists.
 *
 * @since 0.1.0
 * @category Errors
 */
export class FileAlreadyExists extends Data.TaggedError("FileAlreadyExists")<{
  readonly filename: string
}> {
  get message() {
    return `File "${this.filename}" already exists. Choose a different title or remove the existing file.`
  }
}

/**
 * Error when file write fails.
 *
 * @since 0.1.0
 * @category Errors
 */
export class WriteError extends Data.TaggedError("WriteError")<{
  readonly filename: string
  readonly cause: unknown
}> {
  get message() {
    return `Failed to write "${this.filename}".`
  }
}

/**
 * Format a NoteError for display.
 *
 * @since 0.1.0
 * @category Errors
 */
const formatError = (error: NoteError): string =>
  Match.value(error).pipe(
    Match.tag("ExistingArgFile", (e) => `Error: ${e.message}\nUsage: note <title words...>`),
    Match.tag("FileAlreadyExists", (e) => `Error: ${e.message}`),
    Match.tag("WriteError", (e) => `Error: ${e.message}`),
    Match.exhaustive
  )

/**
 * Handle NoteError by printing pretty message and exiting.
 *
 * @since 0.1.0
 * @category Errors
 */
const handleNoteError = (error: NoteError): Effect.Effect<never> =>
  Console.error(formatError(error)).pipe(
    Effect.andThen(Effect.sync(() => process.exit(1)))
  )

const titleArgs = Args.text({ name: "title" }).pipe(
  Args.atLeast(1),
  Args.withSchema(TitleInput)
)

const noteCommand = Command.make(
  "note",
  { title: titleArgs },
  ({ title }) =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const cwd = yield* Effect.sync(() => process.cwd())

      // Check if any arg matches an existing file
      for (const word of title.words) {
        const filePath = path.join(cwd, word)
        const exists = yield* fs.exists(filePath)
        if (exists) {
          return yield* new ExistingArgFile({ word })
        }
      }

      // Generate filename and check if it already exists
      const now = new Date()
      const filename = makeFilename(title.title, now)
      const filePath = path.join(cwd, filename)

      const targetExists = yield* fs.exists(filePath)
      if (targetExists) {
        return yield* new FileAlreadyExists({ filename })
      }

      // Create the note
      const content = makeContent(title.title, now)

      yield* fs.writeFileString(filePath, content).pipe(
        Effect.mapError((cause) => new WriteError({ filename, cause }))
      )

      yield* Console.log(`\u2705 Created: ${filename}`)
    }).pipe(
      Effect.catchTag("ExistingArgFile", handleNoteError),
      Effect.catchTag("FileAlreadyExists", handleNoteError),
      Effect.catchTag("WriteError", handleNoteError)
    )
).pipe(
  Command.withDescription("Create a timestamped markdown note")
)

/**
 * Run the CLI with the given arguments.
 *
 * @since 0.1.0
 */
export const run = (args: ReadonlyArray<string>) =>
  Command.run(noteCommand, {
    name: "note",
    version: "0.1.0"
  })(args)

// Run if executed directly (not when imported as module for testing)
if (process.argv[1]?.includes("bin")) {
  run(process.argv).pipe(
    Effect.provide(NodeContext.layer),
    NodeRuntime.runMain({ disableErrorReporting: true })
  )
}
