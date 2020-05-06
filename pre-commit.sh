#!/bin/sh
yarn prettier --write "./packages*/**/{src,demo,tests}/**/*.ts"
git add --all

if yarn yarn-deduplicate -fl
then
echo "No duplicates found. Pursuing..."
else
echo "ERROR: Lockfile contains duplicates!"
echo "deduplicating..."
yarn yarn-deduplicate
yarn
echo "deduplication finished"
exit 1
fi
