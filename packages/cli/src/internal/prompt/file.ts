import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import * as Terminal from "@effect/platform/Terminal"
import * as Ansi from "@effect/printer-ansi/Ansi"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
import * as Optimize from "@effect/printer/Optimize"
import * as Arr from "effect/Array"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Option from "effect/Option"
import type * as Prompt from "../../Prompt.js"
import * as InternalPrompt from "../prompt.js"
import { Action } from "./action.js"
import * as InternalAnsiUtils from "./ansi-utils.js"
import { entriesToDisplay } from "./utils.js"

interface FileOptions extends Required<Omit<Prompt.Prompt.FileOptions, "startingPath">> {
  readonly startingPath: Option.Option<string>
}

interface State {
  readonly cursor: number
  readonly files: ReadonlyArray<string>
  readonly path: Option.Option<string>
  readonly confirm: Confirm
}

const CONFIRM_MESSAGE = "The selected directory contains files. Would you like to traverse the selected directory?"
type Confirm = Data.TaggedEnum<{
  readonly Show: {}
  readonly Hide: {}
}>
const Confirm = Data.taggedEnum<Confirm>()

const showConfirmation = Confirm.$is("Show")

const renderBeep = Doc.render(Doc.beep, { style: "pretty" })

function resolveCurrentPath(
  path: Option.Option<string>,
  options: FileOptions
): Effect.Effect<string, never, FileSystem.FileSystem> {
  return Option.match(path, {
    onNone: () =>
      Option.match(options.startingPath, {
        onNone: () => Effect.sync(() => process.cwd()),
        onSome: (path) =>
          Effect.flatMap(FileSystem.FileSystem, (fs) =>
            // Ensure the user provided starting path exists
            Effect.orDie(fs.exists(path)).pipe(
              Effect.filterOrDieMessage(
                identity,
                `The provided starting path '${path}' does not exist`
              ),
              Effect.as(path)
            ))
      }),
    onSome: (path) => Effect.succeed(path)
  })
}

function getFileList(directory: string, options: FileOptions) {
  return Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const files = yield* Effect.orDie(fs.readDirectory(directory)).pipe(
      // Always prepend the `".."` option to the file list but allow it
      // to be filtered out if the user so desires
      Effect.map((files) => ["..", ...files])
    )
    return yield* Effect.filter(files, (file) => {
      const result = options.filter(file)
      const userDefinedFilter = Effect.isEffect(result)
        ? result
        : Effect.succeed(result)
      const directoryFilter = options.type === "directory"
        ? Effect.map(
          Effect.orDie(fs.stat(path.join(directory, file))),
          (info) => info.type === "Directory"
        )
        : Effect.succeed(true)
      return Effect.zipWith(userDefinedFilter, directoryFilter, (a, b) => a && b)
    }, { concurrency: files.length })
  })
}

function handleClear(options: FileOptions) {
  return (state: State, _: Prompt.Prompt.Action<State, string>) => {
    return Effect.gen(function*() {
      const terminal = yield* Terminal.Terminal
      const columns = yield* terminal.columns
      const currentPath = yield* resolveCurrentPath(state.path, options)
      const text = "\n".repeat(Math.min(state.files.length, options.maxPerPage))
      const clearPath = InternalAnsiUtils.eraseText(currentPath, columns)
      const message = showConfirmation(state.confirm) ? CONFIRM_MESSAGE : options.message
      const clearPrompt = InternalAnsiUtils.eraseText(`\n${message}`, columns)
      const clearOptions = InternalAnsiUtils.eraseText(text, columns)
      return clearOptions.pipe(
        Doc.cat(clearPath),
        Doc.cat(clearPrompt),
        Optimize.optimize(Optimize.Deep),
        Doc.render({ style: "pretty", options: { lineWidth: columns } })
      )
    })
  }
}

const NEWLINE_REGEX = /\r?\n/

function renderPrompt(
  confirm: Doc.AnsiDoc,
  message: string,
  leadingSymbol: Doc.AnsiDoc,
  trailingSymbol: Doc.AnsiDoc
) {
  const annotateLine = (line: string): Doc.AnsiDoc => Doc.annotate(Doc.text(line), Ansi.bold)
  const prefix = Doc.cat(leadingSymbol, Doc.space)
  return Arr.match(message.split(NEWLINE_REGEX), {
    onEmpty: () => Doc.hsep([prefix, trailingSymbol, confirm]),
    onNonEmpty: (promptLines) => {
      const lines = Arr.map(promptLines, (line) => annotateLine(line))
      return prefix.pipe(
        Doc.cat(Doc.nest(Doc.vsep(lines), 2)),
        Doc.cat(Doc.space),
        Doc.cat(trailingSymbol),
        Doc.cat(Doc.space),
        Doc.cat(confirm)
      )
    }
  })
}

