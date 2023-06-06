# Stubs for pandas.core.indexing (Python 3)
#
# NOTE: This dynamically typed stub was automatically generated by stubgen.
# pylint: disable=unused-import,unused-argument,invalid-name,redefined-builtin
# pylint: disable=too-few-public-methods,no-name-in-module,function-redefined
# pylint: disable=redefined-outer-name,too-many-ancestors,super-init-not-called
from typing import Any, Optional

import numpy as np
from pandas._libs.indexing import _NDFrameIndexerBase
from pandas.core.index import Index


def get_indexers_list() -> Any:
    ...


class _IndexSlice:
    def __getitem__(self, arg: Any) -> Any:
        ...


IndexSlice: Any


class IndexingError(Exception):
    ...


class _NDFrameIndexer(_NDFrameIndexerBase):
    axis: Any = ...

    def __call__(self, axis: Optional[Any] = ...) -> Any:
        ...

    def __iter__(self) -> None:
        ...

    def __getitem__(self, key: Any) -> Any:
        ...

    def __setitem__(self, key: Any, value: Any) -> None:
        ...


class _IXIndexer(_NDFrameIndexer):
    def __init__(self, name: Any, obj: Any) -> None:
        ...


class _LocationIndexer(_NDFrameIndexer):
    def __getitem__(self, key: Any) -> Any:
        ...


class _LocIndexer(_LocationIndexer):
    ...


class _iLocIndexer(_LocationIndexer):
    ...


class _ScalarAccessIndexer(_NDFrameIndexer):
    def __getitem__(self, key: Any) -> Any:
        ...

    def __setitem__(self, key: Any, value: Any) -> None:
        ...


class _AtIndexer(_ScalarAccessIndexer):
    ...


class _iAtIndexer(_ScalarAccessIndexer):
    ...


def convert_to_index_sliceable(obj: Any, key: Any) -> Any:
    ...


def check_bool_indexer(index: Index, key: Any) -> np.ndarray:
    ...


def convert_missing_indexer(indexer: Any) -> Any:
    ...


def convert_from_missing_indexer_tuple(indexer: Any, axes: Any) -> Any:
    ...


def maybe_convert_ix(*args: Any) -> Any:
    ...


def is_nested_tuple(tup: Any, labels: Any) -> Any:
    ...


def is_label_like(key: Any) -> Any:
    ...


def need_slice(obj: Any) -> Any:
    ...


def maybe_droplevels(index: Any, key: Any) -> Any:
    ...
