/**
 * PROTOTYPE (EFF-3558). The only public constructors of a `Loaded.Snapshot`,
 * so a Story or a test can send a watch's message without a cache.
 *
 * @stability experimental
 * @since 4.1.3
 */
import * as Cause from "../../Cause.ts"
import * as Option from "../../Option.ts"
import * as AsyncResult from "../../reactivity/AsyncResult.ts"
import * as Loader from "../../reactivity/Loader.ts"
import * as Loaded from "../Loaded.ts"

/**
 * A snapshot holding a Success for `args`, as a watch of `binding` would send it.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const success = <Read extends Loader.AnyDefinition, Label extends string>(
  binding: Loaded.Binding<Read, Label, any, any>,
  args: Loader.ArgsOf<Read>,
  value: Loader.SuccessOf<Read>,
  options?: { readonly waiting?: boolean | undefined; readonly timestamp?: number | undefined }
): Loaded.Snapshot<Read, Label> =>
  Loaded.makeSnapshot(
    binding.read,
    binding.label,
    binding.read[Loader.TypeId].argsKey(args),
    AsyncResult.success(value, { waiting: options?.waiting, timestamp: options?.timestamp ?? 0 })
  )

/**
 * A snapshot holding a typed Failure for `args`, over `previous` if given.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const failure = <Read extends Loader.AnyDefinition, Label extends string>(
  binding: Loaded.Binding<Read, Label, any, any>,
  args: Loader.ArgsOf<Read>,
  error: Loader.ErrorOf<Read>,
  options?: { readonly waiting?: boolean | undefined; readonly previous?: Loader.SuccessOf<Read> | undefined }
): Loaded.Snapshot<Read, Label> =>
  Loaded.makeSnapshot(
    binding.read,
    binding.label,
    binding.read[Loader.TypeId].argsKey(args),
    AsyncResult.failure(Cause.fail(error), {
      waiting: options?.waiting,
      previousSuccess: options?.previous === undefined
        ? Option.none()
        : Option.some(AsyncResult.success(options.previous, { timestamp: 0 }))
    })
  )
