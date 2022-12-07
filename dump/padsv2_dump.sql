--
-- PostgreSQL database dump
--

-- Dumped from database version 14.4
-- Dumped by pg_dump version 14.4

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

--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: dblink; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS dblink WITH SCHEMA public;


--
-- Name: EXTENSION dblink; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION dblink IS 'connect to other PostgreSQL databases from within a database';


--
-- Name: hstore; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS hstore WITH SCHEMA public;


--
-- Name: EXTENSION hstore; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION hstore IS 'data type for storing sets of (key, value) pairs';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cohorts; Type: TABLE; Schema: public; Owner: myjyby
--

CREATE TABLE public.cohorts (
    id integer NOT NULL,
    host uuid,
    participant uuid
);


ALTER TABLE public.cohorts OWNER TO myjyby;

--
-- Name: cohorts_id_seq; Type: SEQUENCE; Schema: public; Owner: myjyby
--

CREATE SEQUENCE public.cohorts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.cohorts_id_seq OWNER TO myjyby;

--
-- Name: cohorts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myjyby
--

ALTER SEQUENCE public.cohorts_id_seq OWNED BY public.cohorts.id;


--
-- Name: engagement; Type: TABLE; Schema: public; Owner: myjyby
--

CREATE TABLE public.engagement (
    id integer NOT NULL,
    "user" uuid,
    doctype character varying(19),
    type character varying(19),
    date timestamp with time zone DEFAULT now() NOT NULL,
    message text,
    docid integer
);


ALTER TABLE public.engagement OWNER TO myjyby;

--
-- Name: engagement_id_seq; Type: SEQUENCE; Schema: public; Owner: myjyby
--

CREATE SEQUENCE public.engagement_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.engagement_id_seq OWNER TO myjyby;

--
-- Name: engagement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myjyby
--

ALTER SEQUENCE public.engagement_id_seq OWNED BY public.engagement.id;


--
-- Name: files; Type: TABLE; Schema: public; Owner: myjyby
--

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


ALTER TABLE public.files OWNER TO myjyby;

--
-- Name: files_id_seq; Type: SEQUENCE; Schema: public; Owner: myjyby
--

CREATE SEQUENCE public.files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.files_id_seq OWNER TO myjyby;

--
-- Name: files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myjyby
--

ALTER SEQUENCE public.files_id_seq OWNED BY public.files.id;


--
-- Name: locations; Type: TABLE; Schema: public; Owner: myjyby
--

CREATE TABLE public.locations (
    id integer NOT NULL,
    pad integer,
    lat double precision,
    lng double precision
);


ALTER TABLE public.locations OWNER TO myjyby;

--
-- Name: locations_id_seq; Type: SEQUENCE; Schema: public; Owner: myjyby
--

CREATE SEQUENCE public.locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.locations_id_seq OWNER TO myjyby;

--
-- Name: locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myjyby
--

ALTER SEQUENCE public.locations_id_seq OWNED BY public.locations.id;


--
-- Name: mobilization_contributions; Type: TABLE; Schema: public; Owner: myjyby
--

CREATE TABLE public.mobilization_contributions (
    id integer NOT NULL,
    pad integer,
    mobilization integer
);


ALTER TABLE public.mobilization_contributions OWNER TO myjyby;

--
-- Name: mobilization_contributions_id_seq; Type: SEQUENCE; Schema: public; Owner: myjyby
--

CREATE SEQUENCE public.mobilization_contributions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.mobilization_contributions_id_seq OWNER TO myjyby;

--
-- Name: mobilization_contributions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myjyby
--

ALTER SEQUENCE public.mobilization_contributions_id_seq OWNED BY public.mobilization_contributions.id;


--
-- Name: mobilization_contributors; Type: TABLE; Schema: public; Owner: myjyby
--

CREATE TABLE public.mobilization_contributors (
    id integer NOT NULL,
    participant uuid,
    mobilization integer
);


ALTER TABLE public.mobilization_contributors OWNER TO myjyby;

--
-- Name: mobilization_contributors_id_seq; Type: SEQUENCE; Schema: public; Owner: myjyby
--

CREATE SEQUENCE public.mobilization_contributors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.mobilization_contributors_id_seq OWNER TO myjyby;

--
-- Name: mobilization_contributors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myjyby
--

ALTER SEQUENCE public.mobilization_contributors_id_seq OWNED BY public.mobilization_contributors.id;


--
-- Name: mobilizations; Type: TABLE; Schema: public; Owner: myjyby
--

CREATE TABLE public.mobilizations (
    id integer NOT NULL,
    title character varying(99),
    owner uuid,
    template integer,
    status integer DEFAULT 1,
    start_date timestamp with time zone DEFAULT now() NOT NULL,
    end_date timestamp with time zone,
    source integer,
    copy boolean DEFAULT false,
    pad_limit integer DEFAULT 1,
    public boolean DEFAULT false
);


ALTER TABLE public.mobilizations OWNER TO myjyby;

--
-- Name: mobilizations_id_seq; Type: SEQUENCE; Schema: public; Owner: myjyby
--

CREATE SEQUENCE public.mobilizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.mobilizations_id_seq OWNER TO myjyby;

--
-- Name: mobilizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myjyby
--

ALTER SEQUENCE public.mobilizations_id_seq OWNED BY public.mobilizations.id;


--
-- Name: pads; Type: TABLE; Schema: public; Owner: myjyby
--

CREATE TABLE public.pads (
    id integer NOT NULL,
    title character varying(99),
    sections jsonb,
    full_text text,
    sdgs jsonb,
    tags jsonb,
    status integer DEFAULT 0,
    date timestamp with time zone DEFAULT now() NOT NULL,
    update_at timestamp with time zone DEFAULT now() NOT NULL,
    owner uuid,
    template integer,
    published boolean DEFAULT false,
    source integer
);


ALTER TABLE public.pads OWNER TO myjyby;

--
-- Name: pads_id_seq; Type: SEQUENCE; Schema: public; Owner: myjyby
--

CREATE SEQUENCE public.pads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pads_id_seq OWNER TO myjyby;

--
-- Name: pads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myjyby
--

ALTER SEQUENCE public.pads_id_seq OWNED BY public.pads.id;


--
-- Name: pinboard_contributions; Type: TABLE; Schema: public; Owner: myjyby
--

CREATE TABLE public.pinboard_contributions (
    id integer NOT NULL,
    pad integer,
    pinboard integer
);


ALTER TABLE public.pinboard_contributions OWNER TO myjyby;

--
-- Name: pinboard_contributions_id_seq; Type: SEQUENCE; Schema: public; Owner: myjyby
--

CREATE SEQUENCE public.pinboard_contributions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pinboard_contributions_id_seq OWNER TO myjyby;

--
-- Name: pinboard_contributions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myjyby
--

ALTER SEQUENCE public.pinboard_contributions_id_seq OWNED BY public.pinboard_contributions.id;


--
-- Name: pinboard_contributors; Type: TABLE; Schema: public; Owner: myjyby
--

CREATE TABLE public.pinboard_contributors (
    id integer NOT NULL,
    participant uuid,
    pinboard integer
);


ALTER TABLE public.pinboard_contributors OWNER TO myjyby;

--
-- Name: pinboard_contributors_id_seq; Type: SEQUENCE; Schema: public; Owner: myjyby
--

CREATE SEQUENCE public.pinboard_contributors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pinboard_contributors_id_seq OWNER TO myjyby;

--
-- Name: pinboard_contributors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myjyby
--

ALTER SEQUENCE public.pinboard_contributors_id_seq OWNED BY public.pinboard_contributors.id;


--
-- Name: pinboards; Type: TABLE; Schema: public; Owner: myjyby
--

CREATE TABLE public.pinboards (
    id integer NOT NULL,
    title character varying(99),
    owner uuid,
    date timestamp with time zone DEFAULT now() NOT NULL,
    mobilization integer,
    description text,
    status integer DEFAULT 0,
    display_filters boolean DEFAULT false,
    display_map boolean DEFAULT false,
    display_fullscreen boolean DEFAULT false
);


ALTER TABLE public.pinboards OWNER TO myjyby;

--
-- Name: pinboards_id_seq; Type: SEQUENCE; Schema: public; Owner: myjyby
--

CREATE SEQUENCE public.pinboards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pinboards_id_seq OWNER TO myjyby;

--
-- Name: pinboards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myjyby
--

ALTER SEQUENCE public.pinboards_id_seq OWNED BY public.pinboards.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: myjyby
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO myjyby;

--
-- Name: tagging; Type: TABLE; Schema: public; Owner: myjyby
--

CREATE TABLE public.tagging (
    id integer NOT NULL,
    pad integer,
    tag_id integer NOT NULL,
    type character varying(19)
);


ALTER TABLE public.tagging OWNER TO myjyby;

--
-- Name: tagging_id_seq; Type: SEQUENCE; Schema: public; Owner: myjyby
--

CREATE SEQUENCE public.tagging_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tagging_id_seq OWNER TO myjyby;

--
-- Name: tagging_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myjyby
--

ALTER SEQUENCE public.tagging_id_seq OWNED BY public.tagging.id;


--
-- Name: templates; Type: TABLE; Schema: public; Owner: myjyby
--

CREATE TABLE public.templates (
    id integer NOT NULL,
    medium character varying(9),
    title character varying(99),
    description text,
    sections jsonb,
    full_text text,
    language character varying(9),
    status integer DEFAULT 0,
    date timestamp with time zone DEFAULT now() NOT NULL,
    update_at timestamp with time zone DEFAULT now() NOT NULL,
    owner uuid,
    published boolean DEFAULT false,
    source integer
);


ALTER TABLE public.templates OWNER TO myjyby;

--
-- Name: templates_id_seq; Type: SEQUENCE; Schema: public; Owner: myjyby
--

CREATE SEQUENCE public.templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.templates_id_seq OWNER TO myjyby;

--
-- Name: templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myjyby
--

ALTER SEQUENCE public.templates_id_seq OWNED BY public.templates.id;


--
-- Name: cohorts id; Type: DEFAULT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.cohorts ALTER COLUMN id SET DEFAULT nextval('public.cohorts_id_seq'::regclass);


--
-- Name: engagement id; Type: DEFAULT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.engagement ALTER COLUMN id SET DEFAULT nextval('public.engagement_id_seq'::regclass);


--
-- Name: files id; Type: DEFAULT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.files ALTER COLUMN id SET DEFAULT nextval('public.files_id_seq'::regclass);


--
-- Name: locations id; Type: DEFAULT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.locations ALTER COLUMN id SET DEFAULT nextval('public.locations_id_seq'::regclass);


--
-- Name: mobilization_contributions id; Type: DEFAULT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.mobilization_contributions ALTER COLUMN id SET DEFAULT nextval('public.mobilization_contributions_id_seq'::regclass);


--
-- Name: mobilization_contributors id; Type: DEFAULT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.mobilization_contributors ALTER COLUMN id SET DEFAULT nextval('public.mobilization_contributors_id_seq'::regclass);


--
-- Name: mobilizations id; Type: DEFAULT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.mobilizations ALTER COLUMN id SET DEFAULT nextval('public.mobilizations_id_seq'::regclass);


--
-- Name: pads id; Type: DEFAULT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.pads ALTER COLUMN id SET DEFAULT nextval('public.pads_id_seq'::regclass);


--
-- Name: pinboard_contributions id; Type: DEFAULT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.pinboard_contributions ALTER COLUMN id SET DEFAULT nextval('public.pinboard_contributions_id_seq'::regclass);


--
-- Name: pinboard_contributors id; Type: DEFAULT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.pinboard_contributors ALTER COLUMN id SET DEFAULT nextval('public.pinboard_contributors_id_seq'::regclass);


--
-- Name: pinboards id; Type: DEFAULT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.pinboards ALTER COLUMN id SET DEFAULT nextval('public.pinboards_id_seq'::regclass);


--
-- Name: tagging id; Type: DEFAULT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.tagging ALTER COLUMN id SET DEFAULT nextval('public.tagging_id_seq'::regclass);


--
-- Name: templates id; Type: DEFAULT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.templates ALTER COLUMN id SET DEFAULT nextval('public.templates_id_seq'::regclass);


--
-- Data for Name: cohorts; Type: TABLE DATA; Schema: public; Owner: myjyby
--

COPY public.cohorts (id, host, participant) FROM stdin;
\.


--
-- Data for Name: engagement; Type: TABLE DATA; Schema: public; Owner: myjyby
--

COPY public.engagement (id, "user", doctype, type, date, message, docid) FROM stdin;
\.


--
-- Data for Name: files; Type: TABLE DATA; Schema: public; Owner: myjyby
--

COPY public.files (id, name, path, vignette, full_text, sdgs, tags, status, date, update_at, owner, published, source) FROM stdin;
\.


--
-- Data for Name: locations; Type: TABLE DATA; Schema: public; Owner: myjyby
--

COPY public.locations (id, pad, lat, lng) FROM stdin;
78	41	-4.7975373	11.8503297
79	42	-4.7975373	11.8503297
80	43	-4.7975373	11.8503297
87	49	-1.0197136	-71.9383333
88	50	2.715645	-76.662665
89	51	2.9263127	-75.2891733
90	52	4.6247961	-74.0936843
91	53	1.5	-78.0000086
94	54	27.931327412293673	9.475708007812502
105	5	7.318881730366756	16.155395507812504
\.


