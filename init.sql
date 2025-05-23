CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS hstore;
CREATE EXTENSION IF NOT EXISTS dblink;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS ltree;

-- CREATE TABLE contributors (
-- 	id SERIAL PRIMARY KEY UNIQUE NOT NULL,
-- 	name VARCHAR(99),
-- 	position VARCHAR(99),
-- 	country VARCHAR(99),
-- 	email VARCHAR(99) UNIQUE,
-- 	password VARCHAR(99) NOT NULL,
-- 	uuid uuid UNIQUE DEFAULT uuid_generate_v4(),
-- 	rights SMALLINT DEFAULT 0,
-- 	lang VARCHAR(9) DEFAULT 'en'
-- );
-- CREATE TABLE centerpoints (
-- 	id SERIAL PRIMARY KEY UNIQUE NOT NULL,
-- 	country VARCHAR(99),
-- 	lat DOUBLE PRECISION,
-- 	lng DOUBLE PRECISION
-- );
CREATE TABLE templates (
    id SERIAL PRIMARY KEY UNIQUE NOT NULL,
    medium VARCHAR(9),
    title VARCHAR(99),
    description TEXT,
    sections JSONB,
    full_text TEXT,
    language VARCHAR(9),
    status INT DEFAULT 0,
    "date" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "update_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- contributor INT REFERENCES contributors(id) ON UPDATE CASCADE ON DELETE CASCADE,
    owner uuid,
    -- published BOOLEAN DEFAULT FALSE,
    source INT REFERENCES templates(id) ON UPDATE CASCADE ON DELETE CASCADE,
    slideshow BOOLEAN DEFAULT FALSE,
    imported BOOLEAN DEFAULT FALSE,
    version ltree
);
CREATE INDEX version_idx ON templates USING GIST (version);

CREATE TABLE pads (
    id SERIAL PRIMARY KEY UNIQUE NOT NULL,
    title VARCHAR(99),
    sections JSONB,
    full_text TEXT,
    -- location JSONB,
    -- sdgs JSONB,
    -- tags JSONB,
    -- impact SMALLINT,
    -- personas JSONB,
    status INT DEFAULT 0,
    "date" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "update_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- contributor INT REFERENCES contributors(id) ON UPDATE CASCADE ON DELETE CASCADE,
    owner uuid,
    template INT REFERENCES templates(id) DEFAULT NULL,
    -- published BOOLEAN DEFAULT FALSE,
    source INT REFERENCES pads(id) ON UPDATE CASCADE ON DELETE CASCADE,
    version ltree
    -- review_status INT DEFAULT 0
);
CREATE INDEX version_idx ON pads USING GIST (version);

