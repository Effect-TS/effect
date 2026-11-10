/**
 * PROTOTYPE (EFF-3558). The only public constructors of a `Loader.Snapshot`,
 * so a Story or a test can send a watch's message without a cache.
 *
 * @stability experimental
 * @since 4.1.3
 */
import * as Cause from "../../Cause.ts"
import * as Option from "../../Option.ts"
import * as AsyncResult from "../../reactivity/AsyncResult.ts"
import * as snapshots from "../../reactivity/internal/loaderSnapshot.ts"
import type * as Loader from "../../reactivity/Loader.ts"

const LoaderTypeId: typeof Loader.TypeId = "~effect/reactivity/Loader"

/**
 * A snapshot holding a Success for `args`, as the watch of the field `label` would send it.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const success = <Read extends Loader.AnyDefinition, const Label extends string>(
  read: Read,
  label: Label,
  args: Loader.ArgsOf<Read>,
  value: Loader.SuccessOf<Read>,
  options?: { readonly waiting?: boolean | undefined; readonly timestamp?: number | undefined }
): Loader.Snapshot<Read, Label> =>
  snapshots.makeSnapshot(
    read,
    label,
    read[LoaderTypeId].argsKey(args),
    AsyncResult.success(value, { waiting: options?.waiting, timestamp: options?.timestamp ?? 0 })
  )

/**
 * A snapshot holding a typed Failure for `args`, over `previous` if given.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const failure = <Read extends Loader.AnyDefinition, const Label extends string>(
  read: Read,
  label: Label,
  args: Loader.ArgsOf<Read>,
  error: Loader.ErrorOf<Read>,
  options?: { readonly waiting?: boolean | undefined; readonly previous?: Loader.SuccessOf<Read> | undefined }
): Loader.Snapshot<Read, Label> =>
  snapshots.makeSnapshot(
    read,
    label,
    read[LoaderTypeId].argsKey(args),
    AsyncResult.failure(Cause.fail(error), {
      waiting: options?.waiting,
      previousSuccess: options?.previous === undefined
        ? Option.none()
        : Option.some(AsyncResult.success(options.previous, { timestamp: 0 }))
    })
  )
