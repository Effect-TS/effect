/**
 * @title Acquiring resources with Effect.acquireRelease
 *
 * Define a service that uses `Effect.acquireRelease` to manage the lifecycle of
 * a resource, ensuring that it is properly cleaned up when the service is no
 * longer needed.
 */
import { Config, Context, Effect, Layer, Redacted, Schema } from "effect"
import * as NodeMailer from "nodemailer"

export class SmtpError extends Schema.Error<SmtpError>("SmtpError")({
  cause: Schema.Defect()
}) {}

const SmtpTypeId = "~app/Smtp"

export interface Smtp {
  readonly [SmtpTypeId]: typeof SmtpTypeId

  send(message: {
    readonly to: string
    readonly subject: string
    readonly body: string
  }): Effect.Effect<void, SmtpError>
}

/**
 * Service key for `Smtp` implementations.
 *
 * @category services
 * @since 4.0.0
 */
export const Smtp = (() => {
  const service = Context.Service<Smtp>("app/Smtp")
  return Object.assign(service, {
    layer: Layer.effect(
      service,
      Effect.gen(function*() {
        const user = yield* Config.String("SMTP_USER")
        const pass = yield* Config.Redacted("SMTP_PASS")

        // Use `Effect.acquireRelease` to manage the lifecycle of the SMTP
        // transporter.
        //
        // When the Layer is built, the transporter will be created. When the
        // Layer is torn down, the transporter will be closed, ensuring that
        // resources are always cleaned up properly.
        const transporter = yield* Effect.acquireRelease(
          Effect.sync(() =>
            NodeMailer.createTransport({
              host: "smtp.example.com",
              port: 587,
              secure: false,
              auth: { user, pass: Redacted.value(pass) }
            })
          ),
          (transporter) => Effect.sync(() => transporter.close())
        )

        const send = Effect.fn("Smtp.send")((message: {
          readonly to: string
          readonly subject: string
          readonly body: string
        }) =>
          Effect.tryPromise({
            try: () =>
              transporter.sendMail({
                from: "Acme Cloud <cloud@acme.com>",
                to: message.to,
                subject: message.subject,
                text: message.body
              }),
            catch: (cause) => new SmtpError({ cause })
          }).pipe(
            Effect.asVoid
          )
        )

        return service.of({
          [SmtpTypeId]: SmtpTypeId as typeof SmtpTypeId,
          send
        })
      })
    )
  })
})()

// We can then use the `Smtp` service in another service, and the transporter
// will be properly managed by the Layer system.

export class MailerError extends Schema.TaggedError<MailerError>()("MailerError", {
  reason: SmtpError
}) {}

const MailerTypeId = "~app/Mailer"

export interface Mailer {
  readonly [MailerTypeId]: typeof MailerTypeId

  sendWelcomeEmail(to: string): Effect.Effect<void, MailerError>
}

/**
 * Service key for `Mailer` implementations.
 *
 * @category services
 * @since 4.0.0
 */
export const Mailer = (() => {
  const service = Context.Service<Mailer>("app/Mailer")
  const service1 = Object.assign(service, {
    layerNoDeps: Layer.effect(
      service,
      Effect.gen(function*() {
        const smtp = yield* Smtp

        const sendWelcomeEmail = Effect.fn("Mailer.sendWelcomeEmail")(function*(to: string) {
          yield* smtp.send({
            to,
            subject: "Welcome to Acme Cloud!",
            body: "Thanks for signing up for Acme Cloud. We're glad to have you!"
          }).pipe(
            Effect.mapError((reason) => new MailerError({ reason }))
          )
          yield* Effect.logInfo(`Sent welcome email to ${to}`)
        })

        return service.of({
          [MailerTypeId]: MailerTypeId as typeof MailerTypeId,
          sendWelcomeEmail
        })
      })
    )
  })
  const service2 = Object.assign(service1, {
    // Locally provide the Smtp layer to the Mailer layer, to eliminate all the
    // requirements
    layer: service1.layerNoDeps.pipe(
      Layer.provide(Smtp.layer)
    )
  })
  return service2
})()
