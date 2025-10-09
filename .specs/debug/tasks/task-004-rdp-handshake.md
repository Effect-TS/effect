# task-004 — Firefox/Servo RDP socket quickstart

## Objective
Publish a socket-level example that attaches to the Firefox (and Servo-compatible) Remote Debugging Protocol server, sends a `listTabs` request, and prints the reply—proving we can drive RDP without opening the GUI.

## Evidence of the Gap
- `.specs/debug/research.md:139-145` currently stops at launching the RDP server and instructing users to open `about:debugging`.
- `.specs/debug/research-firefox.md:3-26` describes actor sequencing and packet framing, implying we can script it today.
- The Servo quickstart in `.specs/debug/research.md:187-193` mirrors the Firefox instructions but still lacks a direct protocol demonstration.

## Definition of Done
- `.specs/debug/research.md` gains a runnable snippet (e.g., Python or Node) that opens a TCP socket to the RDP port, parses the initial `root` packet, issues `{"to":"root","type":"listTabs"}` (or watcher equivalent), and shows the JSON response.
- Notes cover packet framing (length-prefixed) and reference watcher/actor docs for further expansion.
- Troubleshooting section highlights failure cases (wrong port, missing `--start-debugger-server`, concurrency contract) with citations to the Firefox docs.

## Suggested Steps
1. Translate the length-prefixed framing into a minimal script (can reuse examples from Servo’s `JsonPacketStream`).
2. Document expected root handshake output and confirm the follow-up request format.
3. Update the quickstart for both Firefox and Servo in `.specs/debug/research.md`, citing `.specs/debug/research-firefox.md` and `.specs/debug/research-servo.md`.

## References
- `.specs/debug/research-firefox.md`
- `.specs/debug/research-servo.md`
- Firefox Remote Debugging Protocol docs (already cited)
