#!/bin/sh
set -e
socat TCP-LISTEN:7000,bind=127.0.0.1,fork,reuseaddr EXEC:cat &
su effect -s /bin/sh -c "socat UNIX-LISTEN:/tmp/echo.sock,fork EXEC:cat" &
exec /usr/sbin/sshd -D -e
