# Stubs for pandas.io.sql (Python 3)
#
# NOTE: This dynamically typed stub was automatically generated by stubgen.
# pylint: disable=unused-argument,redefined-outer-name,invalid-name
# pylint: disable=relative-beyond-top-level,arguments-differ
# pylint: disable=no-member,too-few-public-methods,keyword-arg-before-vararg
# pylint: disable=super-init-not-called,abstract-method,redefined-builtin
# pylint: disable=unused-import,useless-import-alias,signature-differs
# pylint: disable=blacklisted-name,c-extension-no-member,import-error

from typing import Any, Optional

from pandas.core.base import PandasObject


class SQLAlchemyRequired(ImportError):
    ...


class DatabaseError(IOError):
    ...


def execute(
        sql: Any, con: Any, cur: Optional[Any] = ...,
        params: Optional[Any] = ...) -> Any:
    ...


def read_sql_table(
        table_name: Any, con: Any, schema: Optional[Any] = ...,
        index_col: Optional[Any] = ..., coerce_float: bool = ...,
        parse_dates: Optional[Any] = ...,
        columns: Optional[Any] = ...,
        chunksize: Optional[Any] = ...) -> Any:
    ...


def read_sql_query(
        sql: Any, con: Any, index_col: Optional[Any] = ...,
        coerce_float: bool = ..., params: Optional[Any] = ...,
        parse_dates: Optional[Any] = ...,
        chunksize: Optional[Any] = ...) -> Any:
    ...


def read_sql(
        sql: Any, con: Any, index_col: Optional[Any] = ...,
        coerce_float: bool = ..., params: Optional[Any] = ...,
        parse_dates: Optional[Any] = ..., columns: Optional[Any] = ...,
        chunksize: Optional[Any] = ...) -> Any:
    ...


def to_sql(
        frame: Any, name: Any, con: Any, schema: Optional[Any] = ...,
        if_exists: str = ..., index: bool = ...,
        index_label: Optional[Any] = ..., chunksize: Optional[Any] = ...,
        dtype: Optional[Any] = ..., method: Optional[Any] = ...) -> None:
    ...


def has_table(table_name: Any, con: Any, schema: Optional[Any] = ...) -> Any:
    ...


table_exists = has_table


def pandasSQL_builder(
        con: Any, schema: Optional[Any] = ...,
        meta: Optional[Any] = ..., is_cursor: bool = ...) -> Any:
    ...


class SQLTable(PandasObject):
    name: Any = ...
    pd_sql: Any = ...
    prefix: Any = ...
    frame: Any = ...
    index: Any = ...
    schema: Any = ...
    if_exists: Any = ...
    keys: Any = ...
    dtype: Any = ...
    table: Any = ...

    def __init__(
            self, name: Any, pandas_sql_engine: Any,
            frame: Optional[Any] = ..., index: bool = ...,
            if_exists: str = ..., prefix: str = ...,
            index_label: Optional[Any] = ..., schema: Optional[Any] = ...,
            keys: Optional[Any] = ...,
            dtype: Optional[Any] = ...) -> None:
        ...

    def exists(self) -> Any:
        ...

    def sql_schema(self) -> Any:
        ...

    def create(self) -> None:
        ...

    def insert_data(self) -> Any:
        ...

    def insert(
            self, chunksize: Optional[Any] = ...,
            method: Optional[Any] = ...) -> None:
        ...

    def read(
            self, coerce_float: bool = ..., parse_dates: Optional[Any] = ...,
            columns: Optional[Any] = ...,
            chunksize: Optional[Any] = ...) -> Any:
        ...


class PandasSQL(PandasObject):
    def read_sql(self, *args: Any, **kwargs: Any) -> None:
        ...

    def to_sql(self, *args: Any, **kwargs: Any) -> None:
        ...


class SQLDatabase(PandasSQL):
    connectable: Any = ...
    meta: Any = ...

    def __init__(
            self, engine: Any, schema: Optional[Any] = ...,
            meta: Optional[Any] = ...) -> None:
        ...

    def run_transaction(self) -> None:
        ...

    def execute(self, *args: Any, **kwargs: Any) -> Any:
        ...

    def read_table(
            self, table_name: Any, index_col: Optional[Any] = ...,
            coerce_float: bool = ..., parse_dates: Optional[Any] = ...,
            columns: Optional[Any] = ..., schema: Optional[Any] = ...,
            chunksize: Optional[Any] = ...) -> Any:
        ...

    def read_query(
            self, sql: Any, index_col: Optional[Any] = ...,
            coerce_float: bool = ..., parse_dates: Optional[Any] = ...,
            params: Optional[Any] = ...,
            chunksize: Optional[Any] = ...) -> Any:
        ...

    read_sql: Any = ...

    @property
    def tables(self) -> Any:
        ...

    def has_table(self, name: Any, schema: Optional[Any] = ...) -> Any:
        ...

    def get_table(self, table_name: Any, schema: Optional[Any] = ...) -> Any:
        ...

    def drop_table(self, table_name: Any, schema: Optional[Any] = ...) -> None:
        ...


class SQLiteTable(SQLTable):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        ...

    def sql_schema(self) -> Any:
        ...

    def insert_statement(self) -> Any:
        ...


class SQLiteDatabase(PandasSQL):
    is_cursor: Any = ...
    con: Any = ...

    def __init__(self, con: Any, is_cursor: bool = ...) -> None:
        ...

    def run_transaction(self) -> None:
        ...

    def execute(self, *args: Any, **kwargs: Any) -> Any:
        ...

    def read_query(
            self, sql: Any, index_col: Optional[Any] = ...,
            coerce_float: bool = ..., params: Optional[Any] = ...,
            parse_dates: Optional[Any] = ...,
            chunksize: Optional[Any] = ...) -> Any:
        ...

    def has_table(self, name: Any, schema: Optional[Any] = ...) -> Any:
        ...

    def get_table(self, table_name: Any, schema: Optional[Any] = ...) -> None:
        ...

    def drop_table(self, name: Any, schema: Optional[Any] = ...) -> None:
        ...


def get_schema(
        frame: Any, name: Any, keys: Optional[Any] = ...,
        con: Optional[Any] = ..., dtype: Optional[Any] = ...) -> Any:
    ...
