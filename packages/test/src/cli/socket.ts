// Where `etest serve` listens for a workspace, and the line-delimited JSON spoken
// over it. Dependency-free on purpose: the launcher (bin.ts) checks for a server before
// loading anything heavy.
import { createHash } from "node:crypto"
import * as os from "node:os"
import * as path from "node:path"

/** The socket (a named pipe on Windows) of the server for the workspace rooted at `root`. */
export const socketPath = (root: string): string => {
  const id = createHash("sha256").update(root).digest("hex").slice(0, 16)
  return process.platform === "win32" ? `\\\\?\\pipe\\etest-${id}` : path.join(os.tmpdir(), `etest-${id}.sock`)
}

/** Client → server, the first and only line: a command line to run, started in `cwd`. */
export interface Request {
  readonly argv: ReadonlyArray<string>
  /** where the client was started: paths on its command line are relative to it */
  readonly cwd: string
  /** the workspace root the client resolved (see root.ts); the server must be serving it */
  readonly root: string
  /** the package script the client was started with, for rerun hints (see invocation.ts) */
  readonly script?: string | undefined
}

/** Server → client, one per line: output as it is produced, then the exit code. */
export type Response =
  | { readonly out: string }
  | { readonly err: string }
  | { readonly exit: number }
