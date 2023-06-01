#!/usr/bin/env bash

cd -- "$( dirname -- "${BASH_SOURCE[0]}" )/../" &> /dev/null

SQL=$1

if [ -z "${SQL}" ]; then
    echo "$0 <sql>"
    echo "executes the given sql command on the login db from the env file"
    echo "if the command starts with 'file:' it is interpreted as sql file location"
    echo "the password must be typed manually"
    exit 1
fi

source ./sh/env.sh

SQL_FILE="${SQL#file:}"

if [ "${SQL}" == "${SQL_FILE}" ]; then
    psql \
        -d "host=${LOGIN_DB_HOST} port=${LOGIN_DB_PORT} dbname=${LOGIN_DB_NAME} user=${LOGIN_DB_USERNAME}" \
        -c "${SQL}"
else
    cat "${SQL_FILE}"
    psql \
        -d "host=${LOGIN_DB_HOST} port=${LOGIN_DB_PORT} dbname=${LOGIN_DB_NAME} user=${LOGIN_DB_USERNAME}" \
        -f "${SQL_FILE}"
fi
