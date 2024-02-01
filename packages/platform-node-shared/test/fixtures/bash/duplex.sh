#!/usr/bin/env bash

function echoerr() {
  echo "$@" 1>&2
}

echo "stdout1"
echoerr "stderr1"

echo "stdout2"
echoerr "stderr2"
