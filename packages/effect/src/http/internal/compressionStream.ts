/**
 * @internal
 */
export const compressionTransformWeb =
  (format: string) => (stream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> =>
    stream.pipeThrough(
      new CompressionStream(format as CompressionFormat) as unknown as ReadableWritablePair<Uint8Array, Uint8Array>
    )
