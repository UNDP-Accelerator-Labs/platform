from typing import Iterable

import spacy


SPACY_NLP: spacy.language.Language | None = None


def get_spacy() -> spacy.language.Language:
    global SPACY_NLP

    if SPACY_NLP is None:
        SPACY_NLP = spacy.load("en_core_web_sm")
    return SPACY_NLP


def get_locations(text: str) -> Iterable[str]:
    nlp = get_spacy()
    doc = nlp(text)
    for ent in doc.ents:
        if ent.label_ not in ["LOC", "GPE"]:
            continue
        yield ent.text