--
-- Data for Name: mobilization_contributions; Type: TABLE DATA; Schema: public; Owner: myjyby
--

COPY public.mobilization_contributions (id, pad, mobilization) FROM stdin;
1	6	1
2	7	1
3	41	7
4	42	7
5	43	7
11	49	1
12	50	1
13	51	1
14	52	1
15	53	1
16	57	7
17	58	7
\.


--
-- Data for Name: mobilization_contributors; Type: TABLE DATA; Schema: public; Owner: myjyby
--

COPY public.mobilization_contributors (id, participant, mobilization) FROM stdin;
1	4e4326ea-a11f-490c-9a4e-98e8e845574a	1
2	0bd12c11-c213-4d2c-b4d0-ec7bbd90a07f	1
3	b509d2f1-810f-46ee-8b1d-9b4b6d52331b	1
4	64ece197-a7ed-429b-8eb6-b941d88a7080	1
5	a1969244-5df8-4ee9-afbb-9feebf005987	1
6	4dfc7162-835f-4e9c-a534-d3b1da1c2505	1
7	45e18bc3-8805-45e1-8c54-b356bcee4912	1
29	\N	7
30	45e18bc3-8805-45e1-8c54-b356bcee4912	7
\.


--
-- Data for Name: mobilizations; Type: TABLE DATA; Schema: public; Owner: myjyby
--

COPY public.mobilizations (id, title, owner, template, status, start_date, end_date, source, copy, pad_limit, public) FROM stdin;
1	ok	45e18bc3-8805-45e1-8c54-b356bcee4912	1	1	2022-07-12 16:48:11.932274+02	2022-07-12 17:39:04.131354+02	\N	f	3	f
7	this is public	45e18bc3-8805-45e1-8c54-b356bcee4912	1	1	2022-07-14 16:37:33.421101+02	\N	\N	f	3	t
\.


--
-- Data for Name: pads; Type: TABLE DATA; Schema: public; Owner: myjyby
--

