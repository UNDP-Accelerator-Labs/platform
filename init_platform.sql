SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS hstore;
CREATE EXTENSION IF NOT EXISTS dblink;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS ltree;

SET default_tablespace = '';
CREATE TABLE public.comments (
    id integer NOT NULL,
    contributor uuid,
    doctype character varying(19),
    docid integer,
    date timestamp with time zone DEFAULT now() NOT NULL,
    message text,
    source integer
);

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;

CREATE TABLE public.engagement (
    id integer NOT NULL,
    contributor uuid,
    doctype character varying(19),
    docid integer,
    type character varying(19),
    date timestamp with time zone DEFAULT now() NOT NULL,
    message text
);

CREATE SEQUENCE public.engagement_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.engagement_id_seq1 OWNED BY public.engagement.id;

CREATE TABLE public.files (
    id integer NOT NULL,
    name character varying(99),
    path text,
    vignette text,
    full_text text,
    sdgs jsonb,
    tags jsonb,
    status integer DEFAULT 1,
    date timestamp with time zone DEFAULT now() NOT NULL,
    update_at timestamp with time zone DEFAULT now() NOT NULL,
    owner uuid,
    published boolean DEFAULT false,
    source integer
);

CREATE SEQUENCE public.files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.files_id_seq OWNED BY public.files.id;

CREATE TABLE public.locations (
    id integer NOT NULL,
    pad integer,
    lat double precision,
    lng double precision,
    iso3 character varying(3)
);

CREATE SEQUENCE public.locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.locations_id_seq OWNED BY public.locations.id;

CREATE TABLE public.metafields (
    id integer NOT NULL,
    pad integer,
    type character varying(19),
    name public.citext,
    value text,
    key integer
);

CREATE SEQUENCE public.metafields_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.metafields_id_seq OWNED BY public.metafields.id;

CREATE TABLE public.mobilization_contributions (
    id integer NOT NULL,
    pad integer,
    mobilization integer
);

CREATE SEQUENCE public.mobilization_contributions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.mobilization_contributions_id_seq OWNED BY public.mobilization_contributions.id;

CREATE TABLE public.mobilization_contributors (
    id integer NOT NULL,
    mobilization integer,
    participant uuid
);

CREATE SEQUENCE public.mobilization_contributors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.mobilization_contributors_id_seq OWNED BY public.mobilization_contributors.id;

CREATE TABLE public.mobilizations (
    id integer NOT NULL,
    title character varying(99),
    template integer,
    status integer DEFAULT 1,
    start_date timestamp with time zone DEFAULT now() NOT NULL,
    end_date timestamp with time zone,
    owner uuid,
    source integer,
    copy boolean DEFAULT false,
    pad_limit integer DEFAULT 0,
    public boolean DEFAULT false,
    child boolean DEFAULT false,
    description text,
    language character varying(9),
    old_collection integer,
    version public.ltree,
    collection integer
);

CREATE SEQUENCE public.mobilizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.mobilizations_id_seq OWNED BY public.mobilizations.id;

CREATE TABLE public.pads (
    id integer NOT NULL,
    title character varying(99),
    full_text text,
    status integer DEFAULT 0,
    date timestamp with time zone DEFAULT now() NOT NULL,
    template integer,
    owner uuid,
    sections jsonb,
    update_at timestamp with time zone DEFAULT now() NOT NULL,
    source integer,
    version public.ltree
);

CREATE SEQUENCE public.pads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.pads_id_seq OWNED BY public.pads.id;

CREATE SEQUENCE public.pinboard_contributions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.pinboard_contributors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.pinboards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.review_requests (
    id integer NOT NULL,
    pad integer NOT NULL,
    language character varying(9),
    status integer DEFAULT 0,
    date timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.review_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.review_requests_id_seq OWNED BY public.review_requests.id;

CREATE TABLE public.review_templates (
    id integer NOT NULL,
    template integer NOT NULL,
    language character varying(9)
);

CREATE SEQUENCE public.review_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.review_templates_id_seq OWNED BY public.review_templates.id;

CREATE TABLE public.reviewer_pool (
    id integer NOT NULL,
    reviewer uuid,
    request integer,
    rank integer DEFAULT 0,
    status integer DEFAULT 0,
    invited_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.reviewer_pool_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.reviewer_pool_id_seq OWNED BY public.reviewer_pool.id;

CREATE TABLE public.reviews (
    id integer NOT NULL,
    pad integer,
    review integer,
    reviewer uuid,
    status integer DEFAULT 0
);

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);

CREATE TABLE public.tagging (
    id integer NOT NULL,
    pad integer,
    tag_id integer NOT NULL,
    type character varying(19)
);

CREATE SEQUENCE public.tagging_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.tagging_id_seq OWNED BY public.tagging.id;

CREATE TABLE public.templates (
    id integer NOT NULL,
    medium character varying(9),
    title character varying(99),
    description text,
    items jsonb,
    language character varying(9),
    date timestamp with time zone DEFAULT now() NOT NULL,
    full_text text,
    status integer DEFAULT 0,
    imported boolean DEFAULT false,
    owner uuid,
    sections jsonb,
    update_at timestamp with time zone DEFAULT now() NOT NULL,
    source integer,
    slideshow boolean DEFAULT false,
    version public.ltree
);

CREATE SEQUENCE public.templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.templates_id_seq OWNED BY public.templates.id;

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);

ALTER TABLE ONLY public.engagement ALTER COLUMN id SET DEFAULT nextval('public.engagement_id_seq1'::regclass);

ALTER TABLE ONLY public.files ALTER COLUMN id SET DEFAULT nextval('public.files_id_seq'::regclass);

