CREATE TABLE IF NOT EXISTS public.feedback
(
    db character varying(40) COLLATE pg_catalog."default" NOT NULL,
    doc_id integer NOT NULL,
    prompt text COLLATE pg_catalog."default" NOT NULL,
    approve integer NOT NULL DEFAULT 0,
    dislike integer NOT NULL DEFAULT 0,
    neutral integer NOT NULL DEFAULT 0,
    CONSTRAINT feedback_pkey PRIMARY KEY (db, doc_id, prompt)
)
