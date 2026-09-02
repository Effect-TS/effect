import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { performance } from "node:perf_hooks"

export const HOST = "127.0.0.1"
export const MAX_DOCUMENT_LENGTH = 64 * 1024
export const DOCUMENT_ID_PATTERN = /^(?:read|write)-\d{3}$/

export interface ReadResult {
  readonly id: string
  readonly content: string
  readonly bytes: number
}

export interface WriteResult {
  readonly id: string
  readonly bytes: number
}

export interface WritePayload {
  readonly content: string
}

export const isDocumentId = (value: unknown): value is string =>
  typeof value === "string" && DOCUMENT_ID_PATTERN.test(value)

export const isWritePayload = (value: unknown): value is WritePayload =>
  value !== null &&
  typeof value === "object" &&
  "content" in value &&
  typeof value.content === "string" &&
  value.content.length >= 1 &&
  value.content.length <= MAX_DOCUMENT_LENGTH

const documentPath = (root: string, id: string) => join(root, `${id}.txt`)

export const readDocument = async (root: string, id: string): Promise<ReadResult> => {
  const content = await readFile(documentPath(root, id), "utf8")
  return { id, content, bytes: Buffer.byteLength(content) }
}

export const writeDocument = async (root: string, id: string, content: string): Promise<WriteResult> => {
  await writeFile(documentPath(root, id), content, "utf8")
  return { id, bytes: Buffer.byteLength(content) }
}

export const parseServerEnvironment = (): { readonly port: number; readonly root: string } => {
  const port = Number(process.env.PORT)
  const root = process.env.BENCH_ROOT
  if (!Number.isInteger(port) || port < 1 || port > 65_535 || root === undefined) {
    throw new Error("PORT and BENCH_ROOT must be set by the benchmark runner")
  }
  return { port, root }
}

interface MetricsStartMessage {
  readonly type: "metrics:start"
  readonly id: number
}

interface MetricsStopMessage {
  readonly type: "metrics:stop"
  readonly id: number
}

export interface ServerMetrics {
  readonly eventLoopUtilization: number
  readonly userCpuMicros: number
  readonly systemCpuMicros: number
  readonly rssBytes: number
}

export type MetricsResponse =
  | { readonly type: "metrics:started"; readonly id: number }
  | { readonly type: "metrics:stopped"; readonly id: number; readonly metrics: ServerMetrics }

export const installServerMetrics = (): void => {
  let eventLoopStart: ReturnType<typeof performance.eventLoopUtilization> | undefined
  let cpuStart: NodeJS.CpuUsage | undefined

  process.on("message", (message: MetricsStartMessage | MetricsStopMessage) => {
    if (message === null || typeof message !== "object" || !("type" in message) || !("id" in message)) {
      return
    }
    if (message.type === "metrics:start") {
      eventLoopStart = performance.eventLoopUtilization()
      cpuStart = process.cpuUsage()
      process.send?.({ type: "metrics:started", id: message.id } satisfies MetricsResponse)
      return
    }
    if (message.type === "metrics:stop" && eventLoopStart !== undefined && cpuStart !== undefined) {
      const eventLoop = performance.eventLoopUtilization(eventLoopStart)
      const cpu = process.cpuUsage(cpuStart)
      process.send?.(
        {
          type: "metrics:stopped",
          id: message.id,
          metrics: {
            eventLoopUtilization: eventLoop.utilization,
            userCpuMicros: cpu.user,
            systemCpuMicros: cpu.system,
            rssBytes: process.memoryUsage.rss()
          }
        } satisfies MetricsResponse
      )
    }
  })
}
