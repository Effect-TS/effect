#!/bin/sh
if yarn prettier --write "./packages*/**/{src,demo,tests}/**/*.ts"
then
echo "All prettified"
else
echo "ERROR: Prettifying failed"
exit 1
fi

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
