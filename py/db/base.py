import numpy as np
import sqlalchemy as sa
from psycopg2.extensions import AsIs, register_adapter
from sqlalchemy.orm import registry
from sqlalchemy.orm.decl_api import DeclarativeMeta


QUERY_MAX_LEN = 40
RESPONSE_MAX_LEN = 40
COUNTRY_MAX_LEN = 4


def adapt_numpy_float64(numpy_float64: np.float64) -> AsIs:
    return AsIs(numpy_float64)


def adapt_numpy_int64(numpy_int64: np.int64) -> AsIs:
    return AsIs(numpy_int64)


register_adapter(np.float64, adapt_numpy_float64)
register_adapter(np.int64, adapt_numpy_int64)


mapper_registry = registry()


class Base(
        metaclass=DeclarativeMeta):  # pylint: disable=too-few-public-methods
    __abstract__ = True
    __table__: sa.Table

    registry = mapper_registry
    metadata = mapper_registry.metadata

    __init__ = mapper_registry.constructor


class LocationCache(Base):  # pylint: disable=too-few-public-methods
    __tablename__ = "location_cache"

    query = sa.Column(
        sa.String(QUERY_MAX_LEN),
        primary_key=True,
        nullable=False,
        unique=True)
    lat = sa.Column(sa.Double)
    lon = sa.Column(sa.Double)
    normalized = sa.Column(sa.String(RESPONSE_MAX_LEN))
    country = sa.Column(sa.String(COUNTRY_MAX_LEN))
