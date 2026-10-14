import * as Effect from "../../Effect.ts"
import { identity } from "../../Function.ts"
import * as Stream from "../../Stream.ts"
import * as HttpBody from "../HttpBody.ts"
import type {
  CompressionAlgorithm as ClientCompressionAlgorithm,
  CompressionOptions as ClientCompressionOptions
} from "../HttpClientRequest.ts"
import { compressionTransformWeb } from "./compressionStream.ts"

/**
 * @internal
 */
export const compressBody = (
  body: HttpBody.HttpBody,
  algorithm: ClientCompressionAlgorithm,
  options?: ClientCompressionOptions | undefined
): Effect.Effect<HttpBody.HttpBody> =>
  Effect.suspend((): Effect.Effect<HttpBody.HttpBody> => {
    if (body._tag !== "Uint8Array" && body._tag !== "Stream") {
      return Effect.succeed(body)
    }
    if (body.contentLength !== undefined && body.contentLength < (options?.minSize ?? 1024)) {
      return Effect.succeed(body)
    }
    if (body._tag === "Uint8Array") {
      return Effect.map(
        Effect.promise(() =>
          new globalThis.Response(
            compressionTransformWeb(algorithm)(
              new ReadableStream<Uint8Array>({
                start(controller) {
                  controller.enqueue(body.body)
                  controller.close()
                }
              })
            )
          ).arrayBuffer()
        ),
        (buffer) => HttpBody.uint8Array(new Uint8Array(buffer), body.contentType)
      )
    }
    return Effect.succeed(HttpBody.stream(
      Stream.fromReadableStream({
        evaluate: () => compressionTransformWeb(algorithm)(Stream.toReadableStream(body.stream)),
        onError: identity
      }),
      body.contentType
    ))
  })
