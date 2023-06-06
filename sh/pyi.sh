#!/usr/bin/env bash

cd -- "$( dirname -- "${BASH_SOURCE[0]}" )/../" &> /dev/null

PY_FILES=$(find stubs -type f -name '*.py')
echo "${PY_FILES}"
[ -z ${PY_FILES} ]