CREATE TABLE files (
    id SERIAL PRIMARY KEY UNIQUE NOT NULL,
    name VARCHAR(99),
    path TEXT,
    vignette TEXT,
    full_text TEXT,
    -- location JSONB,
    sdgs JSONB,
    tags JSONB,
    status INT DEFAULT 1,
    "date" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "update_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- contributor INT REFERENCES contributors(id) ON UPDATE CASCADE ON DELETE CASCADE,
    owner uuid,
    published BOOLEAN DEFAULT FALSE,
    source INT REFERENCES pads(id) ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE TABLE locations (
    id SERIAL PRIMARY KEY UNIQUE NOT NULL,
    pad INT REFERENCES pads(id) ON UPDATE CASCADE ON DELETE CASCADE,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    iso3 VARCHAR(3)
);
ALTER TABLE locations ADD CONSTRAINT unique_pad_lnglat UNIQUE (pad, lng, lat);
-- CREATE TABLE skills (
-- 	id SERIAL PRIMARY KEY UNIQUE NOT NULL,
-- 	category VARCHAR(99),
-- 	name VARCHAR(99),
-- 	label VARCHAR(99),
--	language VARCHAR(9) DEFAULT 'en'
-- );
-- CREATE TABLE methods (
-- 	id SERIAL PRIMARY KEY UNIQUE NOT NULL,
-- 	name VARCHAR(99),
-- 	label VARCHAR(99),
--	language VARCHAR(9) DEFAULT 'en'
-- );
-- CREATE TABLE datasources (
-- 	id SERIAL PRIMARY KEY UNIQUE NOT NULL,
-- 	name CITEXT UNIQUE,
-- 	description VARCHAR(99),
-- 	contributor INT,
--	language VARCHAR(9) DEFAULT 'en'
-- );
-- CREATE TABLE tags (
-- 	id SERIAL PRIMARY KEY UNIQUE NOT NULL,
--	key INT,
-- 	name CITEXT,
-- 	description TEXT,
-- 	contributor uuid,
--	type VARCHAR(19)
--	language VARCHAR(9) DEFAULT 'en'
-- );
--	ALTER TABLE tags ADD CONSTRAINT name_type UNIQUE (name, type);
CREATE TABLE cohorts (
    id SERIAL PRIMARY KEY UNIQUE NOT NULL,
    -- source INT REFERENCES contributors(id) ON UPDATE CASCADE ON DELETE CASCADE,
    -- target INT REFERENCES contributors(id) ON UPDATE CASCADE ON DELETE CASCADE
    host uuid,
    contributor uuid
);
ALTER TABLE cohorts ADD CONSTRAINT unique_host_contributor UNIQUE (host, contributor);

CREATE TABLE mobilizations (
    id SERIAL PRIMARY KEY UNIQUE NOT NULL,
    title VARCHAR(99),
    -- host INT REFERENCES contributors(id) ON UPDATE CASCADE ON DELETE CASCADE,
    owner uuid,
    template INT REFERENCES templates(id) ON UPDATE CASCADE ON DELETE CASCADE,
    status INT DEFAULT 1,
    public BOOLEAN DEFAULT FALSE,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    source INT REFERENCES mobilizations(id) ON UPDATE CASCADE ON DELETE CASCADE,
    copy BOOLEAN DEFAULT FALSE,
    child BOOLEAN DEFAULT FALSE,
    pad_limit INT DEFAULT 1,
    description TEXT,
    language VARCHAR(9),
    old_collection INT,
    collection INT,
    version ltree
);
ALTER TABLE mobilizations ALTER pad_limit SET DEFAULT 0;
CREATE INDEX version_idx ON mobilizations USING GIST (version);

CREATE TABLE mobilization_contributors (
    id SERIAL PRIMARY KEY UNIQUE NOT NULL,
    -- contributor INT REFERENCES contributors(id) ON UPDATE CASCADE ON DELETE CASCADE,
    participant uuid,
    mobilization INT REFERENCES mobilizations(id) ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE TABLE mobilization_contributions (
    id SERIAL PRIMARY KEY UNIQUE NOT NULL,
    pad INT REFERENCES pads(id) ON UPDATE CASCADE ON DELETE CASCADE,
    mobilization INT REFERENCES mobilizations(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE extern_db (
    id SERIAL PRIMARY KEY UNIQUE NOT NULL,
    db VARCHAR(20) UNIQUE NOT NULL,
    url_prefix TEXT NOT NULL
);
INSERT INTO extern_db (db, url_prefix) VALUES ('ap', 'https://learningplans.sdg-innovation-commons.org/');
INSERT INTO extern_db (db, url_prefix) VALUES ('exp', 'https://experiments.sdg-innovation-commons.org/');
INSERT INTO extern_db (db, url_prefix) VALUES ('global', 'https://www.sdg-innovation-commons.org/');
INSERT INTO extern_db (db, url_prefix) VALUES ('sm', 'https://solutions.sdg-innovation-commons.org/');
INSERT INTO extern_db (db, url_prefix) VALUES ('blogs', 'https://blogs.sdg-innovation-commons.org/');
INSERT INTO extern_db (db, url_prefix) VALUES ('consent', 'https://consent.sdg-innovation-commons.org/');
INSERT INTO extern_db (db, url_prefix) VALUES ('login', 'https://login.sdg-innovation-commons.org/');
INSERT INTO extern_db (db, url_prefix) VALUES ('codification', 'https://practice.sdg-innovation-commons.org/');

CREATE TABLE pinboards (
    id SERIAL PRIMARY KEY UNIQUE NOT NULL,
    old_id INT,
    old_db INT REFERENCES extern_db(id) ON UPDATE CASCADE ON DELETE CASCADE,
    title VARCHAR(99),
    description TEXT,
    -- host INT REFERENCES contributors(id) ON UPDATE CASCADE ON DELETE CASCADE,
    owner uuid,
    -- public BOOLEAN DEFAULT FALSE,
    status INT DEFAULT 0,
    display_filters BOOLEAN DEFAULT FALSE,
    display_map BOOLEAN DEFAULT FALSE,
    display_fullscreen BOOLEAN DEFAULT FALSE,
    slideshow BOOLEAN DEFAULT FALSE,
    "date" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mobilization_db INT REFERENCES extern_db(id) ON UPDATE CASCADE ON DELETE CASCADE,
    mobilization INT  -- THIS IS TO CONNECT A PINBOARD DIRECTLY TO A MOBILIZATION
);
-- for migrating
ALTER TABLE pinboards ADD CONSTRAINT unique_pinboard_owner UNIQUE (title, owner, old_db);
ALTER TABLE pinboards DROP CONSTRAINT IF EXISTS unique_pinboard_owner;
ALTER TABLE pinboards ADD CONSTRAINT unique_pinboard_owner UNIQUE (title, owner);

CREATE TABLE pinboard_contributors (
    participant uuid NOT NULL,
    pinboard INT REFERENCES pinboards(id) ON UPDATE CASCADE ON DELETE CASCADE,
    PRIMARY KEY (participant, pinboard)
);

CREATE TABLE pinboard_sections (
    id SERIAL PRIMARY KEY UNIQUE NOT NULL,
    pinboard INT REFERENCES pinboards(id) ON UPDATE CASCADE ON DELETE CASCADE,
    title VARCHAR(99),
    description TEXT
);

CREATE TABLE pinboard_contributions (
    pad INT NOT NULL,
    db INT REFERENCES extern_db(id) ON UPDATE CASCADE ON DELETE CASCADE,
    pinboard INT REFERENCES pinboards(id) ON UPDATE CASCADE ON DELETE CASCADE,
    PRIMARY KEY (pad, db, pinboard)
);
-- for adding sections
ALTER TABLE pinboard_contributions ADD COLUMN section INT REFERENCES pinboard_sections(id) ON UPDATE CASCADE;

CREATE TABLE tagging (
    id SERIAL PRIMARY KEY UNIQUE NOT NULL,
    pad INT REFERENCES pads(id) ON UPDATE CASCADE ON DELETE CASCADE,
    tag_id INT NOT NULL,
    -- tag_name TEXT NOT NULL,
    type VARCHAR(19)
);
ALTER TABLE tagging ADD CONSTRAINT unique_pad_tag_type UNIQUE (pad, tag_id, type);

CREATE TABLE metafields (
    id SERIAL PRIMARY KEY UNIQUE NOT NULL,
    pad INT REFERENCES pads(id) ON UPDATE CASCADE ON DELETE CASCADE,
    type VARCHAR(19),
    name CITEXT,
    key INT,
    value TEXT,
    CONSTRAINT pad_value_type UNIQUE (pad, value, type)
);

-- TO DO
-- CREATE TABLE engagement_pads (
CREATE TABLE engagement (
    id SERIAL PRIMARY KEY UNIQUE NOT NULL,
    -- contributor INT REFERENCES contributors(id) ON UPDATE CASCADE ON DELETE CASCADE,
    contributor uuid,
    -- pad INT REFERENCES pads(id) ON UPDATE CASCADE ON DELETE CASCADE,
    doctype VARCHAR(19),
    docid INT,
    type VARCHAR(19),
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- message TEXT,
    CONSTRAINT unique_engagement UNIQUE (contributor, doctype, docid, type)
);
CREATE TABLE comments (
    id SERIAL PRIMARY KEY UNIQUE NOT NULL,
    contributor uuid,
    doctype VARCHAR(19),
    docid INT,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    message TEXT,
    source INT REFERENCES comments(id) ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE TABLE review_templates (
    id SERIAL PRIMARY KEY UNIQUE NOT NULL,
    template INT REFERENCES templates(id) NOT NULL,
    language VARCHAR(9) UNIQUE
);
-- CREATE TABLE review_pads (
-- 	id SERIAL PRIMARY KEY UNIQUE NOT NULL,
-- 	pad INT REFERENCES pad(id) NOT NULL,
-- );
CREATE TABLE review_requests (
    id SERIAL PRIMARY KEY UNIQUE NOT NULL,
    pad INT UNIQUE REFERENCES pads(id) NOT NULL,
    language VARCHAR(9),
    status INT DEFAULT 0,
    "date" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE reviewer_pool (
    id SERIAL PRIMARY KEY UNIQUE NOT NULL,
    reviewer uuid,
    request INT REFERENCES review_requests(id) ON UPDATE CASCADE ON DELETE CASCADE,
    rank INT DEFAULT 0,
    status INT DEFAULT 0,
    invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_reviewer_pad UNIQUE (reviewer, request)
);
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY UNIQUE NOT NULL,
    pad INT REFERENCES pads(id) ON UPDATE CASCADE ON DELETE CASCADE,
    review INT REFERENCES pads(id) ON UPDATE CASCADE ON DELETE CASCADE,
    reviewer uuid,
    status INT DEFAULT 0,
    request INT
    -- CONSTRAINT unique_reviewer UNIQUE (pad, reviewer)
);

CREATE TABLE "session" (
     "sid" varchar NOT NULL COLLATE "default",
    "sess" json NOT NULL,
    "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);
ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX "IDX_session_expire" ON "session" ("expire");

-- exploration tables
CREATE TABLE IF NOT EXISTS public.exploration
(
    id SERIAL UNIQUE NOT NULL,
    uuid uuid NOT NULL,
    prompt text COLLATE pg_catalog."default" NOT NULL,
    last_access timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL,
    linked_pinboard INT UNIQUE NOT NULL REFERENCES pinboards(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT exploration_pkey PRIMARY KEY (id, uuid, prompt),
    CONSTRAINT id_key UNIQUE (id),
    CONSTRAINT uuid_prompt_key UNIQUE (uuid, prompt)
);
ALTER TABLE IF EXISTS public.users
    ADD COLUMN confirmed_feature_exploration timestamp with time zone;
ALTER TABLE IF EXISTS public.pinboard_contributions
    ADD COLUMN is_included boolean NOT NULL DEFAULT true;

-- viewer stat table
CREATE TABLE IF NOT EXISTS public.page_stats
(
    doc_id INT,  -- 0 as null
    doc_type VARCHAR(19),  -- empty string as null
    db INT REFERENCES extern_db(id) ON UPDATE CASCADE ON DELETE CASCADE,
    page_url text COLLATE pg_catalog."default",  -- empty string as null
    viewer_country VARCHAR(3),  -- empty string as null
    viewer_rights SMALLINT,  -- -1 as null
    view_count INT DEFAULT 0,
    read_count INT DEFAULT 0,
    CONSTRAINT page_stats_pkey PRIMARY KEY (doc_id, doc_type, db, page_url, viewer_country, viewer_rights)
);

-- User trusted device table
CREATE TABLE public.trusted_devices (
  id SERIAL PRIMARY KEY,
  user_uuid UUID NOT NULL,
  device_name VARCHAR(255),
  device_type VARCHAR(255),
  device_os VARCHAR(255) NOT NULL,
  device_browser VARCHAR(255) NOT NULL,
  last_login TIMESTAMP with time zone NOT NULL,
  is_trusted BOOLEAN NOT NULL DEFAULT true,
  session_sid VARCHAR(255) REFERENCES session(sid) ON UPDATE CASCADE ON DELETE CASCADE,
  duuid1 UUID NOT NULL,
  duuid2 UUID NOT NULL,
  duuid3 UUID NOT NULL,
  created_at TIMESTAMP with time zone DEFAULT NOW()
);


CREATE TABLE public.device_confirmation_code (
  id SERIAL PRIMARY KEY,
  user_uuid UUID NOT NULL,
  code INTEGER NOT NULL,
  expiration_time TIMESTAMP with time zone NOT NULL
);

ALTER TABLE users
ADD COLUMN created_from_sso BOOLEAN DEFAULT FALSE,
ADD CONSTRAINT unique_email UNIQUE (email);

ALTER TABLE trusted_devices
ADD CONSTRAINT unique_user_device UNIQUE (user_uuid, device_os, device_browser, session_sid, duuid1, duuid2, duuid3);


-- Add created_at column and set its value for existing users
ALTER TABLE public.users
ADD COLUMN created_at timestamp with time zone;

-- Update created_at column with invited_at value for existing users
UPDATE public.users
SET created_at = invited_at;

-- Set default value for created_at column for new users
ALTER TABLE public.users
ALTER COLUMN created_at SET DEFAULT now();

-- Add last_login column
ALTER TABLE public.users
ADD COLUMN last_login timestamp with time zone;

-- Create a Function to Update update_at
CREATE OR REPLACE FUNCTION update_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
    NEW.update_at = NOW();
    RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

-- Create a Trigger to Call the Function
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON pads
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Create a table to store maps generated via API calls
CREATE TABLE IF NOT EXISTS public.generated_maps (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255),
    query_string TEXT
);