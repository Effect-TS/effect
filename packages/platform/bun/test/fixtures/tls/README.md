These RSA fixtures cover trusted TLS connections through Bun's Node compatibility
APIs. The existing Node and Deno Ed25519 fixtures remain independent.

Regenerate both files from the repository root:

```sh
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 36500 \
  -subj /CN=localhost \
  -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1' \
  -addext 'basicConstraints=critical,CA:TRUE' \
  -keyout packages/platform/bun/test/fixtures/tls/key.pem \
  -out packages/platform/bun/test/fixtures/tls/cert.pem
```

The private key belongs only to this local test fixture.
