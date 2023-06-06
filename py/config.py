from typing import TYPE_CHECKING, TypedDict

from py.misc.env import envload_int, envload_str


if TYPE_CHECKING:
    from py.db.db import DBConfig


Config = TypedDict('Config', {
    "db": 'DBConfig',
    "opencage": str,
})


CONFIG: Config | None = None


def get_config() -> Config:
    global CONFIG

    if CONFIG is not None:
        return CONFIG

    config: 'Config' = {
        "db": {
            "dialect": "postgresql",
            "dbname": envload_str("LOGIN_DB_NAME"),
            "port": envload_int("LOGIN_DB_PORT"),
            "host": envload_str("LOGIN_DB_HOST"),
            "user": envload_str("LOGIN_DB_USERNAME"),
            "passwd": envload_str("LOGIN_DB_PASSWORD"),
            "schema": "public",
        },
        "opencage": envload_str("OPENCAGE_API"),
    }
    CONFIG = config
    return CONFIG
