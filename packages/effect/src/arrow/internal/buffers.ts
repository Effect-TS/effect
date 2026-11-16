/**
 * Typed views of byte buffers, shared by validation and value readers.
 *
 * IPC buffers are byte ranges of the input, which may start at any address.
 * A typed array needs its element alignment, so an unaligned buffer is
 * copied once; the view is cached per buffer, so validation and every reader
 * of that buffer share one view (and at most one copy).
 *
 * @internal
 */

/** @internal */
export type TypedArrayConstructor<A> = {
  new(buffer: ArrayBuffer, byteOffset: number, length: number): A
  readonly BYTES_PER_ELEMENT: number
}

const caches = new Map<TypedArrayConstructor<unknown>, WeakMap<Uint8Array, unknown>>()

/** A typed view of `bytes`: in place when aligned, a cached copy otherwise. @internal */
export const typed = <A>(Ctor: TypedArrayConstructor<A>, bytes: Uint8Array): A => {
  let cache = caches.get(Ctor) as WeakMap<Uint8Array, A> | undefined
  if (cache === undefined) {
    cache = new WeakMap()
    caches.set(Ctor, cache)
  }
  let view = cache.get(bytes)
  if (view === undefined) {
    const width = Ctor.BYTES_PER_ELEMENT
    const length = Math.floor(bytes.byteLength / width)
    view = bytes.byteOffset % width === 0
      ? new Ctor(bytes.buffer as ArrayBuffer, bytes.byteOffset, length)
      : new Ctor(bytes.slice(0, length * width).buffer, 0, length)
    cache.set(bytes, view)
  }
  return view
}
