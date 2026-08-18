/** @internal */
import * as Context from "effect/Context"

/** @internal */
export const CurrentEntityName = Context.Reference<string | undefined>(
  "@effect/platform-cloudflare/CurrentEntityName",
  { defaultValue: () => undefined }
)

type ReplyHandler = (reply: string) => Promise<void>

const handlers = new Map<string, ReplyHandler>()

/** @internal */
export const registerReplyHandler = (requestId: string, handler: ReplyHandler): void => {
  handlers.set(requestId, handler)
}

/** @internal */
export const unregisterReplyHandler = (requestId: string): void => {
  handlers.delete(requestId)
}

/** @internal */
export const deliverReply = async (requestId: string, reply: string): Promise<boolean> => {
  const handler = handlers.get(requestId)
  if (handler === undefined) return false
  handlers.delete(requestId)
  await handler(reply)
  return true
}
