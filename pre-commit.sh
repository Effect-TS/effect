#!/bin/sh
if yarn prettier "./packages*/**/{src,demo,tests}/**/*.ts"
then
echo "All prettified"
else
echo "ERROR: There's stuff left to be prettified, please fix!"
exit 1
fi

if yarn lint
then
echo "All linted"
else
echo "ERROR: There's stuff left to be lint fixed, please fix!"
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
