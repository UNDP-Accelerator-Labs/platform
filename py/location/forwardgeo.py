from opencage.geocoder import (  # type: ignore
    OpenCageGeocode,
    RateLimitExceededError,
)

from py.config import get_config
from py.location.response import GeoResponse, GeoResult


GEOCODER: OpenCageGeocode | None = None


def get_geo() -> OpenCageGeocode:
    global GEOCODER

    if GEOCODER is None:
        config = get_config()
        GEOCODER = OpenCageGeocode(config["opencage"])
    return GEOCODER


def geo_result(query: str) -> GeoResult:
    try:
        query = query.strip()
        results = get_geo().geocode(query)
        if results and len(results):
            result = results[0]
            comp = result["components"]
            country = comp.get(
                "ISO_3166-1_alpha-3",
                comp.get("county_code", "NUL"))
            res: GeoResponse = {
                "query": query,
                "lat": float(result["geometry"]["lat"]),
                "lng": float(result["geometry"]["lng"]),
                "normalized": result["formatted"],
                "country": country,
            }
            return res, "ok"
        return None, "invalid"
    except RateLimitExceededError:
        return None, "ratelimit"