ALTER TABLE ONLY public.locations ALTER COLUMN id SET DEFAULT nextval('public.locations_id_seq'::regclass);

ALTER TABLE ONLY public.metafields ALTER COLUMN id SET DEFAULT nextval('public.metafields_id_seq'::regclass);

ALTER TABLE ONLY public.mobilization_contributions ALTER COLUMN id SET DEFAULT nextval('public.mobilization_contributions_id_seq'::regclass);

ALTER TABLE ONLY public.mobilization_contributors ALTER COLUMN id SET DEFAULT nextval('public.mobilization_contributors_id_seq'::regclass);

ALTER TABLE ONLY public.mobilizations ALTER COLUMN id SET DEFAULT nextval('public.mobilizations_id_seq'::regclass);

ALTER TABLE ONLY public.pads ALTER COLUMN id SET DEFAULT nextval('public.pads_id_seq'::regclass);

ALTER TABLE ONLY public.review_requests ALTER COLUMN id SET DEFAULT nextval('public.review_requests_id_seq'::regclass);

ALTER TABLE ONLY public.review_templates ALTER COLUMN id SET DEFAULT nextval('public.review_templates_id_seq'::regclass);

ALTER TABLE ONLY public.reviewer_pool ALTER COLUMN id SET DEFAULT nextval('public.reviewer_pool_id_seq'::regclass);

ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);

ALTER TABLE ONLY public.tagging ALTER COLUMN id SET DEFAULT nextval('public.tagging_id_seq'::regclass);

ALTER TABLE ONLY public.templates ALTER COLUMN id SET DEFAULT nextval('public.templates_id_seq'::regclass);

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.engagement
    ADD CONSTRAINT engagement_pkey1 PRIMARY KEY (id);

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.metafields
    ADD CONSTRAINT metafields_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.mobilization_contributions
    ADD CONSTRAINT mobilization_contributions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.mobilization_contributors
    ADD CONSTRAINT mobilization_contributors_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.mobilizations
    ADD CONSTRAINT mobilizations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.metafields
    ADD CONSTRAINT pad_value_type UNIQUE (pad, value, type);

ALTER TABLE ONLY public.pads
    ADD CONSTRAINT pads_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.review_requests
    ADD CONSTRAINT review_requests_pad_key UNIQUE (pad);

ALTER TABLE ONLY public.review_requests
    ADD CONSTRAINT review_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.review_templates
    ADD CONSTRAINT review_templates_language_key UNIQUE (language);

ALTER TABLE ONLY public.review_templates
    ADD CONSTRAINT review_templates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.reviewer_pool
    ADD CONSTRAINT reviewer_pool_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);

ALTER TABLE ONLY public.tagging
    ADD CONSTRAINT tagging_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.engagement
    ADD CONSTRAINT unique_engagement UNIQUE (contributor, doctype, docid, type);

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT unique_pad_lnglat UNIQUE (pad, lng, lat);

ALTER TABLE ONLY public.tagging
    ADD CONSTRAINT unique_pad_tag_type UNIQUE (pad, tag_id, type);

ALTER TABLE ONLY public.reviewer_pool
    ADD CONSTRAINT unique_reviewer_pad UNIQUE (reviewer, request);

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);

CREATE INDEX version_idx ON public.pads USING gist (version);

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_source_fkey FOREIGN KEY (source) REFERENCES public.comments(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_source_fkey FOREIGN KEY (source) REFERENCES public.pads(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pad_fkey FOREIGN KEY (pad) REFERENCES public.pads(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.metafields
    ADD CONSTRAINT metafields_pad_fkey FOREIGN KEY (pad) REFERENCES public.pads(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.mobilization_contributions
    ADD CONSTRAINT mobilization_contributions_mobilization_fkey FOREIGN KEY (mobilization) REFERENCES public.mobilizations(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.mobilization_contributions
    ADD CONSTRAINT mobilization_contributions_pad_fkey FOREIGN KEY (pad) REFERENCES public.pads(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.mobilization_contributors
    ADD CONSTRAINT mobilization_contributors_mobilization_fkey FOREIGN KEY (mobilization) REFERENCES public.mobilizations(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.mobilizations
    ADD CONSTRAINT mobilizations_source_fkey FOREIGN KEY (source) REFERENCES public.mobilizations(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.mobilizations
    ADD CONSTRAINT mobilizations_template_fkey FOREIGN KEY (template) REFERENCES public.templates(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.pads
    ADD CONSTRAINT pads_source_fkey FOREIGN KEY (source) REFERENCES public.pads(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.pads
    ADD CONSTRAINT pads_template_fkey FOREIGN KEY (template) REFERENCES public.templates(id);

ALTER TABLE ONLY public.review_requests
    ADD CONSTRAINT review_requests_pad_fkey FOREIGN KEY (pad) REFERENCES public.pads(id);

ALTER TABLE ONLY public.review_templates
    ADD CONSTRAINT review_templates_template_fkey FOREIGN KEY (template) REFERENCES public.templates(id);

ALTER TABLE ONLY public.reviewer_pool
    ADD CONSTRAINT reviewer_pool_request_fkey FOREIGN KEY (request) REFERENCES public.review_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pad_fkey FOREIGN KEY (pad) REFERENCES public.pads(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_review_fkey FOREIGN KEY (review) REFERENCES public.pads(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.tagging
    ADD CONSTRAINT tagging_pad_fkey FOREIGN KEY (pad) REFERENCES public.pads(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_source_fkey FOREIGN KEY (source) REFERENCES public.templates(id) ON UPDATE CASCADE ON DELETE CASCADE;
