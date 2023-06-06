from typing import Iterable, Literal, TypedDict


GeoState = Literal[
    "invalid",
    "ratelimit",
    "cache_hit",
    "cache_never",
    "cache_miss",
    "ok",
]


STATE_ORDER: list[GeoState] = [
    "ratelimit",
    "invalid",
    "cache_miss",
    "cache_never",
    "cache_hit",
    "ok",
]


GeoResponse = TypedDict('GeoResponse', {
    "query": str,
    "lat": float,
    "lon": float,
    "normalized": str,
    "country": str,
})


GeoResult = tuple[GeoResponse | None, GeoState]


GeoOutput = TypedDict('GeoOutput', {
    "status": GeoState,
    "entities": dict[str, GeoState],
    "locations": list[GeoResponse],
})


def get_remain_geo_queries(
        items: Iterable[tuple[str, GeoResult]]) -> Iterable[str]:
    for (query, result) in items:
        if result[0] is None:
            yield query


def get_geo_results(response: dict[str, GeoResult]) -> Iterable[GeoResponse]:
    for result in response.values():
        loc = result[0]
        if loc is None:
            continue
        yield loc