function renderPrefix(
  state: State,
  toDisplay: { readonly startIndex: number; readonly endIndex: number },
  currentIndex: number,
  length: number,
  figures: Effect.Effect.Success<typeof InternalAnsiUtils.figures>
) {
  let prefix: Doc.AnsiDoc = Doc.space
  if (currentIndex === toDisplay.startIndex && toDisplay.startIndex > 0) {
    prefix = figures.arrowUp
  } else if (currentIndex === toDisplay.endIndex - 1 && toDisplay.endIndex < length) {
    prefix = figures.arrowDown
  }
  return state.cursor === currentIndex
    ? figures.pointer.pipe(Doc.annotate(Ansi.cyanBright), Doc.cat(prefix))
    : prefix.pipe(Doc.cat(Doc.space))
}

function renderFileName(file: string, isSelected: boolean) {
  return isSelected
    ? Doc.annotate(Doc.text(file), Ansi.combine(Ansi.underlined, Ansi.cyanBright))
    : Doc.text(file)
}

function renderFiles(
  state: State,
  files: ReadonlyArray<string>,
  figures: Effect.Effect.Success<typeof InternalAnsiUtils.figures>,
  options: FileOptions
) {
  const length = files.length
  const toDisplay = entriesToDisplay(state.cursor, length, options.maxPerPage)
  const documents: Array<Doc.AnsiDoc> = []
  for (let index = toDisplay.startIndex; index < toDisplay.endIndex; index++) {
    const isSelected = state.cursor === index
    const prefix = renderPrefix(state, toDisplay, index, length, figures)
    const fileName = renderFileName(files[index], isSelected)
    documents.push(Doc.cat(prefix, fileName))
  }
  return Doc.vsep(documents)
}

function renderNextFrame(state: State, options: FileOptions) {
  return Effect.gen(function*() {
    const path = yield* Path.Path
    const terminal = yield* Terminal.Terminal
    const columns = yield* terminal.columns
    const figures = yield* InternalAnsiUtils.figures
    const currentPath = yield* resolveCurrentPath(state.path, options)
    const selectedPath = state.files[state.cursor]
    const resolvedPath = path.resolve(currentPath, selectedPath)
    const resolvedPathMsg = figures.pointerSmall.pipe(
      Doc.cat(Doc.space),
      Doc.cat(Doc.text(resolvedPath)),
      Doc.annotate(Ansi.blackBright)
    )
    if (showConfirmation(state.confirm)) {
      const leadingSymbol = Doc.annotate(Doc.text("?"), Ansi.cyanBright)
      const trailingSymbol = Doc.annotate(figures.pointerSmall, Ansi.blackBright)
      const confirm = Doc.annotate(Doc.text("(Y/n)"), Ansi.blackBright)
      const promptMsg = renderPrompt(confirm, CONFIRM_MESSAGE, leadingSymbol, trailingSymbol)
      return Doc.cursorHide.pipe(
        Doc.cat(promptMsg),
        Doc.cat(Doc.hardLine),
        Doc.cat(resolvedPathMsg),
        Optimize.optimize(Optimize.Deep),
        Doc.render({ style: "pretty", options: { lineWidth: columns } })
      )
    }
    const leadingSymbol = Doc.annotate(figures.tick, Ansi.green)
    const trailingSymbol = Doc.annotate(figures.ellipsis, Ansi.blackBright)
    const promptMsg = renderPrompt(Doc.empty, options.message, leadingSymbol, trailingSymbol)
    const files = renderFiles(state, state.files, figures, options)
    return Doc.cursorHide.pipe(
      Doc.cat(promptMsg),
      Doc.cat(Doc.hardLine),
      Doc.cat(resolvedPathMsg),
      Doc.cat(Doc.hardLine),
      Doc.cat(files),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty", options: { lineWidth: columns } })
    )
  })
}

function renderSubmission(value: string, options: FileOptions) {
  return Effect.gen(function*() {
    const terminal = yield* Terminal.Terminal
    const columns = yield* terminal.columns
    const figures = yield* InternalAnsiUtils.figures
    const leadingSymbol = Doc.annotate(figures.tick, Ansi.green)
    const trailingSymbol = Doc.annotate(figures.ellipsis, Ansi.blackBright)
    const promptMsg = renderPrompt(Doc.empty, options.message, leadingSymbol, trailingSymbol)
    return promptMsg.pipe(
      Doc.cat(Doc.space),
      Doc.cat(Doc.annotate(Doc.text(value), Ansi.white)),
      Doc.cat(Doc.hardLine),
      Doc.render({ style: "pretty", options: { lineWidth: columns } })
    )
  })
}