COPY public.pads (id, title, sections, full_text, sdgs, tags, status, date, update_at, owner, template, published, source) FROM stdin;
3	This is the title we need	[{"lead": "Please tell me some more.", "type": "section", "items": [], "title": "This is my first section", "structure": [{"type": "title", "level": "media", "required": true, "instruction": "You need to add a title to your pad."}]}]	This is the title we need\n\n\n\t\t\tThis is my first section\n\n\n\t\t\tPlease tell me some more.\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t	\N	\N	2	2022-07-04 11:51:16.446365+02	2022-07-04 11:51:16.446365+02	45e18bc3-8805-45e1-8c54-b356bcee4912	1	t	\N
4	some of this	[{"lead": "Please tell me some more.", "type": "section", "items": [], "title": "This is my first section", "structure": [{"type": "title", "level": "media", "required": true, "instruction": "You need to add a title to your pad."}]}]	some of this\n\n\n\t\t\tThis is my first section\n\n\n\t\t\tPlease tell me some more.\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t	\N	\N	2	2022-07-04 11:52:32.194291+02	2022-07-15 14:25:33.930902+02	45e18bc3-8805-45e1-8c54-b356bcee4912	1	t	\N
55	This is a title	[{"lead": "Some information on what to do", "type": "section", "items": [], "title": "Header 1", "structure": [{"type": "title", "level": "media", "required": true, "instruction": "Please add a title"}]}, {"lead": "This section should be repeated", "type": "section", "group": 0, "items": [{"txt": "This is some text", "type": "txt", "level": "media", "fontsize": 1, "required": true, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": true, "instruction": "Add some text"}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "Option 1", "checked": true}, {"id": 1, "name": "Option 2", "checked": false}], "fontsize": 1, "required": true, "fontstyle": "normal", "fontweight": "normal", "has_content": true, "instruction": "Check an option"}], "title": "Repeat header", "repeat": true, "structure": [{"type": "txt", "level": "media", "required": true, "instruction": "Add some text"}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "Option 1", "checked": false}, {"id": 1, "name": "Option 2", "checked": false}], "required": true, "instruction": "Check an option"}], "instruction": ""}, {"lead": "This section should be repeated", "type": "section", "group": 0, "items": [{"txt": "", "type": "txt", "level": "media", "fontsize": 1, "required": true, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": false, "instruction": "Add some text"}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "Option 1", "checked": false}, {"id": 1, "name": "Option 2", "checked": false}], "fontsize": 1, "required": true, "fontstyle": "normal", "fontweight": "normal", "has_content": false, "instruction": "Check an option"}], "title": "Repeat header", "repeat": true, "structure": [{"type": "txt", "level": "media", "required": true, "instruction": "Add some text"}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "Option 1", "checked": false}, {"id": 1, "name": "Option 2", "checked": false}], "required": true, "instruction": "Check an option"}], "instruction": ""}]	This is a title\n\n\n\t\t\tHeader 1\n\nRepeat header\n\nRepeat header\n\n\n\t\t\tSome information on what to do\n\nThis section should be repeated\n\nThis section should be repeated\n\n\n\t\t\tThis is some text\n\n\n\t\t\t\n\n\n\t\t\tOption 1\n\t\t\t\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t	\N	\N	0	2022-08-19 10:03:42.157093+02	2022-08-19 10:06:35.376709+02	45e18bc3-8805-45e1-8c54-b356bcee4912	14	f	\N
56	This is a pad with repeat and images.	[{"lead": "Some information on what to do", "type": "section", "items": [], "title": "Header 1", "structure": [{"type": "title", "level": "media", "required": true, "instruction": "Please add a title"}]}, {"lead": "This section should be repeated", "type": "section", "group": 0, "items": [{"txt": "This is some text", "type": "txt", "level": "media", "fontsize": 1, "required": true, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": true, "instruction": "Add some text"}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "Option 1", "checked": true}, {"id": 1, "name": "Option 2", "checked": true}], "fontsize": 1, "required": true, "fontstyle": "normal", "fontweight": "normal", "has_content": true, "instruction": "Check an option"}], "title": "Repeat header", "repeat": true, "structure": [{"type": "txt", "level": "media", "required": true, "instruction": "Add some text"}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "Option 1", "checked": false}, {"id": 1, "name": "Option 2", "checked": false}], "required": true, "instruction": "Check an option"}], "instruction": ""}, {"lead": "This section should be repeated", "type": "section", "group": 0, "items": [{"txt": "", "type": "txt", "level": "media", "fontsize": 1, "required": true, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": false, "instruction": "Add some text"}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "Option 1", "checked": false}, {"id": 1, "name": "Option 2", "checked": false}], "fontsize": 1, "required": true, "fontstyle": "normal", "fontweight": "normal", "has_content": false, "instruction": "Check an option"}], "title": "Repeat header", "repeat": true, "structure": [{"type": "txt", "level": "media", "required": true, "instruction": "Add some text"}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "Option 1", "checked": false}, {"id": 1, "name": "Option 2", "checked": false}], "required": true, "instruction": "Check an option"}], "instruction": ""}, {"lead": "This section should be repeated", "type": "section", "group": 0, "items": [{"txt": "", "type": "txt", "level": "media", "fontsize": 1, "required": true, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": false, "instruction": "Add some text"}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "Option 1", "checked": false}, {"id": 1, "name": "Option 2", "checked": false}], "fontsize": 1, "required": true, "fontstyle": "normal", "fontweight": "normal", "has_content": false, "instruction": "Check an option"}], "title": "Repeat header", "repeat": true, "structure": [{"type": "txt", "level": "media", "required": true, "instruction": "Add some text"}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "Option 1", "checked": false}, {"id": 1, "name": "Option 2", "checked": false}], "required": true, "instruction": "Check an option"}], "instruction": ""}, {"lead": "This section is for images", "type": "section", "items": [{"srcs": ["uploads/45e18bc3-8805-45e1-8c54-b356bcee4912/442d86bc6a478fbb011c4f835ea1dc99.jpeg", "uploads/45e18bc3-8805-45e1-8c54-b356bcee4912/261c46f89757297e9ba7199b7d477b30.jpeg", "uploads/45e18bc3-8805-45e1-8c54-b356bcee4912/f72d461ad7281e27ea73f225f70953e4.png", "uploads/45e18bc3-8805-45e1-8c54-b356bcee4912/3a901d79ae262a91d7b785e70fdf8ad8.jpeg", "uploads/45e18bc3-8805-45e1-8c54-b356bcee4912/5836f4fa2347b9db0b7696153264c082.jpeg", "uploads/45e18bc3-8805-45e1-8c54-b356bcee4912/6177f2a07d8f1ba4964a7126ac80d326.jpeg", "uploads/45e18bc3-8805-45e1-8c54-b356bcee4912/c1b7cbabe06eb79e2dd8d9155f7db278.jpeg", "uploads/45e18bc3-8805-45e1-8c54-b356bcee4912/040b08a3343ea40abe267956726dde46.jpeg", "uploads/45e18bc3-8805-45e1-8c54-b356bcee4912/73a19d110b4b0653fc2309aac6c91760.jpeg"], "type": "mosaic", "level": "media", "required": false, "has_content": true, "instruction": "Please add an image", "verticalalign": "center"}], "title": "Header 2", "structure": [{"type": "img", "level": "media", "required": false, "instruction": "Please add an image"}]}]	This is a pad with repeat and images.\n\n\n\t\t\tHeader 1\n\nRepeat header\n\nRepeat header\n\nRepeat header\n\nHeader 2\n\n\n\t\t\tSome information on what to do\n\nThis section should be repeated\n\nThis section should be repeated\n\nThis section should be repeated\n\nThis section is for images\n\n\n\t\t\tThis is some text\n\n\n\t\t\t\n\n\n\t\t\tOption 1\n\nOption 2\n\t\t\t\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t	\N	\N	0	2022-08-19 10:24:15.699852+02	2022-08-19 14:56:17.81079+02	45e18bc3-8805-45e1-8c54-b356bcee4912	14	f	\N
57	This is my first public entry	[{"lead": "Please tell me some more.", "type": "section", "items": [], "title": "This is my first section", "structure": [{"type": "title", "level": "media", "required": true, "instruction": "You need to add a title to your pad."}]}]	This is my first public entry\n\n\n\t\t\tThis is my first section\n\n\n\t\t\tPlease tell me some more.\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t	\N	\N	1	2022-08-25 18:16:54.452115+02	2022-08-25 18:16:54.452115+02	\N	1	f	\N
58	This is a second public pad	[{"lead": "Please tell me some more.", "type": "section", "items": [], "title": "This is my first section", "structure": [{"type": "title", "level": "media", "required": true, "instruction": "You need to add a title to your pad."}]}]	This is a second public pad\n\n\n\t\t\tThis is my first section\n\n\n\t\t\tPlease tell me some more.\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t	\N	\N	2	2022-08-25 20:26:53.681934+02	2022-08-25 20:26:53.681934+02	\N	1	f	\N
42	Lemon Battery	[{"lead": null, "type": "section", "items": [{"txt": "Lemon Battery", "type": "title", "has_content": true, "instruction": "Innovation"}, {"txt": "Lemon-based electric cell", "type": "txt", "has_content": true, "instruction": "Objet"}, {"type": "locations", "caption": "Originally input location: <strong>Pointe-Noire</strong>.<br/><strong>Pointe-Noire</strong> found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>", "has_content": true, "instruction": "Département", "centerpoints": [{"lat": -4.7975373, "lng": 11.8503297}]}, {"src": "uploads/45e18bc3-8805-45e1-8c54-b356bcee4912/13c8cc447355f9b7ef214bcde4880f8d", "type": "img", "has_content": true, "instruction": "Photo"}], "title": null, "structure": [{"type": "title", "level": "media", "required": false, "has_content": true, "instruction": "Innovation"}, {"type": "txt", "level": "media", "required": false, "has_content": true, "instruction": "Objet"}, {"type": "locations", "level": "meta", "caption": "Originally input location: <strong>Pointe-Noire</strong>.<br/><strong>Pointe-Noire</strong> found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>", "required": false, "has_content": true, "instruction": "Département"}, {"type": "img", "level": "media", "required": false, "has_content": true, "instruction": "Photo"}]}]	Lemon Battery\n\n\n\t\t\t\t\tLemon-based electric cell\n\n\n\t\t\t\t\t\n\n\n\t\t\t\t\t\n\t\t\t\t\t\n\t\t\t\t\t\n\t\t\t\t\t\n\n\n\t\t\t\t\t\n\n\n\t\t\t\t\t\n\t\t\t\t\t	\N	\N	0	2022-08-08 11:21:15.002664+02	2022-08-08 11:21:15.002664+02	45e18bc3-8805-45e1-8c54-b356bcee4912	11	f	\N
43	Charcoal lamp with USB port	[{"lead": null, "type": "section", "items": [{"txt": "Charcoal lamp with USB port", "type": "title", "has_content": true, "instruction": "Innovation"}, {"txt": "Coal-fed electric lamp", "type": "txt", "has_content": true, "instruction": "Objet"}, {"type": "locations", "caption": "Originally input location: <strong>Pointe-Noire</strong>.<br/><strong>Pointe-Noire</strong> found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>", "has_content": true, "instruction": "Département", "centerpoints": [{"lat": -4.7975373, "lng": 11.8503297}]}, {"src": "uploads/45e18bc3-8805-45e1-8c54-b356bcee4912/37916a2499dfc39c7cebbc6accfa4aee", "type": "img", "has_content": true, "instruction": "Photo"}], "title": null, "structure": [{"type": "title", "level": "media", "required": false, "has_content": true, "instruction": "Innovation"}, {"type": "txt", "level": "media", "required": false, "has_content": true, "instruction": "Objet"}, {"type": "locations", "level": "meta", "caption": "Originally input location: <strong>Pointe-Noire</strong>.<br/><strong>Pointe-Noire</strong> found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>", "required": false, "has_content": true, "instruction": "Département"}, {"type": "img", "level": "media", "required": false, "has_content": true, "instruction": "Photo"}]}]	Charcoal lamp with USB port\n\n\n\t\t\t\t\tCoal-fed electric lamp\n\n\n\t\t\t\t\t\n\n\n\t\t\t\t\t\n\t\t\t\t\t\n\t\t\t\t\t\n\t\t\t\t\t\n\n\n\t\t\t\t\t\n\n\n\t\t\t\t\t\n\t\t\t\t\t	\N	\N	0	2022-08-08 11:21:15.002664+02	2022-08-08 11:21:15.002664+02	45e18bc3-8805-45e1-8c54-b356bcee4912	11	f	\N
41	Casava battery	[{"type": "section", "items": [{"txt": "Casava-based electric battery ok", "type": "txt", "level": "media", "fontsize": 1, "required": false, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": true, "instruction": "Objet"}, {"type": "locations", "level": "meta", "caption": "Originally input location: <strong>Pointe-Noire</strong>.<br/><strong>Pointe-Noire</strong> found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>", "required": false, "has_content": true, "instruction": "Département", "centerpoints": [{"lat": -4.7975373, "lng": 11.8503297}]}, {"src": "uploads/45e18bc3-8805-45e1-8c54-b356bcee4912/c15893195530e1d1e201b70383088d1a", "type": "img", "level": "media", "scale": "original", "required": false, "textalign": "left", "has_content": true, "instruction": "Photo"}], "title": "", "structure": [{"type": "title", "level": "media", "required": false, "has_content": true, "instruction": "Innovation"}, {"type": "txt", "level": "media", "required": false, "has_content": true, "instruction": "Objet"}, {"type": "locations", "level": "meta", "caption": "Originally input location: <strong>Pointe-Noire</strong>.<br/><strong>Pointe-Noire</strong> found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>", "required": false, "has_content": true, "instruction": "Département"}, {"type": "img", "level": "media", "required": false, "has_content": true, "instruction": "Photo"}]}]	Casava battery\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\tCasava-based electric battery ok\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t	\N	\N	2	2022-08-08 11:21:15.002664+02	2022-08-08 11:22:08.318727+02	45e18bc3-8805-45e1-8c54-b356bcee4912	11	t	\N
50	Motocicleta sobre rieles	[{"lead": null, "type": "section", "items": [{"txt": "Motocicleta sobre rieles", "type": "title", "has_content": true, "instruction": "Nombre de la solución"}, {"txt": null, "type": "txt", "has_content": false, "instruction": "Nombre del creador(es)"}, {"txt": "Vagón sobre rieles movido por motocicleta. La solución surge en un contexto como el colombiano donde la infraestructura ferroviaria fue abandonada.\\r\\n\\r\\nCambia de nombre en función del territorio, por ejemplo en Cauca es conocido como Brujitas, en Risaralda como Marranitas.\\r\\n\\r\\nImagenes tomadas de internet", "type": "txt", "has_content": true, "instruction": "Descripción"}, {"srcs": ["https://www.jotform.com/uploads/PNUD/201545353901045/4844080531982763778/Brujitas.png", "https://www.jotform.com/uploads/PNUD/201545353901045/4844080531982763778/Brujitas2.png", "https://www.jotform.com/uploads/PNUD/201545353901045/4844080531982763778/Brujitas3.png"], "type": "mosaic", "has_content": true, "instruction": "Adjunta la imagen de tu iniciativa"}, {"type": "locations", "caption": "Originally input location: <strong>Cauca,Colombia</strong>.<br/><strong>Cauca,Colombia</strong> found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>", "has_content": true, "instruction": "Ubicación", "centerpoints": [{"lat": 2.715645, "lng": -76.662665}]}, {"txt": "La posibilidad de la adaptación de infraestructura que no esta disponible.", "type": "txt", "has_content": true, "instruction": "¿ Que aprendizajes nos deja está solución?"}, {"txt": "En aquellos contexto donde exista infraestructura abandonada.", "type": "txt", "has_content": true, "instruction": "¿ Cómo puede esta solución ser aplicada a otras comunidades ?"}, {"type": "checklist", "options": [{"id": 0, "name": "a la venta", "checked": true}], "has_content": true, "instruction": "Estado de la Solución"}, {"tags": [{"key": 11, "name": "Sustainable cities and communities", "type": "sdg"}], "type": "sdgs", "has_content": true, "instruction": "Selecciona uno o varios Objetivos de Desarrollo Sostenible relacionados con la solución:"}, {"tags": [{"key": null, "name": "Movilidad", "type": "tag"}], "type": "tags", "has_content": true, "instruction": "Tags/Etiquetas"}], "title": null, "structure": [{"type": "title", "level": "media", "required": false, "has_content": true, "instruction": "Nombre de la solución"}, {"type": "txt", "level": "media", "required": false, "has_content": false, "instruction": "Nombre del creador(es)"}, {"type": "txt", "level": "media", "required": false, "has_content": true, "instruction": "Descripción"}, {"type": "mosaic", "level": "media", "required": false, "has_content": true, "instruction": "Adjunta la imagen de tu iniciativa"}, {"type": "locations", "level": "meta", "caption": "Originally input location: <strong>Cauca,Colombia</strong>.<br/><strong>Cauca,Colombia</strong> found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>", "required": false, "has_content": true, "instruction": "Ubicación"}, {"type": "txt", "level": "media", "required": false, "has_content": true, "instruction": "¿ Que aprendizajes nos deja está solución?"}, {"type": "txt", "level": "media", "required": false, "has_content": true, "instruction": "¿ Cómo puede esta solución ser aplicada a otras comunidades ?"}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "a la venta", "checked": false}], "required": false, "has_content": true, "instruction": "Estado de la Solución"}, {"type": "sdgs", "level": "meta", "required": false, "has_content": true, "instruction": "Selecciona uno o varios Objetivos de Desarrollo Sostenible relacionados con la solución:"}, {"type": "tags", "level": "meta", "required": false, "has_content": true, "instruction": "Tags/Etiquetas"}]}]	Motocicleta sobre rieles\n\n\n\t\t\t\t\tVagón sobre rieles movido por motocicleta. La solución surge en un contexto como el colombiano donde la infraestructura ferroviaria fue abandonada.\r\n\r\nCambia de nombre en función del territorio, por ejemplo en Cauca es conocido como Brujitas, en Risaralda como Marranitas.\r\n\r\nImagenes tomadas de internet\n\nLa posibilidad de la adaptación de infraestructura que no esta disponible.\n\nEn aquellos contexto donde exista infraestructura abandonada.\n\n\n\t\t\t\t\t\n\n\n\t\t\t\t\ta la venta\n\t\t\t\t\t\n\t\t\t\t\t\n\t\t\t\t\t\n\n\n\t\t\t\t\t\n\n\n\t\t\t\t\t\n\t\t\t\t\t	\N	\N	0	2022-08-08 11:34:47.170953+02	2022-08-08 11:34:47.170953+02	45e18bc3-8805-45e1-8c54-b356bcee4912	13	f	\N
51	Egonatura - Estufa Ecoeficiente	[{"lead": null, "type": "section", "items": [{"txt": "Egonatura - Estufa Ecoeficiente", "type": "title", "has_content": true, "instruction": "Nombre de la solución"}, {"txt": "Nelson y Alexander Rojas", "type": "txt", "has_content": true, "instruction": "Nombre del creador(es)"}, {"txt": "Estufa de leña que transforma el calor en energía luminica suficiente para prender hasta 10 lamparas y cargar celulares durante 3 horas.\\r\\n\\r\\nVínculos:\\r\\nhttps://www.youtube.com/watch?v=ShLiHYgUOkE\\r\\nhttps://www.facebook.com/MetalcofServices/", "type": "txt", "has_content": true, "instruction": "Descripción"}, {"srcs": ["https://www.jotform.com/uploads/PNUD/201545353901045/4844076601982250434/Estufas.png", "https://www.jotform.com/uploads/PNUD/201545353901045/4844076601982250434/estufa-para-beneficios-1024x837.png"], "type": "mosaic", "has_content": true, "instruction": "Adjunta la imagen de tu iniciativa"}, {"type": "locations", "caption": "Originally input location: <strong>Neiva, Huila, Colombia</strong>.<br/><strong>Neiva, Huila, Colombia</strong> found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>", "has_content": true, "instruction": "Ubicación", "centerpoints": [{"lat": 2.9263127, "lng": -75.2891733}]}, {"txt": "La posibilidad de crear innovación en ciudades secundarias.", "type": "txt", "has_content": true, "instruction": "¿ Que aprendizajes nos deja está solución?"}, {"txt": "Resulta de gran utilidad en territorios dejados atrás.", "type": "txt", "has_content": true, "instruction": "¿ Cómo puede esta solución ser aplicada a otras comunidades ?"}, {"type": "checklist", "options": [{"id": 0, "name": "a la venta", "checked": true}], "has_content": true, "instruction": "Estado de la Solución"}, {"tags": [{"key": 9, "name": "Industry, innovation and infrastructure", "type": "sdg"}, {"key": 11, "name": "Sustainable cities and communities", "type": "sdg"}], "type": "sdgs", "has_content": true, "instruction": "Selecciona uno o varios Objetivos de Desarrollo Sostenible relacionados con la solución:"}, {"tags": [{"key": null, "name": "Energía", "type": "tag"}], "type": "tags", "has_content": true, "instruction": "Tags/Etiquetas"}], "title": null, "structure": [{"type": "title", "level": "media", "required": false, "has_content": true, "instruction": "Nombre de la solución"}, {"type": "txt", "level": "media", "required": false, "has_content": true, "instruction": "Nombre del creador(es)"}, {"type": "txt", "level": "media", "required": false, "has_content": true, "instruction": "Descripción"}, {"type": "mosaic", "level": "media", "required": false, "has_content": true, "instruction": "Adjunta la imagen de tu iniciativa"}, {"type": "locations", "level": "meta", "caption": "Originally input location: <strong>Neiva, Huila, Colombia</strong>.<br/><strong>Neiva, Huila, Colombia</strong> found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>", "required": false, "has_content": true, "instruction": "Ubicación"}, {"type": "txt", "level": "media", "required": false, "has_content": true, "instruction": "¿ Que aprendizajes nos deja está solución?"}, {"type": "txt", "level": "media", "required": false, "has_content": true, "instruction": "¿ Cómo puede esta solución ser aplicada a otras comunidades ?"}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "a la venta", "checked": false}], "required": false, "has_content": true, "instruction": "Estado de la Solución"}, {"type": "sdgs", "level": "meta", "required": false, "has_content": true, "instruction": "Selecciona uno o varios Objetivos de Desarrollo Sostenible relacionados con la solución:"}, {"type": "tags", "level": "meta", "required": false, "has_content": true, "instruction": "Tags/Etiquetas"}]}]	Egonatura - Estufa Ecoeficiente\n\n\n\t\t\t\t\tNelson y Alexander Rojas\n\nEstufa de leña que transforma el calor en energía luminica suficiente para prender hasta 10 lamparas y cargar celulares durante 3 horas.\r\n\r\nVínculos:\r\nhttps://www.youtube.com/watch?v=ShLiHYgUOkE\r\nhttps://www.facebook.com/MetalcofServices/\n\nLa posibilidad de crear innovación en ciudades secundarias.\n\nResulta de gran utilidad en territorios dejados atrás.\n\n\n\t\t\t\t\t\n\n\n\t\t\t\t\ta la venta\n\t\t\t\t\t\n\t\t\t\t\t\n\t\t\t\t\t\n\n\n\t\t\t\t\t\n\n\n\t\t\t\t\t\n\t\t\t\t\t	\N	\N	0	2022-08-08 11:34:47.170953+02	2022-08-08 11:34:47.170953+02	45e18bc3-8805-45e1-8c54-b356bcee4912	13	f	\N
52	Paca Biodigestora	[{"lead": null, "type": "section", "items": [{"txt": "Paca Biodigestora", "type": "title", "has_content": true, "instruction": "Nombre de la solución"}, {"txt": "PaquersXBogotá", "type": "txt", "has_content": true, "instruction": "Nombre del creador(es)"}, {"txt": "En los ultimos meses se ha gestado un movimiento civico en torno a la transformación de los residuos orgánicos a partir de la creación de pacas digestoras en diferentes parques de la ciudad.\\r\\n\\r\\nLo que inicio como un ejercicio asilado se ha venido escalando a partir de la replica e incluso el acompañamiento por parte del gobierno locales.\\r\\n\\r\\nEn el caso de Bogotá se han logrado recuperar hasta 10 tonelas de desechos orgánicos.\\r\\n\\r\\n\\r\\nVínculo\\r\\nhttps://www.facebook.com/pacadigestorabogota/", "type": "txt", "has_content": true, "instruction": "Descripción"}, {"srcs": ["https://www.jotform.com/uploads/PNUD/201545353901045/4844063451982371149/PaquerxsBogota.jpg", "https://www.jotform.com/uploads/PNUD/201545353901045/4844063451982371149/PaquerxsBogota2.jpg", "https://www.jotform.com/uploads/PNUD/201545353901045/4844063451982371149/PaquerxsBogota3.jpg", "https://www.jotform.com/uploads/PNUD/201545353901045/4844063451982371149/PaquerxsBogota4.jpg", "https://www.jotform.com/uploads/PNUD/201545353901045/4844063451982371149/ParquersBogota.jpg"], "type": "mosaic", "has_content": true, "instruction": "Adjunta la imagen de tu iniciativa"}, {"type": "locations", "caption": "Originally input location: <strong>Bogotá D.C.,Colombia</strong>.<br/><strong>Bogotá D.C.,Colombia</strong> found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>", "has_content": true, "instruction": "Ubicación", "centerpoints": [{"lat": 4.6247961, "lng": -74.0936843}]}, {"txt": "La posibilidad de ocupar espacios que no estaban siendo ocupados y/o de resignificarlos a partir de una nueva funcionalidad en la cuál ciudadanos de las diferentes generaciones se pueden vincular.", "type": "txt", "has_content": true, "instruction": "¿ Que aprendizajes nos deja está solución?"}, {"txt": "Es relativamente sencillo, sin embargo, se requiere de un equipo o persona responsable del mantenimiento que mantenga a la comunida entusiasmada.", "type": "txt", "has_content": true, "instruction": "¿ Cómo puede esta solución ser aplicada a otras comunidades ?"}, {"type": "checklist", "options": [{"id": 0, "name": "a la venta", "checked": true}], "has_content": true, "instruction": "Estado de la Solución"}, {"tags": [{"key": 11, "name": "Sustainable cities and communities", "type": "sdg"}, {"key": 12, "name": "Responsible consumption and production", "type": "sdg"}], "type": "sdgs", "has_content": true, "instruction": "Selecciona uno o varios Objetivos de Desarrollo Sostenible relacionados con la solución:"}, {"tags": [{"key": null, "name": "Acupuntura Urbana", "type": "tag"}, {"key": null, "name": " Economía Circular", "type": "tag"}], "type": "tags", "has_content": true, "instruction": "Tags/Etiquetas"}], "title": null, "structure": [{"type": "title", "level": "media", "required": false, "has_content": true, "instruction": "Nombre de la solución"}, {"type": "txt", "level": "media", "required": false, "has_content": true, "instruction": "Nombre del creador(es)"}, {"type": "txt", "level": "media", "required": false, "has_content": true, "instruction": "Descripción"}, {"type": "mosaic", "level": "media", "required": false, "has_content": true, "instruction": "Adjunta la imagen de tu iniciativa"}, {"type": "locations", "level": "meta", "caption": "Originally input location: <strong>Bogotá D.C.,Colombia</strong>.<br/><strong>Bogotá D.C.,Colombia</strong> found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>", "required": false, "has_content": true, "instruction": "Ubicación"}, {"type": "txt", "level": "media", "required": false, "has_content": true, "instruction": "¿ Que aprendizajes nos deja está solución?"}, {"type": "txt", "level": "media", "required": false, "has_content": true, "instruction": "¿ Cómo puede esta solución ser aplicada a otras comunidades ?"}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "a la venta", "checked": false}], "required": false, "has_content": true, "instruction": "Estado de la Solución"}, {"type": "sdgs", "level": "meta", "required": false, "has_content": true, "instruction": "Selecciona uno o varios Objetivos de Desarrollo Sostenible relacionados con la solución:"}, {"type": "tags", "level": "meta", "required": false, "has_content": true, "instruction": "Tags/Etiquetas"}]}]	Paca Biodigestora\n\n\n\t\t\t\t\tPaquersXBogotá\n\nEn los ultimos meses se ha gestado un movimiento civico en torno a la transformación de los residuos orgánicos a partir de la creación de pacas digestoras en diferentes parques de la ciudad.\r\n\r\nLo que inicio como un ejercicio asilado se ha venido escalando a partir de la replica e incluso el acompañamiento por parte del gobierno locales.\r\n\r\nEn el caso de Bogotá se han logrado recuperar hasta 10 tonelas de desechos orgánicos.\r\n\r\n\r\nVínculo\r\nhttps://www.facebook.com/pacadigestorabogota/\n\nLa posibilidad de ocupar espacios que no estaban siendo ocupados y/o de resignificarlos a partir de una nueva funcionalidad en la cuál ciudadanos de las diferentes generaciones se pueden vincular.\n\nEs relativamente sencillo, sin embargo, se requiere de un equipo o persona responsable del mantenimiento que mantenga a la comunida entusiasmada.\n\n\n\t\t\t\t\t\n\n\n\t\t\t\t\ta la venta\n\t\t\t\t\t\n\t\t\t\t\t\n\t\t\t\t\t\n\n\n\t\t\t\t\t\n\n\n\t\t\t\t\t\n\t\t\t\t\t	\N	\N	0	2022-08-08 11:34:47.170953+02	2022-08-08 11:34:47.170953+02	45e18bc3-8805-45e1-8c54-b356bcee4912	13	f	\N
53	Coca Nasa - Industría Indigena de Colombia	[{"lead": null, "type": "section", "items": [{"txt": "Coca Nasa - Industría Indigena de Colombia", "type": "title", "has_content": true, "instruction": "Nombre de la solución"}, {"txt": "Fabiola Piñacue", "type": "txt", "has_content": true, "instruction": "Nombre del creador(es)"}, {"txt": "Oferta de productos derivados de la hoja de Coca, incluyendo arómatica, galletas, vino,ron, aguardiente, gaseosa, cerveza entre otros.\\r\\n\\r\\nVínculo:\\r\\nhttps://cocanasa.org/", "type": "txt", "has_content": true, "instruction": "Descripción"}, {"srcs": ["https://www.jotform.com/uploads/PNUD/201545353901045/4832466203369791406/CocaNasa.png"], "type": "mosaic", "has_content": true, "instruction": "Adjunta la imagen de tu iniciativa"}, {"type": "locations", "caption": "Originally input location: <strong>Nariño, Colombia</strong>.<br/><strong>Nariño, Colombia</strong> found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>", "has_content": true, "instruction": "Ubicación", "centerpoints": [{"lat": 1.5, "lng": -78.0000086}]}, {"txt": "La posibilidad de crear un portafolio de productos en torno a un solor producto.", "type": "txt", "has_content": true, "instruction": "¿ Que aprendizajes nos deja está solución?"}, {"txt": "Alguno territorios pueden diversificar a partir de un solo producto.", "type": "txt", "has_content": true, "instruction": "¿ Cómo puede esta solución ser aplicada a otras comunidades ?"}, {"type": "checklist", "options": [{"id": 0, "name": "a la venta", "checked": true}], "has_content": true, "instruction": "Estado de la Solución"}, {"tags": [{"key": 8, "name": "Decent work and economic growth", "type": "sdg"}, {"key": 9, "name": "Industry, innovation and infrastructure", "type": "sdg"}], "type": "sdgs", "has_content": true, "instruction": "Selecciona uno o varios Objetivos de Desarrollo Sostenible relacionados con la solución:"}, {"tags": [{"key": null, "name": "Coca", "type": "tag"}, {"key": null, "name": " Cadenas de Valor", "type": "tag"}], "type": "tags", "has_content": true, "instruction": "Tags/Etiquetas"}], "title": null, "structure": [{"type": "title", "level": "media", "required": false, "has_content": true, "instruction": "Nombre de la solución"}, {"type": "txt", "level": "media", "required": false, "has_content": true, "instruction": "Nombre del creador(es)"}, {"type": "txt", "level": "media", "required": false, "has_content": true, "instruction": "Descripción"}, {"type": "mosaic", "level": "media", "required": false, "has_content": true, "instruction": "Adjunta la imagen de tu iniciativa"}, {"type": "locations", "level": "meta", "caption": "Originally input location: <strong>Nariño, Colombia</strong>.<br/><strong>Nariño, Colombia</strong> found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>", "required": false, "has_content": true, "instruction": "Ubicación"}, {"type": "txt", "level": "media", "required": false, "has_content": true, "instruction": "¿ Que aprendizajes nos deja está solución?"}, {"type": "txt", "level": "media", "required": false, "has_content": true, "instruction": "¿ Cómo puede esta solución ser aplicada a otras comunidades ?"}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "a la venta", "checked": false}], "required": false, "has_content": true, "instruction": "Estado de la Solución"}, {"type": "sdgs", "level": "meta", "required": false, "has_content": true, "instruction": "Selecciona uno o varios Objetivos de Desarrollo Sostenible relacionados con la solución:"}, {"type": "tags", "level": "meta", "required": false, "has_content": true, "instruction": "Tags/Etiquetas"}]}]	Coca Nasa - Industría Indigena de Colombia\n\n\n\t\t\t\t\tFabiola Piñacue\n\nOferta de productos derivados de la hoja de Coca, incluyendo arómatica, galletas, vino,ron, aguardiente, gaseosa, cerveza entre otros.\r\n\r\nVínculo:\r\nhttps://cocanasa.org/\n\nLa posibilidad de crear un portafolio de productos en torno a un solor producto.\n\nAlguno territorios pueden diversificar a partir de un solo producto.\n\n\n\t\t\t\t\t\n\n\n\t\t\t\t\ta la venta\n\t\t\t\t\t\n\t\t\t\t\t\n\t\t\t\t\t\n\n\n\t\t\t\t\t\n\n\n\t\t\t\t\t\n\t\t\t\t\t	\N	\N	0	2022-08-08 11:34:47.170953+02	2022-08-08 11:34:47.170953+02	45e18bc3-8805-45e1-8c54-b356bcee4912	13	f	\N
49	Tarabitas / Garrochas test saving	[{"type": "section", "items": [{"txt": "", "type": "txt", "level": "media", "fontsize": 1, "required": false, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": false, "instruction": "Nombre del creador(es)"}, {"txt": "Movilidad y transporte en territorios montañosos de Colombia, Venezuela y Ecuador.\\n\\n\\nEn un sistema que funciona con un motor y la gravedad.", "type": "txt", "level": "media", "fontsize": 1, "required": false, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": true, "instruction": "Descripción"}, {"srcs": ["https://www.jotform.com/uploads/PNUD/201545353901045/4844084311985694065/Tarabita1.png", "https://www.jotform.com/uploads/PNUD/201545353901045/4844084311985694065/Tarabita2.png", "https://www.jotform.com/uploads/PNUD/201545353901045/4844084311985694065/Tarabita3.png"], "type": "mosaic", "level": "media", "required": false, "has_content": true, "instruction": "Adjunta la imagen de tu iniciativa", "verticalalign": "center"}, {"type": "locations", "level": "meta", "caption": "Originally input location: <strong>Amazonas, Colombia</strong>.<br/><strong>Amazonas, Colombia</strong> found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>", "required": false, "has_content": true, "instruction": "Ubicación", "centerpoints": [{"lat": -1.0197136, "lng": -71.9383333}]}, {"txt": "En condiciones extremas las personas están dispuesta a realizar desplzamientos que ponen en riesgo su seguridad.", "type": "txt", "level": "media", "fontsize": 1, "required": false, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": true, "instruction": "¿ Que aprendizajes nos deja está solución?"}, {"txt": "En entornos con altas pendientes y limitada infraestructura resulta útil para el desplazamientos de productos y personas.", "type": "txt", "level": "media", "fontsize": 1, "required": false, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": true, "instruction": "¿ Cómo puede esta solución ser aplicada a otras comunidades ?"}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "a la venta", "checked": true}], "fontsize": 1, "required": false, "fontstyle": "normal", "fontweight": "normal", "has_content": true, "instruction": "Estado de la Solución"}, {"tags": [{"key": 11, "name": "Sustainable cities and communities", "type": "sdg"}], "type": "sdgs", "level": "meta", "required": false, "has_content": true, "instruction": "Selecciona uno o varios Objetivos de Desarrollo Sostenible relacionados con la solución:"}, {"tags": [{"key": null, "name": "Movilidad", "type": "tag"}], "type": "tags", "level": "meta", "required": false, "has_content": true, "instruction": "Tags/Etiquetas"}, {"tags": [{"id": 425, "key": null, "name": "Regulatory Sandboxes", "type": "method"}, {"id": 440, "key": null, "name": "Ethnography", "type": "method"}], "type": "methods", "level": "meta", "required": false, "has_content": true}, {"tags": [{"id": 466, "key": null, "name": "issue mapping", "type": "datasource"}, {"id": 487, "key": null, "name": "smart wi-fi generated data", "type": "datasource"}], "type": "datasources", "level": "meta", "required": false, "has_content": true}], "title": "", "structure": [{"type": "title", "level": "media", "required": false, "has_content": true, "instruction": "Nombre de la solución"}, {"type": "txt", "level": "media", "required": false, "has_content": false, "instruction": "Nombre del creador(es)"}, {"type": "txt", "level": "media", "required": false, "has_content": true, "instruction": "Descripción"}, {"type": "mosaic", "level": "media", "required": false, "has_content": true, "instruction": "Adjunta la imagen de tu iniciativa"}, {"type": "locations", "level": "meta", "caption": "Originally input location: <strong>Amazonas, Colombia</strong>.<br/><strong>Amazonas, Colombia</strong> found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>", "required": false, "has_content": true, "instruction": "Ubicación"}, {"type": "txt", "level": "media", "required": false, "has_content": true, "instruction": "¿ Que aprendizajes nos deja está solución?"}, {"type": "txt", "level": "media", "required": false, "has_content": true, "instruction": "¿ Cómo puede esta solución ser aplicada a otras comunidades ?"}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "a la venta", "checked": false}], "required": false, "has_content": true, "instruction": "Estado de la Solución"}, {"type": "sdgs", "level": "meta", "required": false, "has_content": true, "instruction": "Selecciona uno o varios Objetivos de Desarrollo Sostenible relacionados con la solución:"}, {"type": "tags", "level": "meta", "required": false, "has_content": true, "instruction": "Tags/Etiquetas"}]}]	Tarabitas / Garrochas test saving\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\tMovilidad y transporte en territorios montañosos de Colombia, Venezuela y Ecuador.\n\n\nEn un sistema que funciona con un motor y la gravedad.\n\nEn condiciones extremas las personas están dispuesta a realizar desplzamientos que ponen en riesgo su seguridad.\n\nEn entornos con altas pendientes y limitada infraestructura resulta útil para el desplazamientos de productos y personas.\n\n\n\t\t\t\n\n\n\t\t\ta la venta\n\t\t\t\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t	\N	\N	3	2022-08-08 11:34:47.170953+02	2022-08-18 15:57:44.350193+02	45e18bc3-8805-45e1-8c54-b356bcee4912	13	f	\N
5	This is a pad for testing the tagging mechanisms that journalists use	[{"type": "section", "items": [{"txt": "This is a first paragraph. There seems to be an issue when saving tags. And some information after a line break. \\n\\n\\ntest.   Try now.", "type": "txt", "level": "media", "fontsize": 1, "required": false, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": true}, {"txt": "This all seems to work. The question is, do we remove tags that have 0 occurrences?", "type": "txt", "level": "media", "fontsize": 1, "required": false, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": true}, {"txt": "Adding some more in the middle.", "type": "txt", "level": "media", "fontsize": 1, "required": false, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": true}, {"txt": "This is a text directly inserted after the one above.", "type": "txt", "level": "media", "fontsize": 1, "required": false, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": true}, {"txt": "And another one. this is great", "type": "txt", "level": "media", "fontsize": 1, "required": false, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": true}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "item 1", "checked": true}, {"id": 1, "name": "item2", "checked": true}, {"id": 2, "name": "item3", "checked": true}, {"id": 3, "name": "item 4", "checked": true}], "fontsize": 1, "required": false, "fontstyle": "normal", "fontweight": "normal", "has_content": true}, {"txt": "This one comes in the middle", "type": "txt", "level": "media", "fontsize": 1, "required": false, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": true}, {"txt": "adding another underneath. this is brilliant!", "type": "txt", "level": "media", "fontsize": 1, "required": false, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": true}, {"type": "radiolist", "level": "media", "options": [{"id": 0, "name": "option 1", "checked": false}, {"id": 1, "name": "option 2", "checked": false}, {"id": 2, "name": "option 3", "checked": true}], "fontsize": 1, "required": false, "fontstyle": "normal", "fontweight": "normal", "has_content": true}, {"tags": [{"id": 11, "key": null, "name": "affordable housing", "type": "tag"}, {"id": 16, "key": null, "name": "air pollution", "type": "tag"}, {"id": 17, "key": null, "name": "alternative energy", "type": "tag"}, {"id": 4, "key": null, "name": "access to information", "type": "tag"}], "type": "tags", "level": "meta", "required": false, "has_content": true}, {"txt": "And this one comes after a meta tag", "type": "txt", "level": "media", "fontsize": 1, "required": false, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": true}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "add one", "checked": false}, {"id": 1, "name": "add two", "checked": false}, {"id": 2, "name": "add three", "checked": false}, {"id": 3, "name": "add four", "checked": false}], "fontsize": 1, "required": false, "fontstyle": "normal", "fontweight": "normal", "has_content": false}, {"tags": [{"id": 317, "key": 3, "name": "Good health and well-being", "type": "sdg"}, {"id": 318, "key": 4, "name": "Quality education", "type": "sdg"}], "type": "sdgs", "level": "meta", "required": false, "has_content": true}, {"txt": "And this one gets added at the end because no sibling.", "type": "txt", "level": "media", "fontsize": 1, "required": false, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": true}, {"src": null, "html": "This seems to work too\\n\\n", "type": "embed", "level": "media", "required": false, "textalign": "left", "has_content": true}, {"txt": "and another at the end.", "type": "txt", "level": "media", "fontsize": 1, "required": false, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": true}, {"type": "radiolist", "level": "media", "options": [{"id": 0, "name": "and a radio 1 in the middle", "checked": true}, {"id": 1, "name": "and a radio 2", "checked": false}], "fontsize": 1, "required": false, "fontstyle": "normal", "fontweight": "normal", "has_content": true}, {"txt": "another test", "type": "txt", "level": "media", "fontsize": 1, "required": false, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": true}, {"size": [802, 400], "type": "drawing", "level": "media", "shapes": [{"type": "line", "color": "#000000", "points": [[232, 236], [240, 227], [253, 213], [267, 191], [275, 173], [282, 154], [284, 139], [284, 129], [283, 126], [276, 122], [273, 122], [262, 128], [253, 137], [241, 151], [233, 167], [225, 184], [222, 198], [218, 214], [217, 223], [217, 234], [219, 237], [235, 238], [252, 228], [270, 213], [279, 203], [290, 189], [296, 179], [298, 175], [301, 171], [301, 169], [302, 168], [302, 169], [301, 174], [297, 181], [293, 191], [290, 203], [289, 213], [288, 223], [288, 232], [291, 237], [296, 240], [307, 241], [315, 241], [324, 236], [331, 230], [338, 222], [344, 214], [349, 205], [352, 199], [355, 193], [357, 188], [358, 184], [360, 181], [360, 179], [360, 178], [360, 178], [358, 177], [356, 177], [353, 177], [348, 178], [343, 181], [338, 186], [331, 194], [327, 201], [324, 209], [324, 217], [324, 224], [329, 228], [340, 231], [363, 229], [381, 216], [408, 187], [424, 152], [433, 105], [435, 81], [436, 59], [436, 50], [436, 42], [434, 39], [431, 38], [427, 42], [416, 57], [403, 79], [383, 119], [369, 158], [364, 174], [359, 203], [359, 219], [359, 229], [364, 234], [372, 236], [388, 236], [410, 226], [434, 208], [466, 173], [480, 145], [487, 125], [493, 100], [495, 81], [495, 67], [495, 59], [494, 52], [492, 48], [488, 46], [476, 46], [473, 48], [454, 65], [442, 80], [429, 98], [417, 120], [406, 144], [401, 159], [398, 177], [396, 192], [396, 202], [396, 211], [396, 215], [401, 223], [402, 225], [408, 230], [411, 233], [415, 234], [419, 234], [423, 234], [425, 233], [431, 230], [436, 227], [445, 220], [452, 215], [458, 209], [463, 203], [466, 199], [469, 195], [472, 192], [476, 188], [480, 185], [486, 180], [490, 175], [496, 168], [498, 164], [499, 162], [499, 159], [499, 158], [498, 158], [495, 158], [490, 158], [483, 163], [476, 170], [467, 183], [461, 192], [457, 200], [455, 206], [453, 215], [453, 221], [453, 227], [454, 230], [460, 235], [467, 237], [476, 238], [484, 239], [497, 237], [505, 233], [510, 230], [518, 224], [522, 220], [527, 214], [533, 204], [540, 189], [545, 179], [551, 160], [553, 153], [555, 135], [555, 131], [555, 127], [552, 126], [546, 128], [538, 138], [532, 148], [523, 168], [520, 180], [516, 203], [516, 215], [516, 221], [516, 226], [519, 229], [524, 229], [531, 228], [541, 217], [552, 202], [563, 183], [569, 170], [574, 158], [579, 141], [580, 130], [581, 112], [581, 100], [582, 86], [583, 74], [584, 65], [584, 60], [584, 51], [584, 43], [584, 32], [584, 26], [583, 22], [583, 20], [583, 20], [583, 29], [583, 46], [583, 88], [583, 124], [583, 174], [583, 203], [583, 237], [583, 257], [583, 270], [583, 282], [583, 289], [583, 290], [583, 290]], "lineWidth": "2"}, {"type": "line", "color": "#000000", "points": [[116, 333], [116, 328], [116, 326], [116, 325], [116, 324], [115, 324], [112, 324], [101, 330], [87, 340], [69, 354], [59, 363], [55, 368], [52, 372], [52, 376], [52, 377], [58, 377], [66, 376], [76, 370], [85, 363], [96, 352], [101, 346], [105, 341], [107, 339], [108, 337], [109, 337], [107, 338], [105, 341], [103, 344], [101, 351], [101, 359], [105, 365], [117, 369], [140, 371], [157, 370], [181, 360], [196, 350], [206, 340], [209, 334], [212, 328], [212, 327], [212, 326]], "lineWidth": "2"}, {"type": "line", "color": "#000000", "points": [[408, 308], [405, 308], [402, 308], [396, 308], [383, 308], [370, 308], [344, 313], [329, 318], [311, 324], [299, 332], [296, 334], [293, 341], [293, 342], [296, 344], [323, 344], [363, 331], [387, 315], [412, 294], [423, 277], [436, 255], [441, 240], [442, 234], [443, 231], [443, 230], [441, 230], [438, 231], [434, 238], [426, 253], [421, 263], [413, 285], [410, 296], [407, 310], [405, 322], [405, 328], [405, 333], [405, 335], [405, 337], [405, 338], [405, 338], [406, 338], [407, 338], [408, 338], [409, 337], [409, 337], [409, 337], [409, 336], [410, 333], [412, 329], [417, 321], [427, 304], [437, 293], [449, 281], [456, 274], [467, 267], [472, 267], [477, 267], [481, 267], [483, 268], [483, 271], [483, 276], [478, 281], [470, 287], [460, 291], [452, 293], [445, 294], [442, 295], [441, 295], [441, 295], [447, 291], [452, 289], [456, 288], [461, 288], [464, 288], [466, 288], [470, 290], [473, 296], [478, 306], [481, 313], [484, 318], [488, 322], [492, 324], [494, 324], [496, 321], [498, 314], [500, 314], [506, 309], [511, 306], [516, 301], [520, 297], [524, 292], [526, 288], [527, 286], [527, 284], [527, 282], [525, 281], [521, 280], [519, 280], [513, 280], [510, 283], [507, 288], [505, 293], [503, 299], [503, 304], [503, 311], [505, 314], [513, 320], [521, 321], [529, 320], [535, 315], [539, 312], [542, 307], [543, 304], [544, 302], [544, 301], [544, 300], [543, 300], [536, 302], [534, 304], [527, 312], [525, 317], [524, 325], [525, 329], [530, 333], [540, 335], [554, 335], [566, 329], [579, 321], [593, 308], [595, 306], [601, 298], [602, 295], [603, 293], [603, 293], [603, 293], [601, 293], [598, 296], [595, 302], [593, 305], [592, 313], [592, 319], [593, 322], [596, 325], [602, 327], [608, 327], [614, 324], [619, 318], [624, 308], [626, 303], [627, 298], [627, 296], [627, 295], [626, 295], [624, 296], [622, 300], [621, 305], [621, 311], [622, 319], [624, 321], [630, 324], [636, 324], [643, 321], [648, 314], [654, 305], [657, 297], [659, 292], [660, 288], [661, 286], [661, 284], [661, 284], [660, 286], [660, 288], [660, 291], [660, 293], [660, 297], [660, 301], [659, 310], [657, 313], [651, 324], [649, 329], [647, 335], [646, 338], [646, 339], [646, 340], [647, 339], [649, 333], [653, 324], [659, 307], [661, 301], [667, 286], [670, 282], [672, 277], [674, 274], [675, 272], [675, 271], [676, 271], [676, 271], [676, 271], [676, 271], [676, 272], [676, 281], [676, 290], [676, 301], [675, 312], [674, 318], [674, 325], [673, 328], [673, 330], [673, 331], [673, 331], [676, 328], [679, 324], [682, 318], [684, 314], [686, 310], [688, 308], [689, 306], [689, 306], [690, 306], [690, 307], [690, 312], [690, 316], [690, 320], [690, 325], [691, 327], [691, 327], [692, 328], [695, 326], [698, 324], [700, 320], [702, 317], [705, 315], [706, 312], [708, 309], [710, 305], [711, 302], [712, 298], [713, 295], [713, 292], [713, 291], [711, 291], [707, 295], [702, 307], [699, 319], [696, 347], [696, 370], [700, 393], [696, 391], [706, 384], [718, 377], [728, 371], [736, 366], [742, 362], [746, 359], [751, 354], [752, 350], [754, 343], [755, 341], [755, 336], [753, 334], [751, 332], [748, 331], [744, 330], [738, 330], [724, 330], [706, 333], [672, 342], [662, 346], [639, 353], [626, 356], [618, 357]], "lineWidth": "2"}, {"type": "line", "color": "#0468B1", "points": [[169, 119], [169, 119], [167, 118], [163, 117], [158, 115], [148, 112], [134, 110], [124, 110], [102, 110], [88, 114], [66, 126], [49, 143], [39, 156], [31, 169], [27, 180], [25, 194], [23, 208], [23, 220], [25, 230], [33, 240], [37, 242], [43, 245], [50, 245], [57, 242], [69, 234], [78, 225], [91, 210], [101, 197], [105, 190], [110, 182], [112, 179], [114, 176], [114, 175], [114, 175], [114, 175], [113, 176], [113, 177], [113, 178], [113, 178], [113, 179], [113, 180], [115, 181], [118, 183], [123, 185], [129, 188], [136, 192], [149, 198], [158, 202], [163, 204], [168, 206], [171, 207], [172, 208], [173, 209], [174, 209], [174, 209], [174, 210], [174, 210], [174, 210], [172, 210], [164, 209], [152, 209], [142, 209], [131, 214], [116, 225], [113, 228], [107, 235], [104, 240], [103, 244], [102, 246], [102, 248], [102, 249], [102, 250], [102, 250], [107, 251], [112, 251], [124, 251], [141, 248], [162, 243], [178, 238], [202, 232], [212, 228], [225, 223], [232, 218], [235, 212], [236, 203], [231, 191], [222, 184], [205, 180], [193, 180], [172, 187], [161, 194], [151, 203], [143, 212], [138, 221], [136, 230], [135, 235], [136, 244], [140, 250], [145, 255], [152, 261], [157, 264], [165, 269], [170, 271], [174, 273], [178, 274], [182, 275], [183, 276], [183, 276], [184, 273], [184, 268], [182, 262], [179, 257], [171, 251], [164, 249], [156, 249], [147, 250], [131, 259], [120, 265], [109, 270], [98, 273], [86, 276], [77, 277], [69, 278], [64, 279], [60, 279], [57, 279], [56, 279], [56, 279], [56, 279], [56, 279], [56, 279], [56, 276], [56, 274], [57, 270], [57, 268], [58, 266], [58, 266], [59, 265], [61, 265], [67, 265], [80, 265], [101, 266], [141, 269], [171, 269], [238, 269], [294, 260], [352, 247], [374, 241], [396, 234], [410, 229], [414, 226], [419, 224], [422, 223], [422, 222], [423, 221], [423, 221], [423, 221], [423, 221], [423, 220], [422, 220], [422, 220], [422, 220], [421, 220], [420, 220], [419, 219], [418, 219], [416, 219], [416, 219], [415, 219], [415, 219], [414, 218], [412, 218], [412, 218]], "lineWidth": "7"}, {"type": "line", "color": "#000000", "points": [[752, 96], [335, 92], [335, 92], [330, 102], [318, 115], [301, 131], [285, 147], [269, 160], [256, 171], [243, 181], [233, 188], [226, 193], [220, 197], [215, 199], [206, 204], [196, 208], [196, 207], [196, 205], [200, 205], [209, 207], [215, 207], [219, 207], [223, 207], [226, 206], [230, 204], [235, 200], [244, 192], [256, 180], [268, 165], [282, 146], [287, 137], [298, 119], [301, 112], [307, 98], [311, 86], [315, 74], [317, 64], [319, 54], [319, 46], [320, 38], [321, 31], [321, 29], [321, 24], [321, 20], [321, 17], [321, 15], [321, 14], [321, 15], [321, 17], [322, 18], [323, 20], [324, 21], [325, 22], [326, 24], [326, 25], [327, 26], [328, 28], [329, 29], [329, 30], [330, 30], [330, 31], [331, 31], [333, 31]], "lineWidth": "2"}], "required": false, "has_content": true}], "title": "The title line height could be a bit larger", "structure": []}, {"type": "section", "items": [], "title": "", "structure": []}, {"type": "section", "items": [{"txt": "adding some text", "type": "txt", "level": "media", "fontsize": 1, "required": false, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": true}, {"src": "uploads/45e18bc3-8805-45e1-8c54-b356bcee4912/ff-4f3ff963cba8bb9ed84019f252d0ae3e.mp4", "type": "video", "level": "media", "required": false, "textalign": "left", "has_content": true}, {"src": "uploads/45e18bc3-8805-45e1-8c54-b356bcee4912/fd6df1275ee8a123a30dfeb5351b8e90.jpeg", "type": "img", "level": "media", "scale": "original", "required": false, "textalign": "center", "has_content": true}, {"txt": "adding a block in the middle", "type": "txt", "level": "media", "fontsize": 1, "required": false, "fontstyle": "italic", "textalign": "left", "fontweight": "normal", "has_content": true}, {"type": "radiolist", "level": "media", "options": [{"id": 0, "name": "and one in the next section", "checked": false}, {"id": 1, "name": "and two", "checked": false}], "fontsize": 1, "required": false, "fontstyle": "normal", "fontweight": "normal", "has_content": false}, {"txt": "And one more", "type": "txt", "level": "media", "fontsize": 1, "required": false, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": true}, {"txt": "and another text block", "type": "txt", "level": "media", "fontsize": 1, "required": false, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": true}, {"src": "uploads/45e18bc3-8805-45e1-8c54-b356bcee4912/5c2779c0bbcb5646c5b60261506863ec.jpg", "type": "img", "level": "media", "scale": "original", "required": false, "textalign": "left", "has_content": true}, {"tags": [{"id": 430, "key": null, "name": "Pilots", "type": "method"}, {"id": 432, "key": null, "name": "Minimal Viable Product (MVP)", "type": "method"}], "type": "methods", "level": "meta", "required": false, "has_content": true}, {"type": "locations", "level": "meta", "required": false, "has_content": true, "centerpoints": [{"lat": 7.318881730366756, "lng": 16.155395507812504}]}, {"tags": [{"id": 474, "key": null, "name": "communicational pieces", "type": "datasource"}, {"id": 487, "key": null, "name": "smart wi-fi generated data", "type": "datasource"}], "type": "datasources", "level": "meta", "required": false, "has_content": true}], "title": "This is another section", "structure": []}]	This is a pad for testing the tagging mechanisms that journalists use\n\n\n\t\t\tThe title line height could be a bit larger\n\n\n\nThis is another section\n\n\n\t\t\t\n\n\n\t\t\tThis is a first paragraph. There seems to be an issue when saving tags. And some information after a line break. \n\n\ntest.   Try now.\n\nThis all seems to work. The question is, do we remove tags that have 0 occurrences?\n\nAdding some more in the middle.\n\nThis is a text directly inserted after the one above.\n\nAnd another one. this is great\n\nThis one comes in the middle\n\nadding another underneath. this is brilliant!\n\nAnd this one comes after a meta tag\n\nAnd this one gets added at the end because no sibling.\n\nand another at the end.\n\nanother test\n\nadding some text\n\nadding a block in the middle\n\nAnd one more\n\nand another text block\n\n\n\t\t\tThis seems to work too\n\n\n\t\t\titem 1\n\nitem2\n\nitem3\n\nitem 4\n\t\t\toption 3\n\nand a radio 1 in the middle\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t	\N	\N	1	2022-07-05 15:36:47.491717+02	2022-08-19 11:47:57.478147+02	45e18bc3-8805-45e1-8c54-b356bcee4912	\N	t	\N
54	Some text title	[{"type": "section", "items": [{"tags": [{"id": 469, "key": null, "name": "primary data", "type": "datasource"}], "type": "datasources", "level": "meta", "required": false, "has_content": true}, {"txt": "Add a first paragraph to see how it renders in browse page.", "type": "txt", "level": "media", "fontsize": 1, "required": false, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": true}, {"tags": [{"id": 450, "key": null, "name": "Behavioral Insights", "type": "method"}], "type": "methods", "level": "meta", "required": false, "has_content": true}, {"tags": [{"id": 317, "key": 3, "name": "Good health and well-being", "type": "sdg"}, {"id": 318, "key": 4, "name": "Quality education", "type": "sdg"}], "type": "sdgs", "level": "meta", "required": false, "has_content": true}, {"txt": "Adding some text here.", "type": "txt", "level": "media", "fontsize": 1, "required": false, "fontstyle": "normal", "textalign": "left", "fontweight": "normal", "has_content": true}, {"type": "locations", "level": "meta", "required": false, "has_content": true, "centerpoints": [{"lat": 27.931327412293673, "lng": 9.475708007812502}]}], "title": "", "structure": []}]	Some text title\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\tAdd a first paragraph to see how it renders in browse page.\n\nAdding some text here.\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t	\N	\N	0	2022-08-08 15:12:04.364995+02	2022-08-18 15:54:11.72105+02	45e18bc3-8805-45e1-8c54-b356bcee4912	\N	f	\N
7	This is Lorena's pad	[{"lead": "Please tell me some more.", "type": "section", "items": [], "title": "This is my first section", "structure": [{"type": "title", "level": "media", "required": true, "instruction": "You need to add a title to your pad."}]}]	This is Lorena's pad\n\n\n\t\t\tThis is my first section\n\n\n\t\t\tPlease tell me some more.\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t	\N	\N	1	2022-07-19 15:56:46.759154+02	2022-08-08 11:45:14.891388+02	4dfc7162-835f-4e9c-a534-d3b1da1c2505	1	f	\N
6	This is Hanane's pad	[{"lead": "Please tell me some more.", "type": "section", "items": [], "title": "This is my first section", "structure": [{"type": "title", "level": "media", "required": true, "instruction": "You need to add a title to your pad."}]}]	This is Hanane's pad\n\n\n\t\t\tThis is my first section\n\n\n\t\t\tPlease tell me some more.\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t	\N	\N	1	2022-07-19 15:55:41.713091+02	2022-07-19 15:55:47.930883+02	4e4326ea-a11f-490c-9a4e-98e8e845574a	1	f	\N
8		\N	\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t	\N	\N	0	2022-07-20 16:08:09.85096+02	2022-07-20 16:08:09.85096+02	45e18bc3-8805-45e1-8c54-b356bcee4912	\N	f	\N
\.


--
-- Data for Name: pinboard_contributions; Type: TABLE DATA; Schema: public; Owner: myjyby
--

COPY public.pinboard_contributions (id, pad, pinboard) FROM stdin;
1	54	1
2	41	1
6	55	1
10	42	1
11	6	1
12	3	1
77	56	1
17	8	1
23	55	13
24	54	13
26	56	13
87	53	1
89	50	1
90	49	1
91	43	1
92	4	1
93	8	40
38	51	13
45	53	13
46	52	1
50	41	13
\.


--
-- Data for Name: pinboard_contributors; Type: TABLE DATA; Schema: public; Owner: myjyby
--

COPY public.pinboard_contributors (id, participant, pinboard) FROM stdin;
1	45e18bc3-8805-45e1-8c54-b356bcee4912	1
5	45e18bc3-8805-45e1-8c54-b356bcee4912	1
6	45e18bc3-8805-45e1-8c54-b356bcee4912	1
7	45e18bc3-8805-45e1-8c54-b356bcee4912	1
8	45e18bc3-8805-45e1-8c54-b356bcee4912	1
9	45e18bc3-8805-45e1-8c54-b356bcee4912	1
10	45e18bc3-8805-45e1-8c54-b356bcee4912	13
37	45e18bc3-8805-45e1-8c54-b356bcee4912	40
\.


--
-- Data for Name: pinboards; Type: TABLE DATA; Schema: public; Owner: myjyby
--

COPY public.pinboards (id, title, owner, date, mobilization, description, status, display_filters, display_map, display_fullscreen) FROM stdin;
13	Second board	45e18bc3-8805-45e1-8c54-b356bcee4912	2022-08-24 11:52:41.217523+02	\N	\N	1	f	f	f
40	third board	45e18bc3-8805-45e1-8c54-b356bcee4912	2022-08-25 16:27:23.830244+02	\N	\N	0	f	f	f
1	First published board	45e18bc3-8805-45e1-8c54-b356bcee4912	2022-08-16 16:03:44.488949+02	\N	This is the description of my first pinboard.&nbsp;<div>It can keep going for a while.&nbsp;<div>OK&nbsp; This is the third line. go</div></div>	2	t	t	t
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: myjyby
--

COPY public.session (sid, sess, expire) FROM stdin;
B5USivpNrzMxxrKxceSObWvpekcK0L7G	{"cookie":{"originalMaxAge":86400000,"expires":"2022-08-27T09:20:57.970Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"uuid":null,"username":"Anonymous user","collaborators":[],"rights":0,"public":true,"language":"en","country":{"iso3":"NUL","name":"Null Island","lnglat":{"lng":0,"lat":0}}}	2022-08-27 11:45:04
Sr7SnZpYjexSHcJSLL8O72Ba7bGV-ANZ	{"cookie":{"originalMaxAge":86400000,"expires":"2022-08-27T09:57:03.552Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"uuid":"45e18bc3-8805-45e1-8c54-b356bcee4912","username":"sudo","collaborators":[{"uuid":"45e18bc3-8805-45e1-8c54-b356bcee4912","rights":3},{"uuid":"82c0cadd-6848-420a-95ee-4725bb41315f","rights":2},{"uuid":"df639827-9b64-4793-b599-3e778099485e","rights":2},{"uuid":"4c958b0e-d6de-4140-b9ff-c1c1f00ecd0c","rights":3},{"uuid":"aff2b894-9cee-4149-80be-2420390ebcdf","rights":2},{"uuid":"9672f0ef-bdf5-469d-8366-76f224271003","rights":2},{"uuid":"ec6bd5ff-fc1b-4dee-960a-2ae5b303a09c","rights":2},{"uuid":"6fe97398-bae2-4b86-9ac5-899d4f9cbb98","rights":2},{"uuid":"9e109b55-dc3b-4a00-9803-de6a344cefb8","rights":2},{"uuid":"5ec64403-bf6f-4f72-8ca8-55d703e115fa","rights":2},{"uuid":"91c45c17-cd57-4649-b18c-89a35b0022d6","rights":2},{"uuid":"8aa32f57-e844-473b-96a8-8d249a8b0407","rights":2},{"uuid":"bc19ffc0-347c-42b2-b482-0a6a6595f0cd","rights":2},{"uuid":"866370cd-1046-49c4-a630-5b3b4ccb6ded","rights":3},{"uuid":"8dac94f9-d9e8-488d-95d0-f8a7ccbb6d7f","rights":2},{"uuid":"585c91f1-eee6-42a8-bcdd-7cf9a020ff78","rights":2},{"uuid":"6bfcec8a-4dd7-4a13-b9e3-6ad93c70fa70","rights":2}],"rights":3,"public":false,"language":"en","country":{"iso3":"NUL","name":"Null Island","bureau":"HQ","lnglat":{"lng":0,"lat":0}}}	2022-08-27 11:57:10
22izsMBfyIYBbXcBIwoNzrsq0iAiQEpJ	{"cookie":{"originalMaxAge":86400000,"expires":"2022-08-26T18:26:40.646Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"collaborators":[],"rights":0,"public":true,"language":"en","country":{"iso3":"NUL","name":"Null Island","lnglat":{"lng":0,"lat":0}}}	2022-08-26 20:26:54
7wJr1XQw7ZYSToEpqnwQxUw7GpEALb91	{"cookie":{"originalMaxAge":86400000,"expires":"2022-08-26T16:15:16.189Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"collaborators":[],"rights":0,"public":true,"language":"en","country":{"iso3":"NUL","name":"Null Island","lnglat":{"lng":0,"lat":0}}}	2022-08-26 18:16:55
1WjTPFKfWVRp2W3JfANzfHHrsBgHcw-R	{"cookie":{"originalMaxAge":86400000,"expires":"2022-08-26T16:12:01.433Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"uuid":"45e18bc3-8805-45e1-8c54-b356bcee4912","username":"sudo","collaborators":[{"uuid":"45e18bc3-8805-45e1-8c54-b356bcee4912","rights":3},{"uuid":"82c0cadd-6848-420a-95ee-4725bb41315f","rights":2},{"uuid":"df639827-9b64-4793-b599-3e778099485e","rights":2},{"uuid":"4c958b0e-d6de-4140-b9ff-c1c1f00ecd0c","rights":3},{"uuid":"aff2b894-9cee-4149-80be-2420390ebcdf","rights":2},{"uuid":"9672f0ef-bdf5-469d-8366-76f224271003","rights":2},{"uuid":"ec6bd5ff-fc1b-4dee-960a-2ae5b303a09c","rights":2},{"uuid":"6fe97398-bae2-4b86-9ac5-899d4f9cbb98","rights":2},{"uuid":"9e109b55-dc3b-4a00-9803-de6a344cefb8","rights":2},{"uuid":"5ec64403-bf6f-4f72-8ca8-55d703e115fa","rights":2},{"uuid":"91c45c17-cd57-4649-b18c-89a35b0022d6","rights":2},{"uuid":"8aa32f57-e844-473b-96a8-8d249a8b0407","rights":2},{"uuid":"bc19ffc0-347c-42b2-b482-0a6a6595f0cd","rights":2},{"uuid":"866370cd-1046-49c4-a630-5b3b4ccb6ded","rights":3},{"uuid":"8dac94f9-d9e8-488d-95d0-f8a7ccbb6d7f","rights":2},{"uuid":"585c91f1-eee6-42a8-bcdd-7cf9a020ff78","rights":2},{"uuid":"6bfcec8a-4dd7-4a13-b9e3-6ad93c70fa70","rights":2}],"rights":3,"public":false,"language":"en","country":{"iso3":"NUL","name":"Null Island","bureau":"HQ","lnglat":{"lng":0,"lat":0}}}	2022-08-27 11:53:23
ArkjYGj_4iJdo-3KLyrNtkxn7O69c_Sp	{"cookie":{"originalMaxAge":86400000,"expires":"2022-08-26T18:49:44.317Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"collaborators":[],"rights":0,"public":true,"language":"en","country":{"iso3":"NUL","name":"Null Island","lnglat":{"lng":0,"lat":0}}}	2022-08-26 20:49:45
jSYpB_WQmU90NpI0uDu96btWJbxTkih8	{"cookie":{"originalMaxAge":86400000,"expires":"2022-08-26T18:49:59.450Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"collaborators":[],"rights":0,"public":true,"language":"en","country":{"iso3":"NUL","name":"Null Island","lnglat":{"lng":0,"lat":0}}}	2022-08-26 20:50:00
npDNufZqJyRqa0331qgiO_kGR_Tfon5t	{"cookie":{"originalMaxAge":86400000,"expires":"2022-08-27T07:31:34.806Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"uuid":"b55c2599-e975-4da5-af14-a0b6d5789d78","username":"Ramiz Uddin","collaborators":[{"uuid":"b55c2599-e975-4da5-af14-a0b6d5789d78","rights":1},{"uuid":"aa1cd169-94bb-4f80-86be-17e0f3a95517","rights":1},{"uuid":"c0c35e0c-4586-474c-8717-d25340759ce4","rights":1},{"uuid":"8e05e842-76b1-4b1f-9ab0-12e1deb7907b","rights":1}],"rights":1,"public":false,"language":"en","country":{"iso3":"BGD","name":"Bangladesh","bureau":"RBAP","lnglat":{"lng":90.379521,"lat":23.778261}}}	2022-08-27 10:29:56
\.


--
-- Data for Name: spatial_ref_sys; Type: TABLE DATA; Schema: public; Owner: myjyby
--

COPY public.spatial_ref_sys (srid, auth_name, auth_srid, srtext, proj4text) FROM stdin;
\.


--
-- Data for Name: tagging; Type: TABLE DATA; Schema: public; Owner: myjyby
--

COPY public.tagging (id, pad, tag_id, type) FROM stdin;
16	5	4	tag
17	5	16	tag
19	5	317	sdg
20	5	318	sdg
75	5	17	tag
646	52	616	tag
647	50	622	tag
648	53	619	tag
649	53	626	tag
650	51	624	tag
651	49	325	sdg
652	49	622	tag
665	54	469	datasource
667	54	450	method
670	54	318	sdg
709	49	425	method
710	49	440	method
715	49	466	datasource
716	49	487	datasource
719	54	317	sdg
\.


--
-- Data for Name: templates; Type: TABLE DATA; Schema: public; Owner: myjyby
--

COPY public.templates (id, medium, title, description, sections, full_text, language, status, date, update_at, owner, published, source) FROM stdin;
14	\N	Repeat sections	This template is to test the repeat sections	[{"lead": "Some information on what to do", "type": "section", "title": "Header 1", "structure": [{"type": "title", "level": "media", "required": true, "instruction": "Please add a title"}]}, {"lead": "This section should be repeated", "type": "section", "group": 0, "title": "Repeat header", "repeat": true, "structure": [{"type": "txt", "level": "media", "required": true, "instruction": "Add some text"}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "Option 1", "checked": false}, {"id": 1, "name": "Option 2", "checked": false}], "required": true, "instruction": "Check an option"}], "instruction": ""}, {"lead": "This section is for images", "type": "section", "title": "Header 2", "structure": [{"type": "img", "level": "media", "required": false, "instruction": "Please add an image"}, {"type": "img", "level": "media", "required": true, "instruction": "Add more images"}]}]	Repeat sections\n\n\n\t\t\tThis template is to test the repeat sections\n\n\n\t\t\tHeader 1\n\nRepeat header\n\nHeader 2\n\n\n\t\t\tSome information on what to do\n\nThis section should be repeated\n\nThis section is for images\n\n\n\t\t\tPlease add a title\n\n\n\t\t\tAdd some text\n\n\n\t\t\t\n\n\n\t\t\tCheck an option\n\n\n\t\t\tOption 1\n\nOption 2\n\t\t\t\n\n\n\t\t\t\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t	\N	1	2022-08-19 09:59:21.492667+02	2022-08-19 14:58:49.180343+02	45e18bc3-8805-45e1-8c54-b356bcee4912	f	\N
1	\N	This is a first template	This is testing whether everything works well.	[{"lead": "Please tell me some more.", "type": "section", "title": "This is my first section", "structure": [{"type": "title", "level": "media", "required": true, "instruction": "You need to add a title to your pad."}]}]	This is a first template\n\n\n\t\t\tThis is testing whether everything works well.\n\n\n\t\t\tThis is my first section\n\n\n\t\t\tPlease tell me some more.\n\n\n\t\t\tYou need to add a title to your pad.\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t\n\n\n\t\t\t\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t	\N	1	2022-06-24 13:43:02.10553+02	2022-06-24 13:43:32.409659+02	45e18bc3-8805-45e1-8c54-b356bcee4912	f	\N
9	xlsx	Copie de Liste de quelques Innovations Phares Cartographiées dans les 12 departements du Congo V2 	Template generated from the columns in “Copie de Liste de quelques Innovations Phares Cartographiées dans les 12 departements du Congo V2”.	[{"lead": null, "type": "section", "title": null, "structure": [{"type": "title", "level": "media", "required": false, "has_content": false, "instruction": "Innovation"}, {"type": "txt", "level": "media", "required": false, "has_content": false, "instruction": "Objet"}, {"type": "locations", "level": "meta", "required": false, "has_content": false, "instruction": "Département"}, {"type": "img", "level": "media", "required": false, "has_content": false, "instruction": "Photo"}]}]	Copie de Liste de quelques Innovations Phares Cartographiées dans les 12 departements du Congo V2 \n\n\n\t\t\tTemplate generated from the columns in “Copie de Liste de quelques Innovations Phares Cartographiées dans les 12 departements du Congo V2”.\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\tInnovation\n\n\n\t\t\tObjet\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t\n\n\n\t\t\t\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t\n\n\n\t\t\t	\N	1	2022-08-08 10:23:48.267691+02	2022-08-08 10:23:48.267691+02	45e18bc3-8805-45e1-8c54-b356bcee4912	f	\N
10	xlsx	Copie de Liste de quelques Innovations Phares Cartographiées dans les 12 departements du Congo V2 	Template generated from the columns in “Copie de Liste de quelques Innovations Phares Cartographiées dans les 12 departements du Congo V2”.	[{"lead": null, "type": "section", "title": null, "structure": [{"type": "title", "level": "media", "required": false, "has_content": false, "instruction": "Innovation"}, {"type": "txt", "level": "media", "required": false, "has_content": false, "instruction": "Objet"}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "pointe-noire", "checked": false}], "required": false, "has_content": false, "instruction": "Département"}, {"type": "img", "level": "media", "required": false, "has_content": false, "instruction": "Photo"}]}]	Copie de Liste de quelques Innovations Phares Cartographiées dans les 12 departements du Congo V2 \n\n\n\t\t\tTemplate generated from the columns in “Copie de Liste de quelques Innovations Phares Cartographiées dans les 12 departements du Congo V2”.\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\tInnovation\n\n\n\t\t\tObjet\n\n\n\t\t\t\n\n\n\t\t\tDépartement\n\n\n\t\t\tpointe-noire\n\t\t\t\n\n\n\t\t\t\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t\n\n\n\t\t\t	\N	1	2022-08-08 10:27:09.409478+02	2022-08-08 10:27:09.409478+02	45e18bc3-8805-45e1-8c54-b356bcee4912	f	\N
11	xlsx	Copie de Liste de quelques Innovations Phares Cartographiées dans les 12 departements du Congo V2 	Template generated from the columns in “Copie de Liste de quelques Innovations Phares Cartographiées dans les 12 departements du Congo V2”.	[{"lead": null, "type": "section", "title": null, "structure": [{"type": "title", "level": "media", "required": false, "has_content": false, "instruction": "Innovation"}, {"type": "txt", "level": "media", "required": false, "has_content": false, "instruction": "Objet"}, {"type": "locations", "level": "meta", "required": false, "has_content": false, "instruction": "Département"}, {"type": "img", "level": "media", "required": false, "has_content": false, "instruction": "Photo"}]}]	Copie de Liste de quelques Innovations Phares Cartographiées dans les 12 departements du Congo V2 \n\n\n\t\t\tTemplate generated from the columns in “Copie de Liste de quelques Innovations Phares Cartographiées dans les 12 departements du Congo V2”.\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\tInnovation\n\n\n\t\t\tObjet\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t\n\n\n\t\t\t\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t\n\n\n\t\t\t	\N	1	2022-08-08 11:21:15.002664+02	2022-08-08 11:21:15.002664+02	45e18bc3-8805-45e1-8c54-b356bcee4912	f	\N
12	xlsx	ColombianSubSet.xlsx	Template generated from the columns in “ColombianSubSet.xlsx”.	[{"lead": null, "type": "section", "title": null, "structure": [{"type": "title", "level": "media", "required": false, "has_content": false, "instruction": "Nombre de la solución"}, {"type": "txt", "level": "media", "required": false, "has_content": false, "instruction": "Nombre del creador(es)"}, {"type": "txt", "level": "media", "required": false, "has_content": false, "instruction": "Descripción"}, {"type": "img", "level": "media", "required": false, "has_content": false, "instruction": "Adjunta la imagen de tu iniciativa"}, {"type": "locations", "level": "meta", "required": false, "has_content": false, "instruction": "Ubicación"}, {"type": "txt", "level": "media", "required": false, "has_content": false, "instruction": "¿ Que aprendizajes nos deja está solución?"}, {"type": "txt", "level": "media", "required": false, "has_content": false, "instruction": "¿ Cómo puede esta solución ser aplicada a otras comunidades ?"}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "a la venta", "checked": false}], "required": false, "has_content": false, "instruction": "Estado de la Solución"}, {"type": "sdgs", "level": "meta", "required": false, "has_content": false, "instruction": "Selecciona uno o varios Objetivos de Desarrollo Sostenible relacionados con la solución:"}, {"type": "tags", "level": "meta", "required": false, "has_content": false, "instruction": "Tags/Etiquetas"}]}]	ColombianSubSet.xlsx\n\n\n\t\t\tTemplate generated from the columns in “ColombianSubSet.xlsx”.\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\tNombre de la solución\n\n\n\t\t\tNombre del creador(es)\n\nDescripción\n\n¿ Que aprendizajes nos deja está solución?\n\n¿ Cómo puede esta solución ser aplicada a otras comunidades ?\n\n\n\t\t\t\n\n\n\t\t\tEstado de la Solución\n\n\n\t\t\ta la venta\n\t\t\t\n\n\n\t\t\t\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t\n\n\n\t\t\t	\N	1	2022-08-08 11:31:01.276117+02	2022-08-08 11:31:01.276117+02	45e18bc3-8805-45e1-8c54-b356bcee4912	f	\N
13	xlsx	ColombianSubSet.xlsx	Template generated from the columns in “ColombianSubSet.xlsx”.	[{"lead": "", "type": "section", "title": "", "structure": [{"type": "title", "level": "media", "required": false, "instruction": "Nombre de la solución"}, {"type": "txt", "level": "media", "required": false, "instruction": "Nombre del creador(es)"}, {"type": "txt", "level": "media", "required": false, "instruction": "Descripción"}, {"type": "img", "level": "media", "required": false, "instruction": "Adjunta la imagen de tu iniciativa"}, {"type": "txt", "level": "media", "required": false, "instruction": "¿ Que aprendizajes nos deja está solución?"}, {"type": "txt", "level": "media", "required": false, "instruction": "¿ Cómo puede esta solución ser aplicada a otras comunidades ?"}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "a la venta", "checked": false}], "required": false, "instruction": "Estado de la Solución"}, {"type": "tags", "level": "meta", "required": false, "instruction": "Tags/Etiquetas"}, {"type": "datasources", "level": "meta", "required": true, "instruction": "Add a datasource"}, {"type": "methods", "level": "meta", "required": true, "instruction": "Add a methodology"}, {"type": "locations", "level": "meta", "required": true, "instruction": "This should work"}]}]	ColombianSubSet.xlsx\n\n\n\t\t\tTemplate generated from the columns in “ColombianSubSet.xlsx”.\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\tNombre de la solución\n\n\n\t\t\tNombre del creador(es)\n\nDescripción\n\n¿ Que aprendizajes nos deja está solución?\n\n¿ Cómo puede esta solución ser aplicada a otras comunidades ?\n\n\n\t\t\t\n\n\n\t\t\tEstado de la Solución\n\n\n\t\t\ta la venta\n\t\t\t\n\n\n\t\t\t\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t	\N	1	2022-08-08 11:34:47.170953+02	2022-08-18 19:55:25.91748+02	45e18bc3-8805-45e1-8c54-b356bcee4912	f	\N
8	xlsx	ColombianSubSet.xlsx	Template generated from the columns in “ColombianSubSet.xlsx”.	[{"lead": "", "type": "section", "title": "", "structure": [{"type": "title", "level": "media", "required": false, "instruction": "Nombre de la solución"}, {"type": "txt", "level": "media", "required": false, "instruction": "Nombre del creador(es)"}, {"type": "txt", "level": "media", "required": false, "instruction": "Descripción"}, {"type": "img", "level": "media", "required": false, "instruction": "Adjunta la imagen de tu iniciativa"}, {"type": "locations", "level": "meta", "required": false, "instruction": "Ubicación"}, {"type": "txt", "level": "media", "required": false, "instruction": "¿ Que aprendizajes nos deja está solución?"}, {"type": "txt", "level": "media", "required": false, "instruction": "¿ Cómo puede esta solución ser aplicada a otras comunidades ?"}, {"type": "checklist", "level": "media", "options": [{"id": 0, "name": "a la venta", "checked": false}], "required": false, "instruction": "Estado de la Solución"}, {"type": "sdgs", "level": "meta", "required": false, "constraint": 17, "instruction": "Selecciona uno o varios Objetivos de Desarrollo Sostenible relacionados con la solución:"}, {"type": "tags", "level": "meta", "required": false, "instruction": "Tags/Etiquetas"}]}]	ColombianSubSet.xlsx\n\n\n\t\t\tTemplate generated from the columns in “ColombianSubSet.xlsx”.\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\tNombre de la solución\n\n\n\t\t\tNombre del creador(es)\n\nDescripción\n\n¿ Que aprendizajes nos deja está solución?\n\n¿ Cómo puede esta solución ser aplicada a otras comunidades ?\n\n\n\t\t\t\n\n\n\t\t\tEstado de la Solución\n\n\n\t\t\ta la venta\n\t\t\t\n\n\n\t\t\t\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t	\N	1	2022-08-05 10:54:30.038035+02	2022-08-19 09:45:29.742188+02	45e18bc3-8805-45e1-8c54-b356bcee4912	f	\N
15	\N	Title		[{"lead": "", "type": "section", "title": "", "structure": [{"type": "title", "level": "media", "required": true, "instruction": "Add a title"}, {"type": "txt", "level": "media", "required": true, "instruction": "Add some text"}]}]	Title\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\tAdd a title\n\n\n\t\t\tAdd some text\n\n\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t\n\n\n\t\t\t\n\t\t\t\n\n\n\t\t\t\n\n\n\t\t\t\n\t\t\t	\N	1	2022-08-19 14:46:50.093156+02	2022-08-19 14:57:51.078199+02	45e18bc3-8805-45e1-8c54-b356bcee4912	f	\N
\.


--
-- Name: cohorts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myjyby
--

SELECT pg_catalog.setval('public.cohorts_id_seq', 1, false);


--
-- Name: engagement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myjyby
--

SELECT pg_catalog.setval('public.engagement_id_seq', 1, false);


--
-- Name: files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myjyby
--

SELECT pg_catalog.setval('public.files_id_seq', 1, false);


--
-- Name: locations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myjyby
--

SELECT pg_catalog.setval('public.locations_id_seq', 106, true);


--
-- Name: mobilization_contributions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myjyby
--

SELECT pg_catalog.setval('public.mobilization_contributions_id_seq', 17, true);


--
-- Name: mobilization_contributors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myjyby
--

SELECT pg_catalog.setval('public.mobilization_contributors_id_seq', 30, true);


--
-- Name: mobilizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myjyby
--

SELECT pg_catalog.setval('public.mobilizations_id_seq', 7, true);


--
-- Name: pads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myjyby
--

SELECT pg_catalog.setval('public.pads_id_seq', 58, true);


--
-- Name: pinboard_contributions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myjyby
--

SELECT pg_catalog.setval('public.pinboard_contributions_id_seq', 93, true);


--
-- Name: pinboard_contributors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myjyby
--

SELECT pg_catalog.setval('public.pinboard_contributors_id_seq', 37, true);


--
-- Name: pinboards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myjyby
--

SELECT pg_catalog.setval('public.pinboards_id_seq', 40, true);


--
-- Name: tagging_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myjyby
--

SELECT pg_catalog.setval('public.tagging_id_seq', 901, true);


--
-- Name: templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myjyby
--

SELECT pg_catalog.setval('public.templates_id_seq', 15, true);


--
-- Name: cohorts cohorts_pkey; Type: CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.cohorts
    ADD CONSTRAINT cohorts_pkey PRIMARY KEY (id);


--
-- Name: engagement engagement_pkey; Type: CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.engagement
    ADD CONSTRAINT engagement_pkey PRIMARY KEY (id);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: mobilization_contributions mobilization_contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.mobilization_contributions
    ADD CONSTRAINT mobilization_contributions_pkey PRIMARY KEY (id);


--
-- Name: mobilization_contributors mobilization_contributors_pkey; Type: CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.mobilization_contributors
    ADD CONSTRAINT mobilization_contributors_pkey PRIMARY KEY (id);


--
-- Name: mobilizations mobilizations_pkey; Type: CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.mobilizations
    ADD CONSTRAINT mobilizations_pkey PRIMARY KEY (id);


--
-- Name: pads pads_pkey; Type: CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.pads
    ADD CONSTRAINT pads_pkey PRIMARY KEY (id);


--
-- Name: pinboard_contributions pinboard_contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.pinboard_contributions
    ADD CONSTRAINT pinboard_contributions_pkey PRIMARY KEY (id);


--
-- Name: pinboard_contributors pinboard_contributors_pkey; Type: CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.pinboard_contributors
    ADD CONSTRAINT pinboard_contributors_pkey PRIMARY KEY (id);


--
-- Name: pinboards pinboards_pkey; Type: CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.pinboards
    ADD CONSTRAINT pinboards_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: tagging tagging_pkey; Type: CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.tagging
    ADD CONSTRAINT tagging_pkey PRIMARY KEY (id);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: engagement unique_engagement; Type: CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.engagement
    ADD CONSTRAINT unique_engagement UNIQUE ("user", doctype, type);


--
-- Name: locations unique_pad_lnglat; Type: CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT unique_pad_lnglat UNIQUE (pad, lng, lat);


--
-- Name: tagging unique_pad_tag_type; Type: CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.tagging
    ADD CONSTRAINT unique_pad_tag_type UNIQUE (pad, tag_id, type);


--
-- Name: pinboards unique_pinboard_owner; Type: CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.pinboards
    ADD CONSTRAINT unique_pinboard_owner UNIQUE (title, owner);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: myjyby
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: files files_source_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_source_fkey FOREIGN KEY (source) REFERENCES public.pads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: locations locations_pad_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pad_fkey FOREIGN KEY (pad) REFERENCES public.pads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mobilization_contributions mobilization_contributions_mobilization_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.mobilization_contributions
    ADD CONSTRAINT mobilization_contributions_mobilization_fkey FOREIGN KEY (mobilization) REFERENCES public.mobilizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mobilization_contributions mobilization_contributions_pad_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.mobilization_contributions
    ADD CONSTRAINT mobilization_contributions_pad_fkey FOREIGN KEY (pad) REFERENCES public.pads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mobilization_contributors mobilization_contributors_mobilization_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.mobilization_contributors
    ADD CONSTRAINT mobilization_contributors_mobilization_fkey FOREIGN KEY (mobilization) REFERENCES public.mobilizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mobilizations mobilizations_source_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.mobilizations
    ADD CONSTRAINT mobilizations_source_fkey FOREIGN KEY (source) REFERENCES public.mobilizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mobilizations mobilizations_template_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.mobilizations
    ADD CONSTRAINT mobilizations_template_fkey FOREIGN KEY (template) REFERENCES public.templates(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pads pads_source_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.pads
    ADD CONSTRAINT pads_source_fkey FOREIGN KEY (source) REFERENCES public.pads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pads pads_template_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.pads
    ADD CONSTRAINT pads_template_fkey FOREIGN KEY (template) REFERENCES public.templates(id);


--
-- Name: pinboard_contributions pinboard_contributions_pad_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.pinboard_contributions
    ADD CONSTRAINT pinboard_contributions_pad_fkey FOREIGN KEY (pad) REFERENCES public.pads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pinboard_contributions pinboard_contributions_pinboard_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.pinboard_contributions
    ADD CONSTRAINT pinboard_contributions_pinboard_fkey FOREIGN KEY (pinboard) REFERENCES public.pinboards(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pinboard_contributors pinboard_contributors_pinboard_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.pinboard_contributors
    ADD CONSTRAINT pinboard_contributors_pinboard_fkey FOREIGN KEY (pinboard) REFERENCES public.pinboards(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pinboards pinboards_mobilization_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.pinboards
    ADD CONSTRAINT pinboards_mobilization_fkey FOREIGN KEY (mobilization) REFERENCES public.mobilizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tagging tagging_pad_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.tagging
    ADD CONSTRAINT tagging_pad_fkey FOREIGN KEY (pad) REFERENCES public.pads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: templates templates_source_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myjyby
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_source_fkey FOREIGN KEY (source) REFERENCES public.templates(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

