# Stubs for pandas.core.accessor (Python 3)
#
# NOTE: This dynamically typed stub was automatically generated by stubgen.
# pylint: disable=unused-import,unused-argument,invalid-name,redefined-builtin
# pylint: disable=too-few-public-methods,function-redefined
# pylint: disable=redefined-outer-name,too-many-ancestors,super-init-not-called
# pylint: disable=too-many-arguments

from typing import Any


class DirNamesMixin:
    def __dir__(self) -> Any:
        ...


class PandasDelegate:
    ...


def delegate_names(
        delegate: Any, accessors: Any, typ: Any,
        overwrite: bool = ...) -> Any:
    ...


class CachedAccessor:
    def __init__(self, name: Any, accessor: Any) -> None:
        ...

    def __get__(self, obj: Any, cls: Any) -> Any:
        ...


def register_dataframe_accessor(name: Any) -> Any:
    ...


def register_series_accessor(name: Any) -> Any:
    ...


def register_index_accessor(name: Any) -> Any:
    ...