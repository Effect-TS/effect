# @effect/chat-whatsapp

A [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) adapter for `effect/chat`, for one business phone number. Includes the webhook, a pure normaliser for your own transport, a minimal Graph API client, delivery keys, template messages and read receipts.

## Installation

```sh
npm install effect @effect/chat-whatsapp
```

## Signature verification

`WhatsAppChat.layerWebhook` requires the `Mac` service; the adapter does not
provide a default. Supply `NodeCrypto.layerMac` from
`@effect/platform-node/NodeCrypto`, `BunCrypto.layerMac`,
`DenoCrypto.layerMac`, or `BrowserCrypto.layerMac` from the corresponding
platform package.

For other runtimes such as Workers, provide
`Mac.layerWebCrypto.pipe(Layer.provide(SecureRandom.layerWebCrypto))`.

## Known limits

- Groups are not supported. Group webhooks are logged and dropped, and an op on a group address fails.
- WhatsApp has no edit or delete, so a streamed reply is posted part by part.
- Outside the 24 hour customer service window only templates can be sent, with `WhatsAppChat.sendTemplate`.
- Not yet checked against the live API: the unit Meta counts text limits in, how the rendered formatting shows, a `.md` file sent as `text/plain`, whether error 131047 comes back on the send or as a later status, the webhook's real timeout, and how a media header renders beside buttons.

## Links

- [Website](https://effect.website): documentation, guides, and news.
- [Reference](https://effect.website/docs/v4/api/chat-whatsapp): API documentation for this package.
- [Discord](https://discord.gg/effect-ts): ask questions, share what you're building, and talk to the core team.
- [Community](https://effect.website/community-hub): meetups and events, or bring Effect to your own.
- [Issues](https://github.com/Effect-TS/effect/issues): bug reports and feature requests.

## Let's talk

Whether your team is considering Effect, rolling it out, or already running it in production, we'd love to hear from you: what you're building, what works, and what you need from Effect next.

- **Talk to the maintainers.** Introduce your team on [Discord](https://discord.gg/effect-ts) or email [contact@effectful.co](mailto:contact@effectful.co). We're happy to connect privately on Slack or Discord for feedback and help with adoption.
- **Production support.** We're exploring how to better support teams running Effect in production. If your organization has specific support needs, let's discuss them.
- **Adoption help.** Our [adoption partners](https://effect.website/adoption-partners) offer implementation, consulting, team extension, training, and commercial support.
