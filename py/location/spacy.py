from typing import Iterable

import spacy


NLP = spacy.load("en_core_web_sm")


def get_locations(text: str) -> Iterable[str]:
    doc = NLP(text)
    for ent in doc.ents:
        if ent.label_ not in ["LOC", "GPE"]:
            continue
        yield ent.text
