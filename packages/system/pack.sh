#!/bin/sh
cd dist;
npm pack;
rm -rf ../effect-ts-system-0.51.6.tgz;
mv effect-ts-system-0.51.6.tgz ..;