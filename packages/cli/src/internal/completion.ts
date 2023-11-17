import type * as FileSystem from "@effect/platform/FileSystem"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Order from "effect/Order"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as String from "effect/String"
import type * as CliConfig from "../CliConfig.js"
import type * as Command from "../Command.js"
import type * as Compgen from "../Compgen.js"
import type * as ShellType from "../ShellType.js"
import * as InternalCommand from "./command.js"
import * as InternalRegularLanguage from "./regularLanguage.js"

/** @internal */
export const getCompletions = <A>(
  words: ReadonlyArray<string>,
  index: number,
  command: Command.Command<A>,
  config: CliConfig.CliConfig,
  compgen: Compgen.Compgen
): Effect.Effect<FileSystem.FileSystem, never, ReadonlyArray<string>> => {
  // Split the input words into two chunks:
  // 1. The chunk that is strictly before the cursor, and
  // 2. The chunk that is at or after the cursor.
  const [splitted, _] = ReadonlyArray.splitAt(words, index)
  // Calculate the `RegularLanguage` corresponding to the input command.
  // Here, we allow the top-most `Command.Single.name` field to vary by setting
  // `allowAlias = true`. This is because the first argument will be the name
  // of the executable that is provided when the shell makes a tab completion
  // request. Without doing so, tab completion would fail if the executable
  // were renamed or invoked via an alias.
  const language = InternalCommand.toRegularLanguage(command, true)
  // Repeatedly differentiate the language w.r.t. each of the tokens that
  // occur before the cursor.
  const derivative = Effect.reduce(
    splitted,
    language,
    (lang, word) => InternalRegularLanguage.derive(lang, word, config)
  )
  // Determine the word to complete
  const wordToComplete = index >= 0 && index < words.length ? words[index]! : ""
  // Finally, obtain the list of completions for the wordToComplete by:
  // 1. Getting the list of all of the first tokens in the derivative
  // 2. Retaining only those tokens that start with wordToComplete.
  return derivative.pipe(
    Effect.flatMap((lang) => InternalRegularLanguage.firstTokens(lang, wordToComplete, compgen)),
    Effect.map((completions) =>
      pipe(
        ReadonlyArray.fromIterable(completions),
        ReadonlyArray.sort(Order.string),
        ReadonlyArray.filter((str) => str.length > 0)
      )
    )
  )
}

/** @internal */
export const getCompletionScript = (
  pathToExecutable: string,
  programNames: ReadonlyArray.NonEmptyReadonlyArray<string>,
  shellType: ShellType.ShellType
): string => {
  switch (shellType._tag) {
    case "Bash": {
      return createBashCompletionScript(pathToExecutable, programNames)
    }
    case "Fish":
    case "Zsh": {
      throw new Error("Not implemented")
    }
  }
}

// =============================================================================
// Internals
// =============================================================================

const createBashCompletionScript = (
  pathToExecutable: string,
  programNames: ReadonlyArray.NonEmptyReadonlyArray<string>
): string => {
  const completions = pipe(
    programNames,
    ReadonlyArray.map((programName) =>
      `complete -F _${ReadonlyArray.headNonEmpty(programNames)} ${programName}`
    ),
    ReadonlyArray.join("\n")
  )
  return String.stripMargin(
    `|#!/usr/bin/env bash
     |_${ReadonlyArray.headNonEmpty(programNames)}() {
     |  local CMDLINE
     |  local IFS=$'\\n'
     |  CMDLINE=(--shell-type bash --shell-completion-index $COMP_CWORD)
     |
     |  INDEX=0
     |  for arg in \${COMP_WORDS[@]}; do
     |    export COMP_WORD_$INDEX=\${arg}
     |    (( INDEX++ ))
     |  done
     |
     |  COMPREPLY=( $(${pathToExecutable} "\${CMDLINE[@]}") )
     |
     |  # Unset the environment variables.
     |  unset $(compgen -v | grep "^COMP_WORD_")
     |}
     |${completions}`
  )
}
