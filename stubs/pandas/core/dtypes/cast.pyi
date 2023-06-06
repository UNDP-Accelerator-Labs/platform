# Stubs for pandas.core.dtypes.cast (Python 3)
#
# NOTE: This dynamically typed stub was automatically generated by stubgen.
# pylint: disable=unused-argument,super-init-not-called,redefined-outer-name
# pylint: disable=arguments-differ,too-many-arguments,relative-beyond-top-level
# pylint: disable=dangerous-default-value,too-many-ancestors,unused-import
from typing import Any, Optional

from .common import (  # _POSSIBLY_CAST_DTYPES,
    _INT64_DTYPE,
    _NS_DTYPE,
    _TD_DTYPE,
    ensure_int8,
    ensure_int16,
    ensure_int32,
    ensure_int64,
    ensure_object,
    ensure_str,
    is_bool,
    is_bool_dtype,
    is_categorical_dtype,
    is_complex,
    is_complex_dtype,
    is_datetime64_dtype,
    is_datetime64_ns_dtype,
    is_datetime64tz_dtype,
    is_datetime_or_timedelta_dtype,
    is_datetimelike,
    is_dtype_equal,
    is_extension_array_dtype,
    is_extension_type,
    is_float,
    is_float_dtype,
    is_integer,
    is_integer_dtype,
    is_object_dtype,
    is_scalar,
    is_string_dtype,
    is_timedelta64_dtype,
    is_timedelta64_ns_dtype,
    is_unsigned_integer_dtype,
    pandas_dtype,
)
from .dtypes import DatetimeTZDtype, ExtensionDtype, PeriodDtype
from .generic import (
    ABCDatetimeArray,
    ABCDatetimeIndex,
    ABCPeriodArray,
    ABCPeriodIndex,
    ABCSeries,
)
from .inference import is_list_like
from .missing import isna, notna


def maybe_convert_platform(values: Any) -> Any:
    ...


def is_nested_object(obj: Any) -> Any:
    ...


def maybe_downcast_to_dtype(result: Any, dtype: Any) -> Any:
    ...


def maybe_upcast_putmask(result: Any, mask: Any, other: Any) -> Any:
    ...


def maybe_promote(dtype: Any, fill_value: Any = ...) -> Any:
    ...


def infer_dtype_from(val: Any, pandas_dtype: bool = ...) -> Any:
    ...


def infer_dtype_from_scalar(val: Any, pandas_dtype: bool = ...) -> Any:
    ...


def infer_dtype_from_array(arr: Any, pandas_dtype: bool = ...) -> Any:
    ...


def maybe_infer_dtype_type(element: Any) -> Any:
    ...


def maybe_upcast(
        values: Any, fill_value: Any = ...,
        dtype: Optional[Any] = ..., copy: bool = ...) -> Any:
    ...


def invalidate_string_dtypes(dtype_set: Any) -> None:
    ...


def coerce_indexer_dtype(indexer: Any, categories: Any) -> Any:
    ...


def coerce_to_dtypes(result: Any, dtypes: Any) -> Any:
    ...


def astype_nansafe(
        arr: Any, dtype: Any, copy: bool = ...,
        skipna: bool = ...) -> Any:
    ...


def maybe_convert_objects(
        values: Any, convert_dates: bool = ...,
        convert_numeric: bool = ...,
        convert_timedeltas: bool = ...,
        copy: bool = ...) -> Any:
    ...


def soft_convert_objects(
        values: Any, datetime: bool = ...,
        numeric: bool = ..., timedelta: bool = ...,
        coerce: bool = ..., copy: bool = ...) -> Any:
    ...


def maybe_castable(arr: Any) -> Any:
    ...


def maybe_infer_to_datetimelike(value: Any, convert_dates: bool = ...) -> Any:
    ...


def maybe_cast_to_datetime(value: Any, dtype: Any, errors: str = ...) -> Any:
    ...


def find_common_type(types: Any) -> Any:
    ...


def cast_scalar_to_array(
        shape: Any, value: Any,
        dtype: Optional[Any] = ...) -> Any:
    ...


def construct_1d_arraylike_from_scalar(
        value: Any, length: Any, dtype: Any) -> Any:
    ...


def construct_1d_object_array_from_listlike(values: Any) -> Any:
    ...


def construct_1d_ndarray_preserving_na(
        values: Any, dtype: Optional[Any] = ...,
        copy: bool = ...) -> Any:
    ...


def maybe_cast_to_integer_array(arr: Any, dtype: Any, copy: bool = ...) -> Any:
    ...