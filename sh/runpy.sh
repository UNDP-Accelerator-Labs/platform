#!/usr/bin/env bash

cd -- "$( dirname -- "${BASH_SOURCE[0]}" )/../" &> /dev/null

PYTHON="${PYTHON:-python3}"
CMD="$1"; shift

if [ -z "${CMD}" ]; then
    echo "$0 <app> ..."
    echo "runs a python app"
    exit 1
fi

source ./sh/env.sh

${PYTHON} -m "${CMD}" "$@"
