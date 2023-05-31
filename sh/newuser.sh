#!/usr/bin/env bash

cd -- "$( dirname -- "${BASH_SOURCE[0]}" )/../" &> /dev/null

ARG=$1

if [ ! -z "$ARG" ]; then
    echo "$0"
    echo "interactively creates a new user in the login db (as specified in the env file)"
    exit 1
fi

source ./sh/env.sh

quote () {  # <string>
    if [ -z "$1" ]; then
        echo "''"
    else
        printf \''%q'\' "$1"
    fi
}

read_var () {  # <variable> <prompt> <default> <is_secure>
    local VAR_NAME=$1
    local PROMPT=$2
    local DEFAULT=$3
    local IS_SECURE=$4
    if [ ! -z "${DEFAULT}" ]; then
        PROMPT="${PROMPT} (${DEFAULT}):"
    else
        PROMPT="${PROMPT}:"
    fi
    local OUT=
    while [ -z "${OUT}" ]; do
        if [ "${IS_SECURE}" == 0 ]; then
            read -p "${PROMPT}" OUT
        else
            read -s -p "${PROMPT}" OUT
            echo ""
            if [ -z "${DEFAULT}" ]; then
                break
            fi
        fi
        if [ -z "${OUT}" ]; then
            if [ -z "${DEFAULT}" ]; then
                echo "Value is required!"
            else
                OUT="${DEFAULT}"
            fi
        fi
    done
    if [ ! -z "${OUT}" ]; then
        OUT=$(printf '%q' "${OUT}")
    fi
    eval "${VAR_NAME}=${OUT}"
}

read_var USER_NAME "Full Name" "" 0
read_var USER_EMAIL "Email" "" 0
read_var USER_POS "Position" "" 0
read_var USER_ISO "ISO3 Country" "NUL" 0
read_var USER_PERM "Permissions" 3 0
read_var USER_PW "Password" "" 1

SQL=$(cat <<EOF
INSERT INTO users (iso3, position, name, email, password, rights)
VALUES (
    $(quote "${USER_ISO}"),
    $(quote "${USER_POS}"),
    $(quote "${USER_NAME}"),
    $(quote "${USER_EMAIL}"),
    crypt($(quote "${USER_PW}"), GEN_SALT('bf', 8)),
    $(quote "${USER_PERM}"));
EOF)

./sh/psql.sh "${SQL}"
