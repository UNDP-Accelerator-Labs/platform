#!/usr/bin/env bash

if [ -z "$CMD" ]; then
    echo "specify a command via CMD"
    exit 1
fi

source ./sh/env.sh

npm run $CMD $@
