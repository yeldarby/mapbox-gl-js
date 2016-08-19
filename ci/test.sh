#!/usr/bin/env bash

source ./nvm/nvm.sh
nvm use ${NODE_VERSION}

set -eu
set -o pipefail

# add npm packages to $PATH
PATH=$(pwd)/node_modules/.bin:$PATH

# set up code coverage instrumentation
rm -rf coverage .nyc_output

# run linters
npm run lint

# build and run build tests
npm run build-min
npm run build-dev

# run unit tests
tap --reporter dot --no-coverage test/js/*/*.js test/build/webpack.test.js

# run render/query tests
node test/render.test.js
node test/query.test.js

exit $EXIT_CODE
