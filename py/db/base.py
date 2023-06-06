# CREATE TABLE IF NOT EXISTS public.location_cache
# (
#     query character varying(40) COLLATE pg_catalog."default" NOT NULL,
#     lat double precision,
#     lon double precision,
#     normalized character varying(40) COLLATE pg_catalog."default",
#     CONSTRAINT location_cache_pkey PRIMARY KEY (query)
# )

import numpy as np
import sqlalchemy as sa
from psycopg2.extensions import AsIs, register_adapter
from sqlalchemy.orm import registry
from sqlalchemy.orm.decl_api import DeclarativeMeta

from py.misc.util import file_hash_size


SOURCE_NAME_MAX_LEN = 40
CORPUS_NAME_MAX_LEN = 40
MODELS_NAME_MAX_LEN = 40
MODELS_BASE_MAX_LEN = 40
REFERENCE_MAX_LEN = 40


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


class ModelsTable(Base):  # pylint: disable=too-few-public-methods
    __tablename__ = "models"

    id = sa.Column(
        sa.Integer,
        primary_key=True,
        autoincrement=True,
        nullable=False,
        unique=True)
    name = sa.Column(
        sa.String(MODELS_NAME_MAX_LEN),
        primary_key=True,
        nullable=False,
        unique=True)
    model_hash = sa.Column(
        sa.String(file_hash_size()),
        nullable=False,
        unique=True)
    base = sa.Column(sa.String(MODELS_BASE_MAX_LEN))

    idx_model_hash = sa.Index("model_hash")


class SourceTable(Base):  # pylint: disable=too-few-public-methods
    __tablename__ = "source"

    id = sa.Column(
        sa.Integer,
        primary_key=True,
        autoincrement=True,
        nullable=False,
        unique=True)
    name = sa.Column(
        sa.String(SOURCE_NAME_MAX_LEN),
        primary_key=True,
        nullable=False,
        unique=True)


class CorpusTable(Base):  # pylint: disable=too-few-public-methods
    __tablename__ = "corpus"

    id = sa.Column(
        sa.Integer,
        primary_key=True,
        autoincrement=True,
        nullable=False,
        unique=True)
    name = sa.Column(
        sa.String(CORPUS_NAME_MAX_LEN),
        primary_key=True,
        nullable=False,
        unique=True)
    model_id = sa.Column(
        sa.Integer,
        sa.ForeignKey(
            ModelsTable.id, onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False)
    version = sa.Column(
        sa.Integer,
        nullable=False)
    active = sa.Column(
        sa.Boolean,
        nullable=False)


class CorpusSourcesTable(Base):  # pylint: disable=too-few-public-methods
    __tablename__ = "corpus_sources"

    corpus_id = sa.Column(
        sa.Integer,
        sa.ForeignKey(
            CorpusTable.id, onupdate="CASCADE", ondelete="CASCADE"),
        primary_key=True,
        nullable=False)
    source_id = sa.Column(
        sa.Integer,
        sa.ForeignKey(
            SourceTable.id, onupdate="CASCADE", ondelete="CASCADE"),
        primary_key=True,
        nullable=False)


class DocsTable(Base):  # pylint: disable=too-few-public-methods
    __tablename__ = "docs"

    id = sa.Column(
        sa.Integer,
        primary_key=True,
        autoincrement=True,
        nullable=False,
        unique=True)
    source_id = sa.Column(
        sa.Integer,
        sa.ForeignKey(
            SourceTable.id, onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False)
    searchable = sa.Column(sa.Text, nullable=False)
    reference = sa.Column(sa.String(REFERENCE_MAX_LEN), nullable=False)


EMBED_ORDER_SEQ: sa.Sequence = sa.Sequence(
    "embed_order_seq", start=1, increment=1)


class EmbedTable(Base):  # pylint: disable=too-few-public-methods
    __tablename__ = "embed"

    model_id = sa.Column(
        sa.Integer,
        sa.ForeignKey(
            ModelsTable.id,
            onupdate="CASCADE",
            ondelete="CASCADE"),
        primary_key=True)
    doc_id = sa.Column(
        sa.Integer,
        sa.ForeignKey(
            DocsTable.id, onupdate="CASCADE", ondelete="CASCADE"),
        primary_key=True)
    embed_order = sa.Column(
        sa.Integer,
        EMBED_ORDER_SEQ,
        nullable=False,
        unique=True,
        server_default=EMBED_ORDER_SEQ.next_value())
    embedding = sa.Column(
        sa.LargeBinary,
        nullable=False)

    idx_embed_order = sa.Index("model_id", "embed_order")


class FeedbackTable(Base):  # pylint: disable=too-few-public-methods
    __tablename__ = "feedback"

    model_id = sa.Column(
        sa.Integer,
        sa.ForeignKey(
            ModelsTable.id,
            onupdate="CASCADE",
            ondelete="CASCADE"),
        primary_key=True)
    doc_id = sa.Column(
        sa.Integer,
        sa.ForeignKey(
            DocsTable.id, onupdate="CASCADE", ondelete="CASCADE"),
        primary_key=True)
    prompt = sa.Column(sa.Text, nullable=False, primary_key=True)
    approve = sa.Column(sa.Integer, nullable=False, default=0)
    dislike = sa.Column(sa.Integer, nullable=False, default=0)
    neutral = sa.Column(sa.Integer, nullable=False, default=0)
