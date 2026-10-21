import * as BrowserLogin from "@effect/auth/BrowserLogin"
import { markAuthFailureReported, reportAuthFailure } from "@effect/auth/Persistence"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { app, type Event, shell } from "electron"

const unavailable = () => BrowserLogin.PlatformError.make({ reason: "unavailable" })

const redactDefects = <Failure>(project: () => Cause.Reason<Failure>) => <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.uninterruptibleMask((restore) =>
    restore(effect).pipe(
      Effect.catchCause((cause) => {
        if (!Cause.hasDies(cause)) return Effect.failCause(cause)

        return reportAuthFailure("browser-login", cause).pipe(
          Effect.andThen(
            Effect.failCause(
              markAuthFailureReported(
                Cause.fromReasons<E | Failure>(
                  cause.reasons.map((reason) => (Cause.isDieReason(reason) ? project() : reason))
                )
              )
            )
          )
        )
      })
    )
  )

const browserBoundary = redactDefects(() => Cause.makeFailReason(unavailable()))
const cleanupBoundary = redactDefects<never>(() => Cause.makeDieReason(unavailable()))

const optionsSchema = Schema.Struct({
  hostedUrl: BrowserLogin.HostedUrl,
  returnUrl: BrowserLogin.ReturnUrl
})

/**
 * Acquire synchronously in the main process BEFORE app.whenReady(), under the
 * application's Scope. The host must already hold app.requestSingleInstanceLock().
 * No import-time listeners, protocol registration, or external browser launch.
 * HTTPS callbacks require packaged macOS with signed associated domains and a
 * matching website association. Only OS-delivered Universal Links are accepted;
 * this adapter cannot preflight the OS association. Custom schemes require a
 * packaged Info.plist on macOS or installed .desktop handler on Linux. Windows
 * also supports the default Electron executable in development.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const makeBrowser = Effect.fnUntraced(function*(options: typeof optionsSchema.Type) {
  if (process.type !== "browser" || !app.hasSingleInstanceLock()) return yield* unavailable()

  const config = yield* Schema.decodeEffect(optionsSchema)(options).pipe(
    Effect.mapError(unavailable)
  )

  const target = new URL(config.returnUrl)
  const scheme = target.protocol.slice(0, -1)
  const universalLink = scheme === "https"

  if (universalLink && (process.platform !== "darwin" || !app.isPackaged || target.port !== "")) {
    return yield* unavailable()
  }

  const callbackSchema = Schema.String.check(
    Schema.isMaxLength(2304),
    Schema.makeFilter((text) => {
      try {
        const url = new URL(text)
        const keys = [...url.searchParams.keys()]

        if (
          url.href !== text ||
          url.username ||
          url.password ||
          url.hash ||
          keys.length !== 2 ||
          !keys.includes("code") ||
          !keys.includes("state") ||
          !Schema.is(BrowserLogin.Random)(url.searchParams.get("code")) ||
          !Schema.is(BrowserLogin.Random)(url.searchParams.get("state"))
        ) {
          return false
        }
        url.search = ""

        return url.href === config.returnUrl
      } catch {
        return false
      }
    })
  )

  const openSchema = Schema.Struct({
    returnUrl: Schema.Literal(config.returnUrl),
    ephemeral: Schema.Literal(false),
    url: Schema.String.check(
      Schema.isMaxLength(config.hostedUrl.length + "?attempt=".length + 43),
      Schema.makeFilter((text) => {
        try {
          const url = new URL(text)

          if (
            url.href !== text ||
            url.hash ||
            [...url.searchParams.keys()].join() !== "attempt" ||
            !Schema.is(BrowserLogin.Random)(url.searchParams.get("attempt"))
          ) {
            return false
          }
          url.search = ""

          return url.href === config.hostedUrl
        } catch {
          return false
        }
      })
    )
  })

  const queued: Array<string> = []
  let receive: ((url: string) => void) | undefined
  let close: (() => void) | undefined
  let disposed = false

  const capture = (url: string) => {
    if (disposed || !Schema.is(callbackSchema)(url)) return
    if (receive !== undefined) receive(url)
    else if (!queued.includes(url) && queued.length < 8) queued.push(url)
  }

  const openUrl = (event: Event, url: string) => {
    if (!Schema.is(callbackSchema)(url)) return
    event.preventDefault()
    capture(url)
  }

  const secondInstance = (_event: Event, argv: Array<string>) => {
    for (const arg of argv) capture(arg)
  }

  const activitySchema = Schema.Struct({ webpageURL: callbackSchema })

  const continueActivity = (event: Event, type: string, _userInfo: unknown, details: unknown) => {
    if (type !== "NSUserActivityTypeBrowsingWeb" || !Schema.is(activitySchema)(details)) return
    event.preventDefault()
    capture(details.webpageURL)
  }

  // Register cleanup before installing listeners so partial acquisition is owned.
  // Each release is attempted even when an earlier platform removal throws.
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      disposed = true
      queued.length = 0
    }).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          if (universalLink) app.removeListener("continue-activity", continueActivity)
          else app.removeListener("open-url", openUrl)
        })
      ),
      Effect.ensuring(
        Effect.sync(() => {
          if (!universalLink) app.removeListener("second-instance", secondInstance)
        })
      ),
      Effect.ensuring(Effect.sync(() => close?.())),
      cleanupBoundary
    )
  )
  yield* Effect.sync(() => {
    if (universalLink) app.on("continue-activity", continueActivity)
    else {
      app.on("open-url", openUrl)
      app.on("second-instance", secondInstance)
      for (const arg of process.argv) capture(arg)
    }
  })

  const prepare = Effect.sync(() => {
    if (!app.isReady() || disposed) return false
    // Associated domains are verified by macOS when routing the callback.
    // Registering as the default HTTPS handler would not establish ownership.
    if (universalLink) return process.platform === "darwin" && app.isPackaged
    if (process.platform === "linux") return app.isPackaged && app.isDefaultProtocolClient(scheme)
    if (process.platform === "darwin") {
      return (
        app.isPackaged &&
        app.setAsDefaultProtocolClient(scheme) &&
        app.isDefaultProtocolClient(scheme)
      )
    }
    if (process.platform !== "win32") return false
    const args = process.defaultApp ? [app.getAppPath()] : []

    return (
      app.setAsDefaultProtocolClient(scheme, process.execPath, args) &&
      app.isDefaultProtocolClient(scheme, process.execPath, args)
    )
  }).pipe(Effect.flatMap((available) => (available ? Effect.void : Effect.fail(unavailable()))))

  return BrowserLogin.Browser.of({
    open: Effect.fnUntraced(function*(input) {
      const request = yield* Schema.decodeUnknownEffect(openSchema)(input).pipe(
        Effect.mapError(unavailable)
      )

      yield* prepare

      return yield* Effect.callback<string, BrowserLogin.PlatformError>((resume) => {
        if (receive !== undefined) {
          resume(Effect.fail(BrowserLogin.PlatformError.make({ reason: "busy" })))

          return
        }
        let active = true

        const cleanup = () => {
          if (!active) return
          active = false
          receive = undefined
          close = undefined
        }

        const finish = (result: Effect.Effect<string, BrowserLogin.PlatformError>) => {
          if (active) {
            cleanup()
            resume(result)
          }
        }

        receive = (url) => finish(Effect.succeed(url))
        close = () => finish(Effect.fail(unavailable()))
        const pending = queued.shift()

        if (pending !== undefined) receive(pending)
        else {
          try {
            void shell.openExternal(request.url).catch((error) => finish(Effect.die(error)))
          } catch (error) {
            finish(Effect.die(error))
          }
        }

        return Effect.sync(cleanup)
      }).pipe(
        Effect.timeoutOrElse({
          duration: "10 minutes",
          orElse: () => Effect.fail(BrowserLogin.PlatformError.make({ reason: "expired" }))
        })
      )
    }, browserBoundary)
  })
}, browserBoundary)

/**
 * Build before app readiness, or use makeBrowser for synchronous startup capture.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layerBrowser = (options: typeof optionsSchema.Type) =>
  Layer.effect(BrowserLogin.Browser, makeBrowser(options))
