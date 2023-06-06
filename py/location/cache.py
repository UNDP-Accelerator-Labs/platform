from typing import Iterable

import sqlalchemy as sa

from py.db.base import LocationCache
from py.db.db import get_db
from py.location.response import GeoResult


def read_geo_cache(queries: set[str]) -> dict[str, GeoResult]:
    qins = sorted(query.strip() for query in queries)
    res: dict[str, GeoResult] = {}
    with get_db().get_connection() as conn:
        stmt = sa.select(
            LocationCache.query,
            LocationCache.lat,  # type: ignore  # FIXME mypy bug?
            LocationCache.lng,  # type: ignore  # FIXME mypy bug?
            LocationCache.normalized,
            LocationCache.country)
        stmt.where(LocationCache.query.in_(qins))
        for row in conn.execute(stmt):
            qres = row.query.strip()
            # if (all) values are None the row indicates
            # that we should *not* use the cache
            if row.normalized is None:
                res[qres] = (None, "cache_never")
            else:
                country = f"{row.country}"
                if len(country) > 4:
                    country = f"{country[:4]}?"
                res[qres] = (
                    {
                        "query": qres,
                        "lat": float(row.lat),
                        "lng": float(row.lng),
                        "normalized": f"{row.normalized}",
                        "country": country,
                    },
                    "cache_hit",
                )
    for qin in qins:
        if qin not in res:
            res[qin] = (None, "cache_miss")
    return res


def write_geo_cache(items: Iterable[GeoResult]) -> None:
    db = get_db()
    with db.get_session() as session:
        for result in items:
            if result[0] is None:
                continue
            if result[1] in ("cache_never", "cache_hit"):
                continue
            if result[1] != "ok":
                continue
            res = result[0]
            stmt = db.upsert(LocationCache).values(
                query=res["query"],
                lat=res["lat"],
                lng=res["lng"],
                normalized=res["normalized"],
                country=res["country"])
            stmt = stmt.on_conflict_do_nothing()
            session.execute(stmt)
