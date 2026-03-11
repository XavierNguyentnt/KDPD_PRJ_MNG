--
-- PostgreSQL database dump
--

\restrict TM8i5zxFQa2ulkrs3saPYvznfOFsw4HGbf3oMfkeWWi1VF8bsgYfvJzppwqRVar

-- Dumped from database version 17.8 (6108b59)
-- Dumped by pg_dump version 17.7

-- Started on 2026-03-11 10:28:46

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
-- TOC entry 3 (class 3079 OID 90197)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 3773 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';
  RETURN NEW;
END;
$$;

SET default_tablespace = '';

SET default_table_access_method = heap;


-- Completed on 2026-03-11 10:28:53

--
-- PostgreSQL database dump complete
--

\unrestrict TM8i5zxFQa2ulkrs3saPYvznfOFsw4HGbf3oMfkeWWi1VF8bsgYfvJzppwqRVar

