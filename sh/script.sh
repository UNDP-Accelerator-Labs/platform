#!/usr/bin/env bash

cd -- "$( dirname -- "${BASH_SOURCE[0]}" )/../" &> /dev/null

if [ -z "${CMD}" ]; then
    echo "specify a file via CMD"
    exit 1
fi

source ./sh/env.sh

cd routes/scripts/shared/

node "${CMD}" "$@"
