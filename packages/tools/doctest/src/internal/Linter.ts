import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process"
import { resolve, sep } from "node:path"
import { pathToFileURL } from "node:url"
import type * as Source from "../Source.ts"
import * as Virtual from "./Virtual.ts"

interface ResponseError {
  readonly message: string
}

interface Response {
  readonly id: number
  readonly result?: unknown
  readonly error?: ResponseError
}

interface PendingRequest {
  readonly resolve: (result: unknown) => void
  readonly reject: (error: unknown) => void
}

interface Diagnostic {
  readonly range: {
    readonly start: {
      readonly line: number
      readonly character: number
    }
  }
  readonly severity?: number
  readonly code?: string | number
  readonly message: string
}

interface DiagnosticReport {
  readonly items: ReadonlyArray<Diagnostic>
}

const diagnosticHeader = "Documentation example lint failed:\n\n"

const formatDiagnostic = (file: string, snippet: Source.Snippet, diagnostic: Diagnostic): string => {
  const line = snippet.line + diagnostic.range.start.line + 1
  const column = snippet.column + diagnostic.range.start.character
  const code = diagnostic.code === undefined ? "oxlint" : String(diagnostic.code)
  return `${file}:${line}:${column} ${code}: ${diagnostic.message.replaceAll("\n", "\n  ")}`
}

export class Linter {
  readonly #process: ChildProcessWithoutNullStreams
  readonly #pending = new Map<number, PendingRequest>()
  readonly #ready: Promise<void>
  readonly #exit: Promise<void>
  #buffer = Buffer.alloc(0)
  #stderr = ""
  #nextId = 1
  #nextVersion = 1
  #failure: Error | undefined
  #expectedExit = false
  #closed: Promise<void> | undefined

  constructor(config?: string | undefined) {
    this.#process = spawn("oxlint", ["--lsp"], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"]
    })
    this.#process.stdout.on("data", (chunk: Buffer) => this.#receive(chunk))
    this.#process.stderr.on("data", (chunk: Buffer) => {
      this.#stderr += chunk.toString()
    })
    this.#process.once("error", (error) => this.#fail(error))
    this.#exit = new Promise((resolveExit) => {
      this.#process.once("exit", (code, signal) => {
        resolveExit()
        if (!this.#expectedExit) {
          const reason = code === null ? `signal ${signal ?? "unknown"}` : `exit code ${code}`
          const details = this.#stderr.trim()
          this.#fail(new Error(`Oxlint language server stopped with ${reason}${details === "" ? "" : `:\n${details}`}`))
        }
      })
    })

    const rootUri = pathToFileURL(`${resolve(process.cwd())}${sep}`).href
    this.#ready = this.#request("initialize", {
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
          ...(config === undefined ? {} : { configPath: resolve(config) })
        }
      }]
    }).then(() => {
      this.#notify("initialized", {})
    })
  }

  check(file: string, snippets: ReadonlyArray<Source.Snippet>): Promise<void> {
    if (this.#closed !== undefined) {
      return Promise.reject(new Error("Documentation example linter is closed"))
    }
    return this.#ready.then(() =>
      Promise.all(snippets.map((snippet, index) => this.#checkSnippet(file, snippet, index)))
    ).then((diagnostics) => {
      const errors = diagnostics.flat().filter(({ diagnostic }) => diagnostic.severity === 1)
      if (errors.length === 0) return
      throw new Error(
        `${diagnosticHeader}${
          errors.map(({ diagnostic, snippet }) => formatDiagnostic(file, snippet, diagnostic)).join("\n\n")
        }`
      )
    })
  }

  close(): Promise<void> {
    if (this.#closed !== undefined) return this.#closed
    this.#closed = this.#ready.then(
      () =>
        this.#request("shutdown", null).then(() => {
          this.#expectedExit = true
          this.#notify("exit", null)
          return this.#exit
        }),
      () => {
        this.#expectedExit = true
        this.#process.kill()
        return this.#exit
      }
    )
    return this.#closed
  }

  #checkSnippet(
    file: string,
    snippet: Source.Snippet,
    index: number
  ): Promise<ReadonlyArray<{ readonly diagnostic: Diagnostic; readonly snippet: Source.Snippet }>> {
    const uri = pathToFileURL(Virtual.source(resolve(file), index)).href
    this.#notify("textDocument/didOpen", {
      textDocument: {
        uri,
        languageId: "typescript",
        version: this.#nextVersion++,
        text: snippet.source
      }
    })
    return this.#request<DiagnosticReport>("textDocument/diagnostic", {
      textDocument: { uri }
    }).then((report) => report.items.map((diagnostic) => ({ diagnostic, snippet }))).finally(() => {
      this.#notify("textDocument/didClose", { textDocument: { uri } })
    })
  }

  #request<A = unknown>(method: string, params: unknown): Promise<A> {
    if (this.#failure !== undefined) return Promise.reject(this.#failure)
    const id = this.#nextId++
    return new Promise<A>((resolveRequest, reject) => {
      this.#pending.set(id, {
        resolve: (result) => resolveRequest(result as A),
        reject
      })
      this.#send({ jsonrpc: "2.0", id, method, params })
    })
  }

  #notify(method: string, params: unknown): void {
    this.#send({ jsonrpc: "2.0", method, params })
  }

  #send(message: unknown): void {
    if (this.#failure !== undefined) return
    const content = JSON.stringify(message)
    this.#process.stdin.write(`Content-Length: ${Buffer.byteLength(content)}\r\n\r\n${content}`)
  }

  #receive(chunk: Buffer): void {
    this.#buffer = Buffer.concat([this.#buffer, chunk])
    while (true) {
      const headerEnd = this.#buffer.indexOf("\r\n\r\n")
      if (headerEnd === -1) return
      const header = this.#buffer.subarray(0, headerEnd).toString()
      const length = /(?:^|\r\n)Content-Length: (\d+)(?:\r\n|$)/i.exec(header)
      if (length === null) {
        this.#fail(new Error("Oxlint language server sent a response without Content-Length"))
        return
      }
      const bodyStart = headerEnd + 4
      const bodyEnd = bodyStart + Number(length[1])
      if (this.#buffer.length < bodyEnd) return

      let response: Response
      try {
        response = JSON.parse(this.#buffer.subarray(bodyStart, bodyEnd).toString()) as Response
      } catch (error) {
        this.#fail(error instanceof Error ? error : new Error(String(error)))
        return
      }
      this.#buffer = this.#buffer.subarray(bodyEnd)
      const pending = this.#pending.get(response.id)
      if (pending === undefined) continue
      this.#pending.delete(response.id)
      if (response.error === undefined) pending.resolve(response.result)
      else pending.reject(new Error(response.error.message))
    }
  }

  #fail(error: Error): void {
    if (this.#failure !== undefined) return
    this.#failure = error
    for (const pending of this.#pending.values()) pending.reject(error)
    this.#pending.clear()
  }
}