function handleRender(options: FileOptions) {
  return (_: State, action: Prompt.Prompt.Action<State, string>) => {
    return Action.$match(action, {
      Beep: () => Effect.succeed(renderBeep),
      NextFrame: ({ state }) => renderNextFrame(state, options),
      Submit: ({ value }) => renderSubmission(value, options)
    })
  }
}

function processCursorUp(state: State) {
  const cursor = state.cursor - 1
  return Effect.succeed(Action.NextFrame({
    state: { ...state, cursor: cursor < 0 ? state.files.length - 1 : cursor }
  }))
}

function processCursorDown(state: State) {
  return Effect.succeed(Action.NextFrame({
    state: { ...state, cursor: (state.cursor + 1) % state.files.length }
  }))
}

function processSelection(state: State, options: FileOptions) {
  return Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const currentPath = yield* resolveCurrentPath(state.path, options)
    const selectedPath = state.files[state.cursor]
    const resolvedPath = path.resolve(currentPath, selectedPath)
    const info = yield* Effect.orDie(fs.stat(resolvedPath))
    if (info.type === "Directory") {
      const files = yield* getFileList(resolvedPath, options)
      const filesWithoutParent = files.filter((file) => file !== "..")
      // If the user selected a directory AND the prompt type can result with
      // a directory, we must confirm:
      //  - If the selected directory has any files
      //  - Confirm whether or not the user wants to traverse those files
      if (options.type === "directory" || options.type === "either") {
        return filesWithoutParent.length === 0
          // Directory is empty so it's safe to select it
          ? Action.Submit({ value: resolvedPath })
          // Directory has contents - show confirmation to user
          : Action.NextFrame({
            state: { ...state, confirm: Confirm.Show() }
          })
      }
      return Action.NextFrame({
        state: {
          cursor: 0,
          files,
          path: Option.some(resolvedPath),
          confirm: Confirm.Hide()
        }
      })
    }
    return Action.Submit({ value: resolvedPath })
  })
}

function handleProcess(options: FileOptions) {
  return (input: Terminal.UserInput, state: State) =>
    Effect.gen(function*() {
      switch (input.key.name) {
        case "k":
        case "up": {
          return yield* processCursorUp(state)
        }
        case "j":
        case "down":
        case "tab": {
          return yield* processCursorDown(state)
        }
        case "enter":
        case "return": {
          return yield* processSelection(state, options)
        }
        case "y":
        case "t": {
          if (showConfirmation(state.confirm)) {
            const path = yield* Path.Path
            const currentPath = yield* resolveCurrentPath(state.path, options)
            const selectedPath = state.files[state.cursor]
            const resolvedPath = path.resolve(currentPath, selectedPath)
            const files = yield* getFileList(resolvedPath, options)
            return Action.NextFrame({
              state: {
                cursor: 0,
                files,
                path: Option.some(resolvedPath),
                confirm: Confirm.Hide()
              }
            })
          }
          return Action.Beep()
        }
        case "n":
        case "f": {
          if (showConfirmation(state.confirm)) {
            const path = yield* Path.Path
            const currentPath = yield* resolveCurrentPath(state.path, options)
            const selectedPath = state.files[state.cursor]
            const resolvedPath = path.resolve(currentPath, selectedPath)
            return Action.Submit({ value: resolvedPath })
          }
          return Action.Beep()
        }
        default: {
          return Action.Beep()
        }
      }
    })
}

/** @internal */
export const file = (options: Prompt.Prompt.FileOptions = {}): Prompt.Prompt<string> => {
  const opts: FileOptions = {
    type: options.type ?? "file",
    message: options.message ?? `Choose a file`,
    startingPath: Option.fromNullable(options.startingPath),
    maxPerPage: options.maxPerPage ?? 10,
    filter: options.filter ?? (() => Effect.succeed(true))
  }
  const initialState: Effect.Effect<
    State,
    never,
    Prompt.Prompt.Environment
  > = Effect.gen(function*() {
    const path = Option.none<string>()
    const currentPath = yield* resolveCurrentPath(path, opts)
    const files = yield* getFileList(currentPath, opts)
    const confirm = Confirm.Hide()
    return { cursor: 0, files, path, confirm }
  })
  return InternalPrompt.custom(initialState, {
    render: handleRender(opts),
    process: handleProcess(opts),
    clear: handleClear(opts)
  })
}
