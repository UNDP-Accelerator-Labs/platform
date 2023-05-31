#!/usr/bin/env bash

if output=$(git status --porcelain) && ! [ -z "$output" ]; then
    echo "working copy is not clean" >&2
    exit 1
fi

if ! git diff --exit-code 2>&1 >/dev/null && git diff --cached --exit-code 2>&1 >/dev/null ; then
    echo "working copy is not clean" >&2
    exit 2
fi

if ! git diff-index --quiet HEAD -- ; then
    echo "there are uncommitted files" >&2
    exit 3
fi
