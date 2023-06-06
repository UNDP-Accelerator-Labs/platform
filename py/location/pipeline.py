from py.location.cache import read_geo_cache, write_geo_cache
from py.location.forwardgeo import geo_result
from py.location.response import (
    GeoOutput,
    GeoState,
    get_geo_results,
    get_remain_geo_queries,
    STATE_ORDER,
)
from py.location.spacy import get_locations


def extract_locations(text: str) -> GeoOutput:
    queries = [query.strip() for query in get_locations(text)]
    cache_res = read_geo_cache(set(queries))
    cache_out = []
    worst_state: GeoState = "ok"
    states: dict[str, GeoState] = {
        geo_loc["query"]: geo_state
        for geo_loc, geo_state in cache_res.values()
        if geo_loc is not None and geo_state == "cache_hit"
    }
    for query in get_remain_geo_queries(cache_res.items()):
        geo_res = geo_result(query)
        _, geo_state = geo_res
        states[query] = geo_state
        cache_res[query] = geo_res
        cache_out.append(geo_res)
        if STATE_ORDER.index(geo_state) < STATE_ORDER.index(worst_state):
            worst_state = geo_state
    write_geo_cache(cache_out)
    locations = sorted(
        get_geo_results(cache_res), key=lambda cres: cres["query"])
    return {
        "status": worst_state,
        "entities": states,
        "locations": locations,
    }
