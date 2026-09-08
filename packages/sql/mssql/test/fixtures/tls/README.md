# Disposable TLS test identity

This is a public, non-production RSA key and self-signed localhost certificate
for the TDS TLS peer tests. Never use this key for a deployment. RSA is used
because the repository's Ed25519 fixtures cannot negotiate TLS 1.2 with Bun's
BoringSSL implementation.

Generated with:

```sh
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem \
  -days 36500 -subj /CN=localhost -addext subjectAltName=DNS:localhost,IP:127.0.0.1
```
