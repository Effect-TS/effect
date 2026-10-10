# OpenSSH server for the OpenSsh backend integration tests. socat runs echo
# servers on 127.0.0.1:7000 and /tmp/echo.sock inside the container so
# forwarding can be tested, and the `echo` subsystem runs `cat`.
FROM alpine:3.22
RUN apk add --no-cache openssh-server socat \
  && ssh-keygen -q -t ed25519 -N "" -f /etc/ssh/ssh_host_ed25519_key \
  && adduser -D -s /bin/sh effect \
  && sed -i 's/^effect:!/effect:*/' /etc/shadow
COPY sshd_config /etc/ssh/sshd_config
COPY entrypoint.sh /entrypoint.sh
EXPOSE 22
ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
