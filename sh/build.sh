#!/usr/bin/env bash

set -e

cd -- "$( dirname -- "${BASH_SOURCE[0]}" )/../" &> /dev/null

IMAGE_TAG="${IMAGE_TAG:-$(make -s name)}"
IMAGE_NAME="platform:${IMAGE_TAG}"
PORT="${PORT:-2000}"

make -s version-file
trap 'rm -- version.txt' EXIT

echo "building ${IMAGE_NAME}"

if [ -z "${IMAGE_LOCAL}" ]; then
    docker buildx build \
        --platform linux/amd64 \
        --build-arg "PORT=${PORT}" \
        -t "${IMAGE_NAME}" \
        -f deploy/Dockerfile \
        .
else
    docker buildx build \
        --build-arg "PORT=${PORT}" \
        -t "${IMAGE_NAME}" \
        -f deploy/Dockerfile \
        .
    IMAGE_LOCAL="local image "
fi

echo "built ${IMAGE_LOCAL}${IMAGE_NAME}"
