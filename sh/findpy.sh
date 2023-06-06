cd -- "$( dirname -- "${BASH_SOURCE[0]}" )/../" &> /dev/null

find py \
    \( \
    -name '*.py' -o \
    -name '*.pyi' \
    \)
