import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Path from "effect/Path"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"
import * as Stream from "effect/Stream"
import * as ChildProcess from "effect/unstable/process/ChildProcess"
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner"
import { DoctestError, fromUnknown } from "./DoctestError.ts"

interface ResponseError {
  readonly message: string
}

interface Response {
  readonly id?: number
  readonly result?: unknown
  readonly error?: ResponseError
}

const makeParser = () => {
  const decoder = new TextDecoder()
  let buffer = new Uint8Array(0)
  const headerEnd = (): number => {
    for (let index = 0; index <= buffer.length - 4; index++) {
      if (buffer[index] === 13 && buffer[index + 1] === 10 && buffer[index + 2] === 13 && buffer[index + 3] === 10) {
        return index
      }
    }
    return -1
  }
  return (chunk: Uint8Array): Array<Response> => {
    const next = new Uint8Array(buffer.length + chunk.length)
    next.set(buffer)
    next.set(chunk, buffer.length)
    buffer = next
    const responses: Array<Response> = []
    while (true) {
      const end = headerEnd()
      if (end === -1) return responses
      const header = decoder.decode(buffer.subarray(0, end))
      const length = /(?:^|\r\n)Content-Length: (\d+)(?:\r\n|$)/i.exec(header)
      if (length === null) {
        throw new Error("Oxlint language server sent a response without Content-Length")
      }
      const bodyStart = end + 4
      const bodyEnd = bodyStart + Number(length[1])
      if (buffer.length < bodyEnd) return responses
      responses.push(JSON.parse(decoder.decode(buffer.subarray(bodyStart, bodyEnd))) as Response)
      buffer = buffer.subarray(bodyEnd)
    }
  }
}

export class OxlintLsp extends Context.Service<OxlintLsp, {
  readonly notify: (method: string, params: unknown) => Effect.Effect<void, DoctestError>
  readonly request: <A = unknown>(method: string, params: unknown) => Effect.Effect<A, DoctestError>
}>()("@effect/doctest/OxlintLsp") {}

const make = Effect.fnUntraced(function*(config: string | undefined) {
  const path = yield* Path.Path
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
  const input = yield* Queue.unbounded<Uint8Array>()
  const handle = yield* spawner.spawn(
    ChildProcess.make("oxlint", ["--lsp"], {
      stdin: Stream.fromQueue(input)
    })
  ).pipe(Effect.mapError((cause) => fromUnknown(cause, "Could not start the oxlint language server")))
  const pending = new Map<number, Queue.Queue<Response, DoctestError>>()
  const failure = yield* Ref.make<DoctestError | undefined>(undefined)
  const expectedExit = yield* Ref.make(false)
  const stderr = yield* Ref.make("")
  const nextId = yield* Ref.make(1)
  const encoder = new TextEncoder()
  const parse = makeParser()
  const fail = Effect.fnUntraced(function*(error: DoctestError) {
    const first = yield* Ref.modify(failure, (current) => current === undefined ? [true, error] : [false, current])
    if (!first) return
    const requests = [...pending.values()]
    pending.clear()
    yield* Effect.forEach(requests, (queue) => Queue.fail(queue, error), { discard: true })
  })
  const send = Effect.fnUntraced(function*(message: unknown) {
    const currentFailure = yield* Ref.get(failure)
    if (currentFailure !== undefined) return yield* currentFailure
    const content = JSON.stringify(message)
    const body = encoder.encode(content)
    const frame = encoder.encode(`Content-Length: ${body.length}\r\n\r\n${content}`)
    const offered = yield* Queue.offer(input, frame)
    if (!offered) {
      return yield* new DoctestError({ message: "Oxlint language server input is closed" })
    }
  })
  const notify = (method: string, params: unknown) => send({ jsonrpc: "2.0", method, params })
  const request = Effect.fnUntraced(function*<A = unknown>(method: string, params: unknown) {
    const id = yield* Ref.getAndUpdate(nextId, (id) => id + 1)
    const responses = yield* Queue.unbounded<Response, DoctestError>()
    pending.set(id, responses)
    const currentFailure = yield* Ref.get(failure)
    if (currentFailure !== undefined) yield* Queue.fail(responses, currentFailure)
    const response = yield* Effect.gen(function*() {
      yield* send({ jsonrpc: "2.0", id, method, params })
      return yield* Queue.take(responses)
    }).pipe(
      Effect.ensuring(Effect.sync(() => pending.delete(id)))
    )
    if (response.error !== undefined) {
      return yield* new DoctestError({ message: response.error.message })
    }
    return response.result as A
  })

  yield* handle.stdout.pipe(
    Stream.runForEach((chunk) =>
      Effect.gen(function*() {
        const responses = yield* Effect.try({
          try: () => parse(chunk),
          catch: (cause) => fromUnknown(cause, "Could not decode an oxlint language server response")
        })
        for (const response of responses) {
          if (response.id === undefined) continue
          const queue = pending.get(response.id)
          if (queue !== undefined) yield* Queue.offer(queue, response)
        }
      })
    ),
    Effect.catch((cause) => fail(fromUnknown(cause))),
    Effect.forkScoped
  )
  yield* handle.stderr.pipe(
    Stream.decodeText(),
    Stream.runForEach((chunk) => Ref.update(stderr, (output) => output + chunk)),
    Effect.catch((cause) => fail(fromUnknown(cause))),
    Effect.forkScoped
  )
  yield* handle.exitCode.pipe(
    Effect.mapError((cause) => fromUnknown(cause)),
    Effect.flatMap((code) =>
      Ref.get(expectedExit).pipe(
        Effect.flatMap((expected) =>
          expected
            ? Effect.void
            : Ref.get(stderr).pipe(
              Effect.flatMap((output) => {
                const details = output.trim()
                return fail(
                  new DoctestError({
                    message: `Oxlint language server stopped with exit code ${code}${
                      details === "" ? "" : `:\n${details}`
                    }`
                  })
                )
              })
            )
        )
      )
    ),
    Effect.catch((cause) =>
      Ref.get(stderr).pipe(
        Effect.flatMap((output) => {
          const details = output.trim()
          return fail(
            new DoctestError({
              message: `Oxlint language server stopped: ${cause.message}${details === "" ? "" : `:\n${details}`}`,
              cause
            })
          )
        })
      )
    ),
    Effect.forkScoped
  )

  const rootUri = (yield* path.toFileUrl(`${path.resolve()}${path.sep}`).pipe(
    Effect.mapError((cause) => fromUnknown(cause))
  )).href
  yield* request("initialize", {
    processId: process.pid,
    rootUri,
    workspaceFolders: [{ uri: rootUri, name: "doctest" }],
    capabilities: {
      textDocument: {
        diagnostic: {}
      }
    },
    initializationOptions: [{
      workspaceUri: rootUri,
      options: {
        run: "onType",
        ...(config === undefined ? {} : { configPath: path.resolve(config) })
      }
    }]
  })
  yield* notify("initialized", {})
  yield* Effect.addFinalizer(() =>
    Effect.gen(function*() {
      yield* request("shutdown", null)
      yield* Ref.set(expectedExit, true)
      yield* notify("exit", null)
      yield* handle.exitCode.pipe(Effect.mapError((cause) => fromUnknown(cause)))
    }).pipe(
      Effect.timeout("5 seconds"),
      Effect.ignore
    )
  )
  return OxlintLsp.of({ notify, request })
})

export const layer = (config: string | undefined): Layer.Layer<
  OxlintLsp,
  DoctestError,
  Path.Path | ChildProcessSpawner.ChildProcessSpawner
> => Layer.effect(OxlintLsp, make(config))
