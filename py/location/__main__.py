import argparse
import sys

from py.location.pipeline import extract_locations
from py.misc.util import json_dump, python_module


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog=f"python -m {python_module()}",
        description="Parse locations from an input string.")
    parser.add_argument(
        "text",
        help="the input text. '-' for stdin")
    return parser.parse_args()


def run() -> None:
    args = parse_args()
    if args.text == "-":
        text = sys.stdin.read()
    else:
        text = args.text
    res = extract_locations(text)
    json_dump(res, sys.stdout)


if __name__ == "__main__":
    run()
