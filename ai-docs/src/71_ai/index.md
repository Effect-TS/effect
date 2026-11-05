## Working with AI modules

Effect's AI modules provide provider-agnostic services for language models,
speech synthesis, recorded-audio transcription and realtime conversations. You
can generate text, decode structured objects with `Schema`, stream speech, or
compose a recording → transcription → language model → speech workflow.

The voice examples below run from the repository root with Node.js and an
`OPENAI_API_KEY` supplied through your environment or secret manager. They read
credentials with `Config.Redacted`; never place a key in an example or browser
bundle. `OpenAiClientGenerated` provides speech and recorded transcription,
while `OpenAiClient` provides language generation and Realtime. Both require an
HTTP client; server-side Realtime also requires a WebSocket constructor such as
`NodeWS.layerWebSocketConstructor`.

Run `node ai-docs/src/71_ai/40_speech.ts` to write `announcement.mp3`, or configure
`VOICE_INPUT_FILE` with the path to a WAV recording and run
`node ai-docs/src/71_ai/50_voice-pipeline.ts` to write `voice-answer.wav`. Run
`node ai-docs/src/71_ai/60_realtime.ts` to write headerless PCM16LE mono audio at
24 kHz to `realtime-answer.pcm`. `VOICE_TEXT` and `VOICE_OUTPUT_FILE` customize the
applicable examples.

Recorded transcription uploads a complete audio file. Realtime uses a scoped,
bidirectional session; it does not supply microphone capture or speaker
playback. Audio generation completion and audible playback completion are
different boundaries. Applications own playback queues, interruption, tool
authorization and durable conversation records. No example automatically
retries business actions or executes a tool merely because the model requested
it.
