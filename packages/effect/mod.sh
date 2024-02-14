#!/bin/bash
dirs=(../typeclass/src ../typeclass/test ../typeclass/dtslint)
for dir in ${dirs[@]};
do
echo Refactoring $dir
files=$(find $dir -type f \( -name "*.ts" -o -name "*.tsx" \) | xargs ls)
npx jscodeshift \
    -t \
    ./mod.ts \
    --extensions=ts,tsx \
    --parser=ts \
    $files
done
