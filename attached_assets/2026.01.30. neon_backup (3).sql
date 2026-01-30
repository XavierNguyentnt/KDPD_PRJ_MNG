--
-- PostgreSQL database dump
--

\restrict CuXedRbOPh91p359ATL80x9aeH4HSyMf2xwRU4RYbEwHvkcn76Xv4pxb1jjxo3g

-- Dumped from database version 17.7 (bdd1736)
-- Dumped by pg_dump version 17.7

-- Started on 2026-01-30 17:47:37

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 7 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- TOC entry 3671 (class 0 OID 0)
-- Dependencies: 7
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 255 (class 1255 OID 24657)
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 246 (class 1259 OID 65591)
-- Name: components; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.components OWNER TO neondb_owner;

--
-- TOC entry 3672 (class 0 OID 0)
-- Dependencies: 246
-- Name: TABLE components; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.components IS 'Hợp phần dịch thuật: dùng để phân loại tác phẩm và hợp đồng (VD: Phật tạng toàn dịch, Phật điển, Nho tạng).';


--
-- TOC entry 236 (class 1259 OID 57375)
-- Name: contract_members; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.contract_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.contract_members OWNER TO neondb_owner;

--
-- TOC entry 3673 (class 0 OID 0)
-- Dependencies: 236
-- Name: TABLE contract_members; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.contract_members IS 'Bảng trung gian contracts-users: ai phụ trách / tham gia hợp đồng.';


--
-- TOC entry 3674 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN contract_members.role; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.contract_members.role IS 'Ví dụ: phụ_trách_chính, tham_gia.';


--
-- TOC entry 247 (class 1259 OID 65605)
-- Name: contract_stages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.contract_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    translation_contract_id uuid,
    proofreading_contract_id uuid,
    stage_code text NOT NULL,
    stage_order integer DEFAULT 1 NOT NULL,
    start_date date,
    end_date date,
    actual_completion_date date,
    note text,
    CONSTRAINT contract_stages_one_contract_check CHECK ((((translation_contract_id IS NOT NULL) AND (proofreading_contract_id IS NULL)) OR ((translation_contract_id IS NULL) AND (proofreading_contract_id IS NOT NULL))))
);


ALTER TABLE public.contract_stages OWNER TO neondb_owner;

--
-- TOC entry 3675 (class 0 OID 0)
-- Dependencies: 247
-- Name: TABLE contract_stages; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.contract_stages IS 'Giai đoạn hợp đồng: mỗi hợp đồng (dịch thuật hoặc hiệu đính) có thể có nhiều giai đoạn (GĐ 1, GĐ 2, ...).';


--
-- TOC entry 231 (class 1259 OID 49166)
-- Name: contracts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text,
    type text,
    name text,
    party_a text,
    party_b text,
    signed_at date,
    value numeric(15,2),
    status text,
    contract_scope text,
    description text,
    start_date date,
    end_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.contracts OWNER TO neondb_owner;

--
-- TOC entry 3676 (class 0 OID 0)
-- Dependencies: 231
-- Name: TABLE contracts; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.contracts IS 'Hợp đồng (Dịch thuật, Hiệu đính); type: dich_thuat | hieu_dinh.';


--
-- TOC entry 238 (class 1259 OID 57427)
-- Name: document_contracts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.document_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    contract_id uuid NOT NULL,
    role text,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.document_contracts OWNER TO neondb_owner;

--
-- TOC entry 3677 (class 0 OID 0)
-- Dependencies: 238
-- Name: TABLE document_contracts; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.document_contracts IS 'Bảng trung gian documents-contracts: 1 tài liệu gắn nhiều hợp đồng.';


--
-- TOC entry 3678 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN document_contracts.role; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.document_contracts.role IS 'Vai trò của tài liệu với hợp đồng (vd: phụ lục, biên bản).';


--
-- TOC entry 3679 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN document_contracts.note; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.document_contracts.note IS 'Ghi chú cho liên kết này.';


--
-- TOC entry 237 (class 1259 OID 57402)
-- Name: document_tasks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.document_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    task_id text NOT NULL,
    role text,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.document_tasks OWNER TO neondb_owner;

--
-- TOC entry 3680 (class 0 OID 0)
-- Dependencies: 237
-- Name: TABLE document_tasks; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.document_tasks IS 'Bảng trung gian documents-tasks: 1 tài liệu gắn nhiều tasks.';


--
-- TOC entry 3681 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN document_tasks.role; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.document_tasks.role IS 'Vai trò của tài liệu với task (vd: bản thảo, biên bản).';


--
-- TOC entry 3682 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN document_tasks.note; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.document_tasks.note IS 'Ghi chú cho liên kết này.';


--
-- TOC entry 233 (class 1259 OID 49196)
-- Name: documents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    document_type text,
    file_path text,
    storage_key text,
    contract_id uuid,
    task_id text,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.documents OWNER TO neondb_owner;

--
-- TOC entry 3683 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE documents; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.documents IS 'Hồ sơ giấy tờ (file/dossier); gắn contract_id hoặc task_id hoặc đứng riêng.';


--
-- TOC entry 3684 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN documents.document_type; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.documents.document_type IS 'scan, bản thảo, biên bản, ...';


--
-- TOC entry 239 (class 1259 OID 57456)
-- Name: groups; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.groups OWNER TO neondb_owner;

--
-- TOC entry 3685 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE groups; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.groups IS 'Nhóm công việc / nhóm nhân sự. 1 nhân sự có thể thuộc nhiều nhóm (user_groups).';


--
-- TOC entry 3686 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN groups.code; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.groups.code IS 'Mã ổn định: bien_tap, thu_ky_hop_phan, cv_chung, thiet_ke_cntt, quet_trung_lap.';


--
-- TOC entry 245 (class 1259 OID 65562)
-- Name: proofreading_contracts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.proofreading_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_number text,
    work_id uuid,
    translation_contract_id uuid,
    proofreader_name text,
    page_count integer,
    rate_ratio numeric,
    contract_value numeric,
    start_date date,
    end_date date,
    actual_completion_date date,
    note text,
    component_id uuid
);


ALTER TABLE public.proofreading_contracts OWNER TO neondb_owner;

--
-- TOC entry 3687 (class 0 OID 0)
-- Dependencies: 245
-- Name: TABLE proofreading_contracts; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.proofreading_contracts IS 'Hợp đồng hiệu đính (theo dõi hợp đồng hiệu đính).';


--
-- TOC entry 3688 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN proofreading_contracts.component_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.proofreading_contracts.component_id IS 'Hợp phần (phân loại hợp đồng); có thể suy từ work_id hoặc set trực tiếp.';


--
-- TOC entry 241 (class 1259 OID 57493)
-- Name: roles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.roles OWNER TO neondb_owner;

--
-- TOC entry 3689 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.roles IS 'Vai trò phân quyền. 1 nhân sự có thể có nhiều vai trò (user_roles). Dùng cho quyền xem/sửa task.';


--
-- TOC entry 3690 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN roles.code; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.roles.code IS 'Mã ổn định: admin, manager, employee (hoặc chi tiết: task_view, task_edit, task_approve, ...).';


--
-- TOC entry 234 (class 1259 OID 49238)
-- Name: session; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO neondb_owner;

--
-- TOC entry 235 (class 1259 OID 57344)
-- Name: task_assignments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.task_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id text NOT NULL,
    user_id uuid NOT NULL,
    stage_type text NOT NULL,
    round_number integer DEFAULT 1 NOT NULL,
    received_at date,
    due_date date,
    completed_at timestamp with time zone,
    status text DEFAULT 'not_started'::text NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT task_assignments_progress_check CHECK (((progress >= 0) AND (progress <= 100)))
);


ALTER TABLE public.task_assignments OWNER TO neondb_owner;

--
-- TOC entry 3691 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE task_assignments; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.task_assignments IS 'Bảng trung gian users-tasks: 1 task nhiều nhân sự, mỗi lần giao có ngày nhận / ngày hoàn thành dự kiến / ngày hoàn thành thực tế.';


--
-- TOC entry 3692 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN task_assignments.stage_type; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.task_assignments.stage_type IS 'primary | btv1 | btv2 | doc_duyet (primary = gán việc đơn từ tasks.assignee_id cũ).';


--
-- TOC entry 3693 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN task_assignments.received_at; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.task_assignments.received_at IS 'Ngày nhận công việc.';


--
-- TOC entry 3694 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN task_assignments.due_date; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.task_assignments.due_date IS 'Ngày hoàn thành dự kiến.';


--
-- TOC entry 3695 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN task_assignments.completed_at; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.task_assignments.completed_at IS 'Ngày hoàn thành thực tế.';


--
-- TOC entry 232 (class 1259 OID 49176)
-- Name: tasks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.tasks (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    "group" text,
    status text NOT NULL,
    priority text NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    notes text,
    workflow jsonb,
    source_sheet_id text,
    source_sheet_name text,
    contract_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    task_type text DEFAULT 'GENERAL'::text,
    related_work_id uuid,
    related_contract_id uuid
);


ALTER TABLE public.tasks OWNER TO neondb_owner;

--
-- TOC entry 3696 (class 0 OID 0)
-- Dependencies: 232
-- Name: TABLE tasks; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.tasks IS 'Công việc (chỉ thông tin task-level). Người giao, ngày nhận/hoàn thành: bảng task_assignments.';


--
-- TOC entry 3697 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN tasks."group"; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.tasks."group" IS 'Nhóm CV: CV chung, Biên tập, Thiết kế + CNTT, Quét trùng lặp';


--
-- TOC entry 3698 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN tasks.task_type; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.tasks.task_type IS 'GENERAL | TRANSLATION | PROOFREADING | ...; NULL/legacy coi như GENERAL.';


--
-- TOC entry 3699 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN tasks.related_work_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.tasks.related_work_id IS 'Gắn task với work (tác phẩm). Optional.';


--
-- TOC entry 3700 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN tasks.related_contract_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.tasks.related_contract_id IS 'UUID của translation_contracts(id) hoặc proofreading_contracts(id); kiểm tra ở app theo task_type.';


--
-- TOC entry 244 (class 1259 OID 65547)
-- Name: translation_contracts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.translation_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_number text,
    work_id uuid,
    unit_price numeric,
    contract_value numeric,
    start_date date,
    end_date date,
    extension_start_date date,
    extension_end_date date,
    actual_completion_date date,
    actual_word_count integer,
    actual_page_count integer,
    completion_rate numeric,
    settlement_value numeric,
    note text,
    component_id uuid
);


ALTER TABLE public.translation_contracts OWNER TO neondb_owner;

--
-- TOC entry 3701 (class 0 OID 0)
-- Dependencies: 244
-- Name: TABLE translation_contracts; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.translation_contracts IS 'Hợp đồng dịch thuật (theo dõi hợp đồng dịch thuật).';


--
-- TOC entry 3702 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN translation_contracts.component_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.translation_contracts.component_id IS 'Hợp phần (phân loại hợp đồng); có thể suy từ work_id hoặc set trực tiếp.';


--
-- TOC entry 240 (class 1259 OID 57470)
-- Name: user_groups; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    group_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_groups OWNER TO neondb_owner;

--
-- TOC entry 3703 (class 0 OID 0)
-- Dependencies: 240
-- Name: TABLE user_groups; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.user_groups IS 'Bảng trung gian users-groups: 1 nhân sự thuộc nhiều nhóm (vd: vừa Biên tập vừa Thư ký hợp phần).';


--
-- TOC entry 242 (class 1259 OID 57507)
-- Name: user_roles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_roles OWNER TO neondb_owner;

--
-- TOC entry 3704 (class 0 OID 0)
-- Dependencies: 242
-- Name: TABLE user_roles; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.user_roles IS 'Bảng trung gian users-roles: 1 nhân sự có nhiều vai trò. Phục vụ phân quyền truy cập task.';


--
-- TOC entry 230 (class 1259 OID 49152)
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text,
    display_name text NOT NULL,
    first_name text,
    last_name text,
    department text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- TOC entry 3705 (class 0 OID 0)
-- Dependencies: 230
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.users IS 'Nhân sự. Vai trò: bảng user_roles. Nhóm: bảng user_groups.';


--
-- TOC entry 3706 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN users.department; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.users.department IS 'Đơn vị: 1 nhân sự chỉ thuộc một department (vd: Ban Thư ký).';


--
-- TOC entry 243 (class 1259 OID 65536)
-- Name: works; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.works (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stage text,
    title_vi text,
    title_hannom text,
    document_code text,
    base_word_count integer,
    base_page_count integer,
    estimate_factor numeric,
    estimate_word_count integer,
    estimate_page_count integer,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    component_id uuid
);


ALTER TABLE public.works OWNER TO neondb_owner;

--
-- TOC entry 3707 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE works; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.works IS 'Tác phẩm / công việc nguồn (trục nghiệp vụ bền vững).';


--
-- TOC entry 3708 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN works.component_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.works.component_id IS 'Hợp phần dịch thuật (phân loại tác phẩm).';


--
-- TOC entry 3664 (class 0 OID 65591)
-- Dependencies: 246
-- Data for Name: components; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.components (id, code, name, description, display_order, created_at) FROM stdin;
58786d42-3079-4d1e-b2f7-b160208c2293	phat_tang_toan_dich	Phật tạng toàn dịch	\N	1	2026-01-30 04:55:23.343182+00
32037af6-b306-4ea7-af9d-ae766e67dde6	phat_tang_tinh_yeu	Phật tạng tinh yếu	\N	2	2026-01-30 04:55:23.343182+00
59a2a4c4-c508-403d-bf55-1b1917f8d714	nho_dien	Nho điển	\N	5	2026-01-30 04:55:23.343182+00
1d724f5c-67fb-4a63-b7d2-434d22f90e05	nho_tang	Nho tạng toàn dịch	\N	4	2026-01-30 04:55:23.343182+00
25aed873-6915-4d53-9354-5f9704364fb1	phat_dien	Phật điển Việt Nam	\N	3	2026-01-30 04:55:23.343182+00
\.


--
-- TOC entry 3654 (class 0 OID 57375)
-- Dependencies: 236
-- Data for Name: contract_members; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.contract_members (id, contract_id, user_id, role, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3665 (class 0 OID 65605)
-- Dependencies: 247
-- Data for Name: contract_stages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.contract_stages (id, translation_contract_id, proofreading_contract_id, stage_code, stage_order, start_date, end_date, actual_completion_date, note) FROM stdin;
\.


--
-- TOC entry 3649 (class 0 OID 49166)
-- Dependencies: 231
-- Data for Name: contracts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.contracts (id, code, type, name, party_a, party_b, signed_at, value, status, contract_scope, description, start_date, end_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3656 (class 0 OID 57427)
-- Dependencies: 238
-- Data for Name: document_contracts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.document_contracts (id, document_id, contract_id, role, note, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3655 (class 0 OID 57402)
-- Dependencies: 237
-- Data for Name: document_tasks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.document_tasks (id, document_id, task_id, role, note, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3651 (class 0 OID 49196)
-- Dependencies: 233
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.documents (id, title, document_type, file_path, storage_key, contract_id, task_id, uploaded_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3657 (class 0 OID 57456)
-- Dependencies: 239
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.groups (id, code, name, description, created_at, updated_at) FROM stdin;
66df46df-2814-428d-996e-a5aaeff4c263	thiet_ke_cntt	Thiết kế 	Nhóm thiết kế và CNTT	2026-01-29 05:12:54.640797+00	2026-01-29 10:20:31.330273+00
f4adb090-2b47-4ebc-8e9f-94be393e5228	manager	Quản lý	Nhóm quản lý	2026-01-29 10:24:00.102403+00	2026-01-29 10:24:00.102403+00
3e0ba4ba-6ad8-4624-ae9c-891232056b28	thong_thuong	Thông thường	Nhân sự Dự án nói chung	2026-01-29 05:12:54.640797+00	2026-01-29 10:24:00.190793+00
d4b1672f-f8f9-4936-acd6-90a750757e5c	bien_tap	Biên tập	Nhóm biên tập	2026-01-29 05:12:54.640797+00	2026-01-29 10:24:27.12318+00
985a7b8c-f5e5-4b55-ab7d-42a397ddee34	hop_phan_dich_thuat	Hợp phần dịch thuật	Nhóm thư ký hợp phần	2026-01-29 05:12:54.640797+00	2026-01-29 10:25:26.983241+00
03b38e9c-5e81-41ff-be3a-8ed75b24ecda	it	Kỹ thuật	Nhóm nhân sự phụ trách CNTT	2026-01-29 10:21:24.851979+00	2026-01-29 10:27:19.181145+00
\.


--
-- TOC entry 3663 (class 0 OID 65562)
-- Dependencies: 245
-- Data for Name: proofreading_contracts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.proofreading_contracts (id, contract_number, work_id, translation_contract_id, proofreader_name, page_count, rate_ratio, contract_value, start_date, end_date, actual_completion_date, note, component_id) FROM stdin;
\.


--
-- TOC entry 3659 (class 0 OID 57493)
-- Dependencies: 241
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.roles (id, code, name, description, created_at, updated_at) FROM stdin;
b5a3a01b-77f5-447a-aeee-096edfdd36f5	admin	Admin	Quản trị hệ thống	2026-01-29 05:12:54.692382+00	2026-01-29 05:12:54.692382+00
c702c5e5-49f5-4570-af59-e0a9e5471794	editor	Biên tập viên	Biên tập viên	2026-01-29 10:27:06.043986+00	2026-01-29 10:27:06.043986+00
0b4374d3-c74d-40a1-91e9-ac54d9d07033	prj_secretary	Thư ký hợp phần	Thư ký hợp phần	2026-01-29 05:12:54.692382+00	2026-01-29 10:27:06.129663+00
10114bd1-51e1-4719-9149-309c86e2a079	designer	Hoạ sĩ thiết kế	Hoạ sĩ thiết kế và dàn trang	2026-01-29 10:27:06.05756+00	2026-01-29 10:27:48.659096+00
903a9649-1514-4393-acd3-991a33608dad	ptbtk\t	Phó trưởng ban Thư ký	Phó trưởng ban Thư ký	2026-01-29 10:30:44.92251+00	2026-01-29 10:30:44.92251+00
75f7b60f-bb13-40ff-a066-b72cf82dacc1	tbtk\t	Trưởng ban Thư ký	Quản lý	2026-01-29 05:12:54.692382+00	2026-01-29 10:30:44.987074+00
83004138-2d9d-4ced-9510-cc77eac41299	employee	Thông thường	Nhân sự Dự án nói chung	2026-01-29 10:28:41.370051+00	2026-01-29 10:31:00.356345+00
\.


--
-- TOC entry 3652 (class 0 OID 49238)
-- Dependencies: 234
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.session (sid, sess, expire) FROM stdin;
eltor8JXac49UggH4qxhxAFDq0xQRrvb	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-06T04:58:50.122Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-06 10:47:00
yy3hBBhEe-siIz5VVAFtgbYG0LWhdREM	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-06T04:57:30.059Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-06 04:57:31
RpgYFxP63CTJIsHj-379lPytqokKEV7P	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-06T04:57:45.332Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-06 04:57:46
yaCw5C1PgGm-7xSqc5X8s8_TwRj2buQZ	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-04T11:57:51.208Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-04 12:42:32
8FTT_s434T5JGSdxpW7J9JMzdcYqjbYf	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-06T10:39:23.015Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"11817e25-7e55-4b0d-82ef-9ff26de11efa"}}	2026-02-06 10:39:36
vFi2OqLV_YN2j3V7ZG3BPMrXjWsgIYNO	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-04T15:44:40.034Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-04 15:44:41
\.


--
-- TOC entry 3653 (class 0 OID 57344)
-- Dependencies: 235
-- Data for Name: task_assignments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.task_assignments (id, task_id, user_id, stage_type, round_number, received_at, due_date, completed_at, status, progress, notes, created_at, updated_at) FROM stdin;
c5cd4939-1089-42be-bfe7-38fe6c571d86	task-1769675173549-5x9i0zv	e0f74135-4578-4c1c-9944-55f17046607b	btv2	1	2025-12-28	2025-12-31	2025-12-31 00:00:00+00	completed	100	\N	2026-01-30 09:10:09.482191+00	2026-01-30 09:10:09.482191+00
35ab0d63-a3fb-4e4f-a2af-8837e6da046d	task-1769675173549-5x9i0zv	11817e25-7e55-4b0d-82ef-9ff26de11efa	btv1	1	2026-01-01	2026-01-05	2026-01-05 00:00:00+00	completed	100	\N	2026-01-30 09:10:09.541213+00	2026-01-30 09:10:09.541213+00
e7378078-a243-4299-90cf-c6cc76a2318c	task-1769675173549-5x9i0zv	732a44be-0c38-4334-8897-63e49094c6e5	doc_duyet	1	2026-01-05	2026-01-10	2026-01-15 00:00:00+00	completed	100	\N	2026-01-30 09:10:09.599722+00	2026-01-30 09:10:09.599722+00
bfc3b8b6-3acc-4717-aaa4-048105c1d4fd	task-1769767723811-c1mvdem	11817e25-7e55-4b0d-82ef-9ff26de11efa	nhan_su_1	1	2026-01-01	2026-01-31	2026-01-30 00:00:00+00	completed	0	\N	2026-01-30 10:41:02.313073+00	2026-01-30 10:41:02.313073+00
7984573b-ca9a-40e3-a3c1-d38b2a4a7eec	task-1769767723811-c1mvdem	e0f74135-4578-4c1c-9944-55f17046607b	nhan_su_2	1	2026-01-01	2026-02-01	2026-01-30 00:00:00+00	completed	0	\N	2026-01-30 10:41:02.371667+00	2026-01-30 10:41:02.371667+00
befc0826-b320-4e24-8996-0c766e50936d	task-1769767723811-c1mvdem	732a44be-0c38-4334-8897-63e49094c6e5	kiem_soat	1	2026-01-30	2026-02-01	2026-01-30 00:00:00+00	not_started	0	\N	2026-01-30 10:41:02.428468+00	2026-01-30 10:41:02.428468+00
c33a6120-2db0-48ed-bb85-db7c9a7c8837	task-1769675296722-paqwqrv	3c17630a-da96-42da-8147-6a8544202429	btv2	3	2025-12-29	2026-01-02	2026-01-03 00:00:00+00	completed	100	\N	2026-01-30 02:49:02.24983+00	2026-01-30 02:49:02.24983+00
ff977517-5cae-4fde-9144-7e08e456de2b	task-1769675296722-paqwqrv	219965d8-1855-461e-81ba-5264e8405e3a	btv1	3	2026-01-03	2026-01-09	2026-01-08 00:00:00+00	completed	100	\N	2026-01-30 02:49:02.295115+00	2026-01-30 02:49:02.295115+00
a939de9b-38cc-4bc2-b27d-c61e94db301d	task-1769675296722-paqwqrv	732a44be-0c38-4334-8897-63e49094c6e5	doc_duyet	3	2026-01-09	2026-01-18	\N	in_progress	0	\N	2026-01-30 02:49:02.338763+00	2026-01-30 02:49:02.338763+00
\.


--
-- TOC entry 3650 (class 0 OID 49176)
-- Dependencies: 232
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.tasks (id, title, description, "group", status, priority, progress, notes, workflow, source_sheet_id, source_sheet_name, contract_id, created_at, updated_at, task_type, related_work_id, related_contract_id) FROM stdin;
task-1769675296722-paqwqrv	Test tạo mới task Biên tập 2	\N	Biên tập	Completed	High	67	Test tạo mới task Biên tập 2	"{\\"rounds\\":[{\\"roundNumber\\":1,\\"roundType\\":\\"Bông 3 (tinh)\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"completedDate\\":null,\\"stages\\":[{\\"type\\":\\"btv2\\",\\"assignee\\":\\"Nguyễn Linh Trang\\",\\"status\\":\\"completed\\",\\"startDate\\":\\"2025-12-29\\",\\"dueDate\\":\\"2026-01-02\\",\\"completedDate\\":\\"2026-01-03\\",\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":100},{\\"type\\":\\"btv1\\",\\"assignee\\":\\"Lê Thị Hải Yến\\",\\"status\\":\\"completed\\",\\"startDate\\":\\"2026-01-03\\",\\"dueDate\\":\\"2026-01-09\\",\\"completedDate\\":\\"2026-01-08\\",\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":100},{\\"type\\":\\"doc_duyet\\",\\"assignee\\":\\"Vũ Thị Hương\\",\\"status\\":\\"in_progress\\",\\"startDate\\":\\"2026-01-09\\",\\"dueDate\\":\\"2026-01-18\\",\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0}]}],\\"currentRound\\":1,\\"totalRounds\\":1}"	\N	\N	\N	2026-01-29 08:28:16.722+00	2026-01-30 02:49:02.163812+00	GENERAL	\N	\N
task-1769675173549-5x9i0zv	Biên tập Tạp A hàm kinh (Test)	\N	Biên tập	Completed	Medium	100	Test tạo mới task Biên tập 1	"{\\"rounds\\":[{\\"roundNumber\\":1,\\"roundType\\":\\"Bông 1 (thô)\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"completedDate\\":null,\\"stages\\":[{\\"type\\":\\"btv2\\",\\"assignee\\":\\"Dương Hương Nguyên\\",\\"status\\":\\"completed\\",\\"startDate\\":\\"2025-12-28\\",\\"dueDate\\":\\"2025-12-31\\",\\"completedDate\\":\\"2025-12-31\\",\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":100},{\\"type\\":\\"btv1\\",\\"assignee\\":\\"Cung Thị Kim Thành\\",\\"status\\":\\"completed\\",\\"startDate\\":\\"2026-01-01\\",\\"dueDate\\":\\"2026-01-05\\",\\"completedDate\\":\\"2026-01-05\\",\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":100},{\\"type\\":\\"doc_duyet\\",\\"assignee\\":\\"Vũ Thị Hương\\",\\"status\\":\\"completed\\",\\"startDate\\":\\"2026-01-05\\",\\"dueDate\\":\\"2026-01-10\\",\\"completedDate\\":\\"2026-01-15\\",\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":100}]}],\\"currentRound\\":1,\\"totalRounds\\":1}"	\N	\N	\N	2026-01-29 08:26:13.549+00	2026-01-30 09:10:09.36378+00	PROOFREADING	f0c8aa8c-637d-4ab9-a61e-5c9df45408c4	\N
task-1769767723811-c1mvdem	Đối chiếu phiên âm với nguyên văn chữ Hán	\N	CV chung	Completed	Medium	100	\N	\N	\N	\N	\N	2026-01-30 10:08:43.81+00	2026-01-30 10:41:02.198312+00	GENERAL	f0c8aa8c-637d-4ab9-a61e-5c9df45408c4	\N
\.


--
-- TOC entry 3662 (class 0 OID 65547)
-- Dependencies: 244
-- Data for Name: translation_contracts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.translation_contracts (id, contract_number, work_id, unit_price, contract_value, start_date, end_date, extension_start_date, extension_end_date, actual_completion_date, actual_word_count, actual_page_count, completion_rate, settlement_value, note, component_id) FROM stdin;
\.


--
-- TOC entry 3658 (class 0 OID 57470)
-- Dependencies: 240
-- Data for Name: user_groups; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_groups (id, user_id, group_id, created_at, updated_at) FROM stdin;
cf25ff30-f4e8-4aa7-87a7-305fa45d0505	11817e25-7e55-4b0d-82ef-9ff26de11efa	d4b1672f-f8f9-4936-acd6-90a750757e5c	2026-01-29 10:59:40.265196+00	2026-01-29 10:59:40.265196+00
afccd9c1-4610-4236-9abb-06f817962518	99434b30-4982-48e9-8c81-b3466309537e	66df46df-2814-428d-996e-a5aaeff4c263	2026-01-29 11:02:45.723798+00	2026-01-29 11:02:45.723798+00
1d9d6135-11d0-4e8e-8006-6fb5e906a20f	9f59f810-2c2a-4242-b56c-77d4bdf73391	985a7b8c-f5e5-4b55-ab7d-42a397ddee34	2026-01-29 11:04:54.618387+00	2026-01-29 11:04:54.618387+00
dc9ab3cf-a310-4027-afbd-5c46074a941d	9f59f810-2c2a-4242-b56c-77d4bdf73391	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-29 11:04:54.618387+00	2026-01-29 11:04:54.618387+00
fbbfaf92-ffc1-40be-a755-c5f60d213996	e0f74135-4578-4c1c-9944-55f17046607b	985a7b8c-f5e5-4b55-ab7d-42a397ddee34	2026-01-30 02:36:09.728327+00	2026-01-30 02:36:09.728327+00
f983ca69-a80b-46b4-be0c-29d19302e652	e0f74135-4578-4c1c-9944-55f17046607b	d4b1672f-f8f9-4936-acd6-90a750757e5c	2026-01-30 02:36:09.728327+00	2026-01-30 02:36:09.728327+00
2d183500-c63a-4980-915f-c6bef19255aa	e0f74135-4578-4c1c-9944-55f17046607b	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-30 02:36:09.728327+00	2026-01-30 02:36:09.728327+00
2e991729-7f37-4b7a-9279-076e52fae83e	52fa58ae-5f0a-4687-9d47-b0e5d3a210d3	985a7b8c-f5e5-4b55-ab7d-42a397ddee34	2026-01-30 02:36:30.029231+00	2026-01-30 02:36:30.029231+00
f88fcc5b-379d-413a-ac4e-fe7bc694b979	52fa58ae-5f0a-4687-9d47-b0e5d3a210d3	f4adb090-2b47-4ebc-8e9f-94be393e5228	2026-01-30 02:36:30.029231+00	2026-01-30 02:36:30.029231+00
e80ce6ba-a6e8-4ea4-8bb1-2302a46c243d	916316a5-f8b2-4d03-a046-ba00c22e727f	985a7b8c-f5e5-4b55-ab7d-42a397ddee34	2026-01-30 02:36:49.293702+00	2026-01-30 02:36:49.293702+00
b0f7033c-2c5f-45aa-9291-ce880a2d557e	916316a5-f8b2-4d03-a046-ba00c22e727f	f4adb090-2b47-4ebc-8e9f-94be393e5228	2026-01-30 02:36:49.293702+00	2026-01-30 02:36:49.293702+00
95a1fc67-82e8-477b-b726-20eb6cb94551	79a84794-8a33-4b27-ab86-e2ce152e46da	03b38e9c-5e81-41ff-be3a-8ed75b24ecda	2026-01-30 02:37:19.130992+00	2026-01-30 02:37:19.130992+00
f7a6feba-db2e-43a5-acde-86950da7979a	79a84794-8a33-4b27-ab86-e2ce152e46da	66df46df-2814-428d-996e-a5aaeff4c263	2026-01-30 02:37:19.130992+00	2026-01-30 02:37:19.130992+00
1da2599b-e1ad-4e55-b315-f2195e7d6dc5	79a84794-8a33-4b27-ab86-e2ce152e46da	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-30 02:37:19.130992+00	2026-01-30 02:37:19.130992+00
28b06d2f-ab3a-4ed4-bb55-3e6d7a90adff	46be9276-294e-49a5-8d43-6d45b7b3fa3a	d4b1672f-f8f9-4936-acd6-90a750757e5c	2026-01-30 02:37:36.883963+00	2026-01-30 02:37:36.883963+00
cb74f412-8f42-4863-8e01-186f8061ce1b	46be9276-294e-49a5-8d43-6d45b7b3fa3a	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-30 02:37:36.883963+00	2026-01-30 02:37:36.883963+00
5e5fd4d8-bfc4-4bcf-89eb-ab8baa36ebe8	219965d8-1855-461e-81ba-5264e8405e3a	d4b1672f-f8f9-4936-acd6-90a750757e5c	2026-01-30 02:37:52.929373+00	2026-01-30 02:37:52.929373+00
61b9d376-0833-4770-af9a-7ffb842fec9a	219965d8-1855-461e-81ba-5264e8405e3a	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-30 02:37:52.929373+00	2026-01-30 02:37:52.929373+00
794b5cfe-36cb-4497-8420-62df4678d4bf	ccedb4bb-b523-4a4e-a628-ccdcdb1cdef2	d4b1672f-f8f9-4936-acd6-90a750757e5c	2026-01-30 02:38:07.982822+00	2026-01-30 02:38:07.982822+00
c20f5171-060d-4fa5-9512-f68474da6831	ccedb4bb-b523-4a4e-a628-ccdcdb1cdef2	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-30 02:38:07.982822+00	2026-01-30 02:38:07.982822+00
9e54a5ae-97d3-4b52-91ca-afba868f6b1c	19c6c15c-c249-4410-9c37-2f19ca885bee	d4b1672f-f8f9-4936-acd6-90a750757e5c	2026-01-30 02:38:32.151382+00	2026-01-30 02:38:32.151382+00
485408b1-6198-47b7-a651-1a352c47df60	19c6c15c-c249-4410-9c37-2f19ca885bee	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-30 02:38:32.151382+00	2026-01-30 02:38:32.151382+00
83011a5f-2cb8-49ac-be8b-feb1455e58d2	19c6c15c-c249-4410-9c37-2f19ca885bee	985a7b8c-f5e5-4b55-ab7d-42a397ddee34	2026-01-30 02:38:32.151382+00	2026-01-30 02:38:32.151382+00
55ac02e6-a8de-407d-a9e0-becd57dd8c63	a45f4e87-1449-4cd3-a32c-9b16b315b1f7	d4b1672f-f8f9-4936-acd6-90a750757e5c	2026-01-30 02:38:53.614276+00	2026-01-30 02:38:53.614276+00
3cdd3b47-7a11-49c9-8f76-54cd7db2e546	a45f4e87-1449-4cd3-a32c-9b16b315b1f7	985a7b8c-f5e5-4b55-ab7d-42a397ddee34	2026-01-30 02:38:53.614276+00	2026-01-30 02:38:53.614276+00
fd5ddba9-8238-41d6-9ae7-e4057347e3d1	a45f4e87-1449-4cd3-a32c-9b16b315b1f7	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-30 02:38:53.614276+00	2026-01-30 02:38:53.614276+00
f53d294f-0fd3-474a-840a-9e6b035ca88e	e177e33b-2720-4a23-ac89-a8a4c93857b3	d4b1672f-f8f9-4936-acd6-90a750757e5c	2026-01-30 02:39:19.332996+00	2026-01-30 02:39:19.332996+00
30344cc9-0d8e-4c14-8032-6519883eddf8	e177e33b-2720-4a23-ac89-a8a4c93857b3	985a7b8c-f5e5-4b55-ab7d-42a397ddee34	2026-01-30 02:39:19.332996+00	2026-01-30 02:39:19.332996+00
9ee6d7b7-4c68-467e-8671-7547b5c5d6b7	e177e33b-2720-4a23-ac89-a8a4c93857b3	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-30 02:39:19.332996+00	2026-01-30 02:39:19.332996+00
6a059b2d-7576-47c6-9a63-d5dbcf9bd114	02cfd1a3-7a97-4187-914c-55fee83f380e	d4b1672f-f8f9-4936-acd6-90a750757e5c	2026-01-30 02:39:37.740974+00	2026-01-30 02:39:37.740974+00
b0e2ab6c-68b9-4813-833f-87d97e90d2b2	02cfd1a3-7a97-4187-914c-55fee83f380e	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-30 02:39:37.740974+00	2026-01-30 02:39:37.740974+00
427e7628-1f71-4bd4-8569-9cc9086df10f	3c17630a-da96-42da-8147-6a8544202429	d4b1672f-f8f9-4936-acd6-90a750757e5c	2026-01-30 02:40:07.756677+00	2026-01-30 02:40:07.756677+00
9434644c-2b4c-4529-b721-3b741c75f66a	3c17630a-da96-42da-8147-6a8544202429	985a7b8c-f5e5-4b55-ab7d-42a397ddee34	2026-01-30 02:40:07.756677+00	2026-01-30 02:40:07.756677+00
32d6825f-601f-4c3e-8a8b-b2f334f035de	3c17630a-da96-42da-8147-6a8544202429	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-30 02:40:07.756677+00	2026-01-30 02:40:07.756677+00
1848243a-a3f3-429b-9828-174de884066f	6845e494-d1b9-40ae-b36f-2cdb09291747	d4b1672f-f8f9-4936-acd6-90a750757e5c	2026-01-30 02:41:15.603756+00	2026-01-30 02:41:15.603756+00
56b2f6da-afd6-4600-a4b7-2ca7146f7bdb	6845e494-d1b9-40ae-b36f-2cdb09291747	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-30 02:41:15.603756+00	2026-01-30 02:41:15.603756+00
61f45615-cd42-4d29-b08d-14523766fa1c	6845e494-d1b9-40ae-b36f-2cdb09291747	66df46df-2814-428d-996e-a5aaeff4c263	2026-01-30 02:41:15.603756+00	2026-01-30 02:41:15.603756+00
5db86718-3acf-41f7-8556-6bb4da16bd4e	0607714e-e265-4ed1-a36f-39cedd66f10f	d4b1672f-f8f9-4936-acd6-90a750757e5c	2026-01-30 02:41:40.7785+00	2026-01-30 02:41:40.7785+00
57150957-71d3-430c-82c9-20e2fc44d58a	0607714e-e265-4ed1-a36f-39cedd66f10f	985a7b8c-f5e5-4b55-ab7d-42a397ddee34	2026-01-30 02:41:40.7785+00	2026-01-30 02:41:40.7785+00
d24a97d8-58ed-4ec0-aea3-a39960acef82	0607714e-e265-4ed1-a36f-39cedd66f10f	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-30 02:41:40.7785+00	2026-01-30 02:41:40.7785+00
2a8b4f6a-41ae-4886-bbae-f87be136bd02	50ee08d4-15aa-406a-98c5-d2b26ce1a83b	d4b1672f-f8f9-4936-acd6-90a750757e5c	2026-01-30 02:43:17.715459+00	2026-01-30 02:43:17.715459+00
9ad024aa-262e-4beb-88b2-477831b4c40d	50ee08d4-15aa-406a-98c5-d2b26ce1a83b	66df46df-2814-428d-996e-a5aaeff4c263	2026-01-30 02:43:17.715459+00	2026-01-30 02:43:17.715459+00
088cfc3d-4fd4-4f45-b404-a510bbdccd2e	50ee08d4-15aa-406a-98c5-d2b26ce1a83b	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-30 02:43:17.715459+00	2026-01-30 02:43:17.715459+00
ef7b4942-db51-4db7-b0ac-c59019c5c83e	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	985a7b8c-f5e5-4b55-ab7d-42a397ddee34	2026-01-30 02:44:22.554431+00	2026-01-30 02:44:22.554431+00
d0a40166-4ea5-41e3-bbe3-4f38db8a9c19	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	03b38e9c-5e81-41ff-be3a-8ed75b24ecda	2026-01-30 02:44:22.554431+00	2026-01-30 02:44:22.554431+00
3e873942-4e0a-4f51-a8a0-317145424f71	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-30 02:44:22.554431+00	2026-01-30 02:44:22.554431+00
592e1398-5619-47b9-b7a2-b6e3fecdfb40	6cd0ecee-eb79-463b-84a8-9932c54c7cc2	d4b1672f-f8f9-4936-acd6-90a750757e5c	2026-01-30 02:44:43.054546+00	2026-01-30 02:44:43.054546+00
5aa2ab48-eb7f-4317-89c2-59b8833a7027	6cd0ecee-eb79-463b-84a8-9932c54c7cc2	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-30 02:44:43.054546+00	2026-01-30 02:44:43.054546+00
d692f0b9-df49-4d25-b968-0ec176a9b980	0eef4c99-11d9-420c-a012-b9defe3d5bb6	985a7b8c-f5e5-4b55-ab7d-42a397ddee34	2026-01-30 02:45:12.816857+00	2026-01-30 02:45:12.816857+00
5f0a327f-a3d6-4aed-8a67-11fcf5a3bcb0	0eef4c99-11d9-420c-a012-b9defe3d5bb6	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-30 02:45:12.816857+00	2026-01-30 02:45:12.816857+00
6e35dbec-8126-411b-9c14-aeac0c93b6ac	0eef4c99-11d9-420c-a012-b9defe3d5bb6	d4b1672f-f8f9-4936-acd6-90a750757e5c	2026-01-30 02:45:12.816857+00	2026-01-30 02:45:12.816857+00
a2f8fafd-37e3-4a13-a25e-e9d2ec48a4fb	c28a1e2b-b90e-44cb-95c7-4369e21d15c3	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-30 02:45:27.497511+00	2026-01-30 02:45:27.497511+00
850b441d-e4dc-4a1a-9caf-8c76bbbf1daa	6267364c-d995-471f-bd07-ef118ad65d71	d4b1672f-f8f9-4936-acd6-90a750757e5c	2026-01-30 02:45:42.936681+00	2026-01-30 02:45:42.936681+00
bf68f7d4-932f-44de-8c29-ad2b1f886c4d	6267364c-d995-471f-bd07-ef118ad65d71	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-30 02:45:42.936681+00	2026-01-30 02:45:42.936681+00
101b139a-6b93-4dcd-b280-5524464f28be	fa3da8df-1bc3-43fb-be3f-25bbfdf3113b	d4b1672f-f8f9-4936-acd6-90a750757e5c	2026-01-30 02:45:59.792144+00	2026-01-30 02:45:59.792144+00
e35e3e86-24b1-4c4d-ac11-dc06a05dd18d	fa3da8df-1bc3-43fb-be3f-25bbfdf3113b	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-30 02:45:59.792144+00	2026-01-30 02:45:59.792144+00
bf389640-0e0a-4ce7-bcd0-ead9f67599e9	5a3dc6e5-c7d4-467b-aa3f-673312685b82	d4b1672f-f8f9-4936-acd6-90a750757e5c	2026-01-30 02:46:19.427787+00	2026-01-30 02:46:19.427787+00
fbf8298b-0073-48ed-a6ae-0cbdd2441d3a	5a3dc6e5-c7d4-467b-aa3f-673312685b82	985a7b8c-f5e5-4b55-ab7d-42a397ddee34	2026-01-30 02:46:19.427787+00	2026-01-30 02:46:19.427787+00
ddad6976-acdc-40c7-ba1b-b98bd74cac8b	5a3dc6e5-c7d4-467b-aa3f-673312685b82	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-30 02:46:19.427787+00	2026-01-30 02:46:19.427787+00
f36aa826-9ba0-46c9-8cee-797f6cfe6cb6	b5b30517-5c9c-4036-afd9-4e2948651238	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-30 02:46:34.742781+00	2026-01-30 02:46:34.742781+00
85f2ded7-346b-4f56-af33-c93cfe831f6a	b5b30517-5c9c-4036-afd9-4e2948651238	985a7b8c-f5e5-4b55-ab7d-42a397ddee34	2026-01-30 02:46:34.742781+00	2026-01-30 02:46:34.742781+00
374c05d4-ba48-4fa6-bd35-f4ef94674925	732a44be-0c38-4334-8897-63e49094c6e5	f4adb090-2b47-4ebc-8e9f-94be393e5228	2026-01-30 02:47:09.399035+00	2026-01-30 02:47:09.399035+00
aad9fe99-f8c1-4eee-bbf9-74111b6d6f7b	94025b61-6607-4f2f-b2b4-f4567f14f0b8	d4b1672f-f8f9-4936-acd6-90a750757e5c	2026-01-30 02:47:53.563957+00	2026-01-30 02:47:53.563957+00
f0b322a3-d2be-433a-8b51-736330ff79a9	94025b61-6607-4f2f-b2b4-f4567f14f0b8	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-30 02:47:53.563957+00	2026-01-30 02:47:53.563957+00
\.


--
-- TOC entry 3660 (class 0 OID 57507)
-- Dependencies: 242
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_roles (id, user_id, role_id, created_at, updated_at) FROM stdin;
97fcebd5-1787-4094-81b5-df5534c937e1	88d7b1cf-5818-4202-aa28-a36912e3c3ed	b5a3a01b-77f5-447a-aeee-096edfdd36f5	2026-01-29 05:13:39.635153+00	2026-01-29 05:13:39.635153+00
39870ad3-d5d7-4cef-9cd2-06e5024654ba	11817e25-7e55-4b0d-82ef-9ff26de11efa	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-29 10:59:40.152895+00	2026-01-29 10:59:40.152895+00
a82f6346-5757-429f-8cb3-884e70f21c49	99434b30-4982-48e9-8c81-b3466309537e	10114bd1-51e1-4719-9149-309c86e2a079	2026-01-29 11:02:45.629841+00	2026-01-29 11:02:45.629841+00
2595b8e1-5590-415b-b19d-039b6464487d	9f59f810-2c2a-4242-b56c-77d4bdf73391	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-01-29 11:04:54.526537+00	2026-01-29 11:04:54.526537+00
1b3270ec-4ac0-4d53-9a83-80121c6a2da0	9f59f810-2c2a-4242-b56c-77d4bdf73391	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-29 11:04:54.526537+00	2026-01-29 11:04:54.526537+00
72080948-6b7f-4951-90d3-9a8a9d0aa382	9f59f810-2c2a-4242-b56c-77d4bdf73391	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-29 11:04:54.526537+00	2026-01-29 11:04:54.526537+00
cf224d8e-a1e1-46c8-8929-e82589aea544	e0f74135-4578-4c1c-9944-55f17046607b	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-01-30 02:36:09.616865+00	2026-01-30 02:36:09.616865+00
d5555349-24a9-4a86-af07-da3656124d26	e0f74135-4578-4c1c-9944-55f17046607b	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:36:09.616865+00	2026-01-30 02:36:09.616865+00
0fb9afba-8cff-4d63-93db-0bd5ac7ebb00	e0f74135-4578-4c1c-9944-55f17046607b	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:36:09.616865+00	2026-01-30 02:36:09.616865+00
8a844f73-15b1-46c4-844f-1291b643c9df	52fa58ae-5f0a-4687-9d47-b0e5d3a210d3	903a9649-1514-4393-acd3-991a33608dad	2026-01-30 02:36:29.921193+00	2026-01-30 02:36:29.921193+00
1c29d93d-654f-4f60-ad33-09d205516847	52fa58ae-5f0a-4687-9d47-b0e5d3a210d3	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-01-30 02:36:29.921193+00	2026-01-30 02:36:29.921193+00
73b5f06b-b66e-41e5-8cc7-40af8a78a1e0	916316a5-f8b2-4d03-a046-ba00c22e727f	903a9649-1514-4393-acd3-991a33608dad	2026-01-30 02:36:49.205676+00	2026-01-30 02:36:49.205676+00
00406209-533a-41ad-b6cc-9920c8e1324d	916316a5-f8b2-4d03-a046-ba00c22e727f	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-01-30 02:36:49.205676+00	2026-01-30 02:36:49.205676+00
658d927e-a4d7-4b98-b668-cca2eef7d647	79a84794-8a33-4b27-ab86-e2ce152e46da	10114bd1-51e1-4719-9149-309c86e2a079	2026-01-30 02:37:19.024924+00	2026-01-30 02:37:19.024924+00
61c55900-09e1-4d6c-8427-41735d7a7bc8	79a84794-8a33-4b27-ab86-e2ce152e46da	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:37:19.024924+00	2026-01-30 02:37:19.024924+00
0b8d87d2-65ac-45f9-99e7-78d6b1d9c7e0	46be9276-294e-49a5-8d43-6d45b7b3fa3a	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:37:36.764314+00	2026-01-30 02:37:36.764314+00
97f131af-7c1d-49f0-89f4-14d00a24deda	46be9276-294e-49a5-8d43-6d45b7b3fa3a	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:37:36.764314+00	2026-01-30 02:37:36.764314+00
488ddab3-2c43-488a-a15a-cc819d67d3d7	219965d8-1855-461e-81ba-5264e8405e3a	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:37:52.83487+00	2026-01-30 02:37:52.83487+00
440c7e2b-422b-4671-bb90-dfc8ec2ab6e3	219965d8-1855-461e-81ba-5264e8405e3a	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:37:52.83487+00	2026-01-30 02:37:52.83487+00
43993c52-00dd-4144-9289-1c8dfa3e3b3c	ccedb4bb-b523-4a4e-a628-ccdcdb1cdef2	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:38:07.866273+00	2026-01-30 02:38:07.866273+00
1b4f10f1-0516-486b-b415-1a3d5e0772d7	ccedb4bb-b523-4a4e-a628-ccdcdb1cdef2	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:38:07.866273+00	2026-01-30 02:38:07.866273+00
b9089cef-c423-4c87-ace7-e8a53e505f9e	19c6c15c-c249-4410-9c37-2f19ca885bee	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:38:32.050694+00	2026-01-30 02:38:32.050694+00
deb76b4b-6010-41af-84d1-b005ee83ad1e	19c6c15c-c249-4410-9c37-2f19ca885bee	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-01-30 02:38:32.050694+00	2026-01-30 02:38:32.050694+00
3f633ddc-9b2f-4312-8e31-797a580613ea	19c6c15c-c249-4410-9c37-2f19ca885bee	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:38:32.050694+00	2026-01-30 02:38:32.050694+00
edae1ad4-ccea-4de9-ba45-d703fb90786b	a45f4e87-1449-4cd3-a32c-9b16b315b1f7	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:38:53.512083+00	2026-01-30 02:38:53.512083+00
ca88c42a-7cc4-43fe-8367-7a6703eeefc9	a45f4e87-1449-4cd3-a32c-9b16b315b1f7	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:38:53.512083+00	2026-01-30 02:38:53.512083+00
5bb8449b-eb58-4f54-9f78-64ee070a44fd	a45f4e87-1449-4cd3-a32c-9b16b315b1f7	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-01-30 02:38:53.512083+00	2026-01-30 02:38:53.512083+00
c4752be7-effc-4552-816f-b8a15dbcf3a1	e177e33b-2720-4a23-ac89-a8a4c93857b3	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:39:19.22405+00	2026-01-30 02:39:19.22405+00
5e29ea38-9680-47c9-a1d4-9015cf29da57	e177e33b-2720-4a23-ac89-a8a4c93857b3	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-01-30 02:39:19.22405+00	2026-01-30 02:39:19.22405+00
463692d6-fc0f-4bab-885f-c5e715dd3e94	e177e33b-2720-4a23-ac89-a8a4c93857b3	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:39:19.22405+00	2026-01-30 02:39:19.22405+00
65e8b991-09ac-4663-bcfa-bff63b92e76e	02cfd1a3-7a97-4187-914c-55fee83f380e	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:39:37.653869+00	2026-01-30 02:39:37.653869+00
b201ee3b-81df-42ef-82d8-96f30ebc74bb	02cfd1a3-7a97-4187-914c-55fee83f380e	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:39:37.653869+00	2026-01-30 02:39:37.653869+00
e9a906ee-9d9d-429f-80df-74d931b18f3c	3c17630a-da96-42da-8147-6a8544202429	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:40:07.637041+00	2026-01-30 02:40:07.637041+00
7c4bdabb-0519-400f-9125-94b6037c0e71	3c17630a-da96-42da-8147-6a8544202429	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-01-30 02:40:07.637041+00	2026-01-30 02:40:07.637041+00
c2d0e73b-6ac6-4b8a-99ff-38d0a89d0589	3c17630a-da96-42da-8147-6a8544202429	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:40:07.637041+00	2026-01-30 02:40:07.637041+00
73cdf4be-9794-41a0-937a-f40388b4892e	3c17630a-da96-42da-8147-6a8544202429	10114bd1-51e1-4719-9149-309c86e2a079	2026-01-30 02:40:07.637041+00	2026-01-30 02:40:07.637041+00
48de3bdf-2ae2-4138-9e99-c686e4c0eeb3	6845e494-d1b9-40ae-b36f-2cdb09291747	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:41:15.492358+00	2026-01-30 02:41:15.492358+00
1a7c14b9-e5c5-4569-8d68-aaba04fe3ed9	6845e494-d1b9-40ae-b36f-2cdb09291747	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:41:15.492358+00	2026-01-30 02:41:15.492358+00
418b4f19-8bad-4a34-8ea8-c3b2438bc942	6845e494-d1b9-40ae-b36f-2cdb09291747	10114bd1-51e1-4719-9149-309c86e2a079	2026-01-30 02:41:15.492358+00	2026-01-30 02:41:15.492358+00
8d7f6536-0fcd-41bf-95c5-bfd8d9745cb8	0607714e-e265-4ed1-a36f-39cedd66f10f	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:41:40.663792+00	2026-01-30 02:41:40.663792+00
5c768ab0-7d10-41dc-9e12-00a9314ad159	0607714e-e265-4ed1-a36f-39cedd66f10f	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:41:40.663792+00	2026-01-30 02:41:40.663792+00
a23f55ac-51ca-431d-9625-9be263be8ce7	0607714e-e265-4ed1-a36f-39cedd66f10f	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-01-30 02:41:40.663792+00	2026-01-30 02:41:40.663792+00
d6fa6d0f-ba23-4578-a38e-8f0c56b3c9a5	50ee08d4-15aa-406a-98c5-d2b26ce1a83b	10114bd1-51e1-4719-9149-309c86e2a079	2026-01-30 02:43:17.626929+00	2026-01-30 02:43:17.626929+00
314233ab-63da-4b87-9de7-92cfbd172c6c	50ee08d4-15aa-406a-98c5-d2b26ce1a83b	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:43:17.626929+00	2026-01-30 02:43:17.626929+00
42fa2e0f-0605-419e-8638-4cc0e4787197	50ee08d4-15aa-406a-98c5-d2b26ce1a83b	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:43:17.626929+00	2026-01-30 02:43:17.626929+00
a704bd14-8cb0-4c89-917c-0e3616005125	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	b5a3a01b-77f5-447a-aeee-096edfdd36f5	2026-01-30 02:44:22.464324+00	2026-01-30 02:44:22.464324+00
3986cd84-34fa-4310-9074-1428e664020d	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-01-30 02:44:22.464324+00	2026-01-30 02:44:22.464324+00
3a7a48cf-3077-4286-af80-b4270216993c	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:44:22.464324+00	2026-01-30 02:44:22.464324+00
6457d2ed-642c-4e00-9ed2-c8be83b6a78e	6cd0ecee-eb79-463b-84a8-9932c54c7cc2	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:44:42.964016+00	2026-01-30 02:44:42.964016+00
7eafcce9-346e-4ff9-a0a0-52d7af7dbd78	6cd0ecee-eb79-463b-84a8-9932c54c7cc2	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:44:42.964016+00	2026-01-30 02:44:42.964016+00
b5e5a2bd-01e6-411d-b22f-bc4624c5ee2a	0eef4c99-11d9-420c-a012-b9defe3d5bb6	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-01-30 02:45:12.706251+00	2026-01-30 02:45:12.706251+00
cedb9f23-e3d1-4b62-8636-bdfc309b5d17	0eef4c99-11d9-420c-a012-b9defe3d5bb6	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:45:12.706251+00	2026-01-30 02:45:12.706251+00
c321424c-5ce6-42ba-b5ef-ed94a221fe90	0eef4c99-11d9-420c-a012-b9defe3d5bb6	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:45:12.706251+00	2026-01-30 02:45:12.706251+00
ae1bcbec-0fce-4fac-ab17-39e0545076fb	c28a1e2b-b90e-44cb-95c7-4369e21d15c3	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:45:27.388948+00	2026-01-30 02:45:27.388948+00
cb33c4aa-d19c-4380-b93b-d79dab56cdf3	6267364c-d995-471f-bd07-ef118ad65d71	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:45:42.839075+00	2026-01-30 02:45:42.839075+00
46f5d6ad-746c-4174-b712-7ebb365332cb	6267364c-d995-471f-bd07-ef118ad65d71	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:45:42.839075+00	2026-01-30 02:45:42.839075+00
25f17d08-5e9c-4b21-ab75-b1a504d97238	fa3da8df-1bc3-43fb-be3f-25bbfdf3113b	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:45:59.674406+00	2026-01-30 02:45:59.674406+00
2a5bba9f-4f13-494d-8fd7-29e67c473c99	fa3da8df-1bc3-43fb-be3f-25bbfdf3113b	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:45:59.674406+00	2026-01-30 02:45:59.674406+00
b2012e7f-e6d0-4e6e-95cb-c9eca912825f	5a3dc6e5-c7d4-467b-aa3f-673312685b82	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:46:19.340244+00	2026-01-30 02:46:19.340244+00
fc0c536c-990c-44f5-a6cd-26cb61cc9983	5a3dc6e5-c7d4-467b-aa3f-673312685b82	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-01-30 02:46:19.340244+00	2026-01-30 02:46:19.340244+00
cf40d513-3578-4814-bac3-90eba5f4b187	5a3dc6e5-c7d4-467b-aa3f-673312685b82	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:46:19.340244+00	2026-01-30 02:46:19.340244+00
1b57ca65-0dcd-4b5a-bf4b-7d5d00ebfd53	b5b30517-5c9c-4036-afd9-4e2948651238	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-01-30 02:46:34.644098+00	2026-01-30 02:46:34.644098+00
9d53b083-769c-4726-8c75-bdcda0ba9c45	b5b30517-5c9c-4036-afd9-4e2948651238	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:46:34.644098+00	2026-01-30 02:46:34.644098+00
8ca209e7-cc44-4c63-a44f-16f2d3635d1a	732a44be-0c38-4334-8897-63e49094c6e5	75f7b60f-bb13-40ff-a066-b72cf82dacc1	2026-01-30 02:47:09.310041+00	2026-01-30 02:47:09.310041+00
c68ce596-099e-436a-b51d-fd723162281a	94025b61-6607-4f2f-b2b4-f4567f14f0b8	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:47:53.455953+00	2026-01-30 02:47:53.455953+00
07a47b1a-c75a-4542-8f0f-fd19bfdf8422	94025b61-6607-4f2f-b2b4-f4567f14f0b8	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:47:53.455953+00	2026-01-30 02:47:53.455953+00
\.


--
-- TOC entry 3648 (class 0 OID 49152)
-- Dependencies: 230
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, email, password_hash, display_name, first_name, last_name, department, is_active, created_at, updated_at) FROM stdin;
50ee08d4-15aa-406a-98c5-d2b26ce1a83b	giangngtv.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Thị Vân Giang	Giang	Nguyễn Thị Vân	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:43:17.538432+00
6cd0ecee-eb79-463b-84a8-9932c54c7cc2	dungna.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Ngô Ánh Dung	Dung	Ngô Ánh	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:44:42.873092+00
5a3dc6e5-c7d4-467b-aa3f-673312685b82	chauvm.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Vũ Minh Châu	Châu	Vũ Minh	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:46:19.251409+00
88d7b1cf-5818-4202-aa28-a36912e3c3ed	admin@kdpd.local	$2b$10$Qw2yKYN4QZOOKU5LRpQABOGbTB1RKc0FGM9QoUNmgdnhQXPK2KWMO	admin	Admin	KDPD	Ban Thư ký	t	2026-01-28 11:19:24.186555+00	2026-01-28 11:19:24.186555+00
99434b30-4982-48e9-8c81-b3466309537e	ngochant.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Ngọc Hà	Hà	Nguyễn Ngọc	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-29 11:02:45.534957+00
9f59f810-2c2a-4242-b56c-77d4bdf73391	anhtm@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Trần Minh Ánh	Ánh	Trần Minh	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-29 11:04:54.438651+00
52fa58ae-5f0a-4687-9d47-b0e5d3a210d3	hadv@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Dương Văn Hà	Hà	Dương Văn	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:36:29.812184+00
916316a5-f8b2-4d03-a046-ba00c22e727f	duongvanha.nhanvan@gmail.com	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Dương Văn Hà	Hà	Dương Văn	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:36:49.117693+00
a45f4e87-1449-4cd3-a32c-9b16b315b1f7	nghiemdung.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nghiêm Thuỳ Dung	Dung	Nghiêm Thuỳ	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:38:53.412502+00
6845e494-d1b9-40ae-b36f-2cdb09291747	linhntt.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Thị Thuỳ Linh	Linh	Nguyễn Thị Thuỳ	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:41:15.38138+00
0607714e-e265-4ed1-a36f-39cedd66f10f	tienntt.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Thị Thuỷ Tiên	Tiên	Nguyễn Thị Thuỷ	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:41:40.55455+00
0eef4c99-11d9-420c-a012-b9defe3d5bb6	ngatt.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Trần Thanh Ngà	Ngà	Trần Thanh	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:45:12.596188+00
c28a1e2b-b90e-44cb-95c7-4369e21d15c3	tankhai283@gmail.com	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Trần Tấn Khải	Khải	Trần Tấn	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:45:27.281026+00
6267364c-d995-471f-bd07-ef118ad65d71	quyentt.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Trần Tất Quyến	Quyến	Trần Tất	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:45:42.739888+00
fa3da8df-1bc3-43fb-be3f-25bbfdf3113b	votuoanh.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Võ Thị Tú Oanh	Oanh	Võ Thị Tú	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:45:59.55794+00
b5b30517-5c9c-4036-afd9-4e2948651238	hoangvq.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Vũ Quốc Hoàng	Hoàng	Vũ Quốc	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:46:34.544052+00
732a44be-0c38-4334-8897-63e49094c6e5	vuhuongvtnt@gmail.com	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Vũ Thị Hương	Hương	Vũ Thị	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:47:09.2201+00
94025b61-6607-4f2f-b2b4-f4567f14f0b8	thaodp.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Đào Phương Thảo	Thảo	Đào Phương	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:47:53.346903+00
11817e25-7e55-4b0d-82ef-9ff26de11efa	thanhctk.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Cung Thị Kim Thành	Thành	Cung Thị Kim	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-29 10:44:23.872824+00
e0f74135-4578-4c1c-9944-55f17046607b	nguyendh.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Dương Hương Nguyên	Nguyên	Dương Hương	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:36:09.507806+00
79a84794-8a33-4b27-ab86-e2ce152e46da	hieuhn@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Hoàng Ngọc Hiếu	Hiếu	Hoàng Ngọc	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:37:18.920291+00
46be9276-294e-49a5-8d43-6d45b7b3fa3a	nhungkp.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Kiều Phương Nhung	Nhung	Kiều Phương	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:37:36.64554+00
ccedb4bb-b523-4a4e-a628-ccdcdb1cdef2	hoailtm@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Lê Thị Minh Hoài	Hoài	Lê Thị Minh	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:38:07.751716+00
19c6c15c-c249-4410-9c37-2f19ca885bee	sonld@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Lê Đình Sơn	Sơn	Lê Đình	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:38:31.951195+00
e177e33b-2720-4a23-ac89-a8a4c93857b3	maint.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nghiêm Thị Mai	Mai	Nghiêm Thị	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:39:19.11459+00
02cfd1a3-7a97-4187-914c-55fee83f380e	thinc@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Cẩm Thi	Thi	Nguyễn Cẩm	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:39:37.566863+00
3c17630a-da96-42da-8147-6a8544202429	trangnl.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Linh Trang	Trang	Nguyễn Linh	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:40:07.518056+00
f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	vinhnv.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Viết Vinh	Vinh	Nguyễn Viết	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:44:22.376297+00
219965d8-1855-461e-81ba-5264e8405e3a	haiyenle.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Lê Thị Hải Yến	Yến	Lê Thị Hải	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:37:52.742916+00
\.


--
-- TOC entry 3661 (class 0 OID 65536)
-- Dependencies: 243
-- Data for Name: works; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.works (id, stage, title_vi, title_hannom, document_code, base_word_count, base_page_count, estimate_factor, estimate_word_count, estimate_page_count, note, created_at, component_id) FROM stdin;
f0c8aa8c-637d-4ab9-a61e-5c9df45408c4	1	Tạp A hàm kinh	雜阿含經	T0099	590385	1687	1.5	885578	2530	\N	2026-01-30 08:38:05.904158+00	58786d42-3079-4d1e-b2f7-b160208c2293
\.


--
-- TOC entry 3457 (class 2606 OID 65602)
-- Name: components components_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.components
    ADD CONSTRAINT components_code_key UNIQUE (code);


--
-- TOC entry 3459 (class 2606 OID 65600)
-- Name: components components_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.components
    ADD CONSTRAINT components_pkey PRIMARY KEY (id);


--
-- TOC entry 3402 (class 2606 OID 57384)
-- Name: contract_members contract_members_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contract_members
    ADD CONSTRAINT contract_members_pkey PRIMARY KEY (id);


--
-- TOC entry 3404 (class 2606 OID 57386)
-- Name: contract_members contract_members_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contract_members
    ADD CONSTRAINT contract_members_unique UNIQUE (contract_id, user_id);


--
-- TOC entry 3463 (class 2606 OID 65614)
-- Name: contract_stages contract_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contract_stages
    ADD CONSTRAINT contract_stages_pkey PRIMARY KEY (id);


--
-- TOC entry 3374 (class 2606 OID 49175)
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 3414 (class 2606 OID 57436)
-- Name: document_contracts document_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_contracts
    ADD CONSTRAINT document_contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 3416 (class 2606 OID 57438)
-- Name: document_contracts document_contracts_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_contracts
    ADD CONSTRAINT document_contracts_unique UNIQUE (document_id, contract_id);


--
-- TOC entry 3408 (class 2606 OID 57411)
-- Name: document_tasks document_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_tasks
    ADD CONSTRAINT document_tasks_pkey PRIMARY KEY (id);


--
-- TOC entry 3410 (class 2606 OID 57413)
-- Name: document_tasks document_tasks_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_tasks
    ADD CONSTRAINT document_tasks_unique UNIQUE (document_id, task_id);


--
-- TOC entry 3386 (class 2606 OID 49205)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 3420 (class 2606 OID 57467)
-- Name: groups groups_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_code_unique UNIQUE (code);


--
-- TOC entry 3422 (class 2606 OID 57465)
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- TOC entry 3455 (class 2606 OID 65569)
-- Name: proofreading_contracts proofreading_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.proofreading_contracts
    ADD CONSTRAINT proofreading_contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 3432 (class 2606 OID 57504)
-- Name: roles roles_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_code_unique UNIQUE (code);


--
-- TOC entry 3434 (class 2606 OID 57502)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3392 (class 2606 OID 49244)
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- TOC entry 3398 (class 2606 OID 57357)
-- Name: task_assignments task_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 3400 (class 2606 OID 57359)
-- Name: task_assignments task_assignments_unique_assignment; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_unique_assignment UNIQUE (task_id, user_id, stage_type, round_number);


--
-- TOC entry 3384 (class 2606 OID 49185)
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- TOC entry 3450 (class 2606 OID 65554)
-- Name: translation_contracts translation_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.translation_contracts
    ADD CONSTRAINT translation_contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 3427 (class 2606 OID 57477)
-- Name: user_groups user_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_pkey PRIMARY KEY (id);


--
-- TOC entry 3429 (class 2606 OID 57479)
-- Name: user_groups user_groups_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_unique UNIQUE (user_id, group_id);


--
-- TOC entry 3438 (class 2606 OID 57514)
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3440 (class 2606 OID 57516)
-- Name: user_roles user_roles_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_unique UNIQUE (user_id, role_id);


--
-- TOC entry 3370 (class 2606 OID 49165)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3372 (class 2606 OID 49163)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3445 (class 2606 OID 65544)
-- Name: works works_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.works
    ADD CONSTRAINT works_pkey PRIMARY KEY (id);


--
-- TOC entry 3390 (class 1259 OID 49245)
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- TOC entry 3460 (class 1259 OID 65603)
-- Name: idx_components_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_components_code ON public.components USING btree (code);


--
-- TOC entry 3461 (class 1259 OID 65604)
-- Name: idx_components_display_order; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_components_display_order ON public.components USING btree (display_order);


--
-- TOC entry 3405 (class 1259 OID 57397)
-- Name: idx_contract_members_contract_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_contract_members_contract_id ON public.contract_members USING btree (contract_id);


--
-- TOC entry 3406 (class 1259 OID 57398)
-- Name: idx_contract_members_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_contract_members_user_id ON public.contract_members USING btree (user_id);


--
-- TOC entry 3464 (class 1259 OID 65626)
-- Name: idx_contract_stages_proofreading; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_contract_stages_proofreading ON public.contract_stages USING btree (proofreading_contract_id) WHERE (proofreading_contract_id IS NOT NULL);


--
-- TOC entry 3465 (class 1259 OID 65625)
-- Name: idx_contract_stages_translation; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_contract_stages_translation ON public.contract_stages USING btree (translation_contract_id) WHERE (translation_contract_id IS NOT NULL);


--
-- TOC entry 3375 (class 1259 OID 49225)
-- Name: idx_contracts_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_contracts_status ON public.contracts USING btree (status);


--
-- TOC entry 3376 (class 1259 OID 49224)
-- Name: idx_contracts_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_contracts_type ON public.contracts USING btree (type);


--
-- TOC entry 3417 (class 1259 OID 57450)
-- Name: idx_document_contracts_contract_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_document_contracts_contract_id ON public.document_contracts USING btree (contract_id);


--
-- TOC entry 3418 (class 1259 OID 57449)
-- Name: idx_document_contracts_document_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_document_contracts_document_id ON public.document_contracts USING btree (document_id);


--
-- TOC entry 3411 (class 1259 OID 57424)
-- Name: idx_document_tasks_document_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_document_tasks_document_id ON public.document_tasks USING btree (document_id);


--
-- TOC entry 3412 (class 1259 OID 57425)
-- Name: idx_document_tasks_task_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_document_tasks_task_id ON public.document_tasks USING btree (task_id);


--
-- TOC entry 3387 (class 1259 OID 49230)
-- Name: idx_documents_contract_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documents_contract_id ON public.documents USING btree (contract_id) WHERE (contract_id IS NOT NULL);


--
-- TOC entry 3388 (class 1259 OID 49231)
-- Name: idx_documents_task_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documents_task_id ON public.documents USING btree (task_id) WHERE (task_id IS NOT NULL);


--
-- TOC entry 3389 (class 1259 OID 49232)
-- Name: idx_documents_uploaded_by; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documents_uploaded_by ON public.documents USING btree (uploaded_by) WHERE (uploaded_by IS NOT NULL);


--
-- TOC entry 3423 (class 1259 OID 57468)
-- Name: idx_groups_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_groups_code ON public.groups USING btree (code);


--
-- TOC entry 3451 (class 1259 OID 65644)
-- Name: idx_proofreading_contracts_component_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_proofreading_contracts_component_id ON public.proofreading_contracts USING btree (component_id) WHERE (component_id IS NOT NULL);


--
-- TOC entry 3452 (class 1259 OID 65581)
-- Name: idx_proofreading_contracts_translation_contract_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_proofreading_contracts_translation_contract_id ON public.proofreading_contracts USING btree (translation_contract_id);


--
-- TOC entry 3453 (class 1259 OID 65580)
-- Name: idx_proofreading_contracts_work_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_proofreading_contracts_work_id ON public.proofreading_contracts USING btree (work_id);


--
-- TOC entry 3430 (class 1259 OID 57505)
-- Name: idx_roles_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_roles_code ON public.roles USING btree (code);


--
-- TOC entry 3393 (class 1259 OID 57372)
-- Name: idx_task_assignments_due_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_task_assignments_due_date ON public.task_assignments USING btree (due_date) WHERE (due_date IS NOT NULL);


--
-- TOC entry 3394 (class 1259 OID 57373)
-- Name: idx_task_assignments_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_task_assignments_status ON public.task_assignments USING btree (status);


--
-- TOC entry 3395 (class 1259 OID 57370)
-- Name: idx_task_assignments_task_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_task_assignments_task_id ON public.task_assignments USING btree (task_id);


--
-- TOC entry 3396 (class 1259 OID 57371)
-- Name: idx_task_assignments_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_task_assignments_user_id ON public.task_assignments USING btree (user_id);


--
-- TOC entry 3377 (class 1259 OID 49229)
-- Name: idx_tasks_contract_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tasks_contract_id ON public.tasks USING btree (contract_id) WHERE (contract_id IS NOT NULL);


--
-- TOC entry 3378 (class 1259 OID 49227)
-- Name: idx_tasks_group; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tasks_group ON public.tasks USING btree ("group");


--
-- TOC entry 3379 (class 1259 OID 65589)
-- Name: idx_tasks_related_contract; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tasks_related_contract ON public.tasks USING btree (related_contract_id) WHERE (related_contract_id IS NOT NULL);


--
-- TOC entry 3380 (class 1259 OID 65588)
-- Name: idx_tasks_related_work; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tasks_related_work ON public.tasks USING btree (related_work_id) WHERE (related_work_id IS NOT NULL);


--
-- TOC entry 3381 (class 1259 OID 49228)
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- TOC entry 3382 (class 1259 OID 65590)
-- Name: idx_tasks_task_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tasks_task_type ON public.tasks USING btree (task_type) WHERE (task_type IS NOT NULL);


--
-- TOC entry 3446 (class 1259 OID 65643)
-- Name: idx_translation_contracts_component_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_translation_contracts_component_id ON public.translation_contracts USING btree (component_id) WHERE (component_id IS NOT NULL);


--
-- TOC entry 3447 (class 1259 OID 65561)
-- Name: idx_translation_contracts_contract_number; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_translation_contracts_contract_number ON public.translation_contracts USING btree (contract_number) WHERE (contract_number IS NOT NULL);


--
-- TOC entry 3448 (class 1259 OID 65560)
-- Name: idx_translation_contracts_work_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_translation_contracts_work_id ON public.translation_contracts USING btree (work_id);


--
-- TOC entry 3424 (class 1259 OID 57491)
-- Name: idx_user_groups_group_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_groups_group_id ON public.user_groups USING btree (group_id);


--
-- TOC entry 3425 (class 1259 OID 57490)
-- Name: idx_user_groups_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_groups_user_id ON public.user_groups USING btree (user_id);


--
-- TOC entry 3435 (class 1259 OID 57528)
-- Name: idx_user_roles_role_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_roles_role_id ON public.user_roles USING btree (role_id);


--
-- TOC entry 3436 (class 1259 OID 57527)
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- TOC entry 3368 (class 1259 OID 49221)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 3441 (class 1259 OID 65642)
-- Name: idx_works_component_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_works_component_id ON public.works USING btree (component_id) WHERE (component_id IS NOT NULL);


--
-- TOC entry 3442 (class 1259 OID 65546)
-- Name: idx_works_document_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_works_document_code ON public.works USING btree (document_code) WHERE (document_code IS NOT NULL);


--
-- TOC entry 3443 (class 1259 OID 65545)
-- Name: idx_works_stage; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_works_stage ON public.works USING btree (stage) WHERE (stage IS NOT NULL);


--
-- TOC entry 3496 (class 2620 OID 57531)
-- Name: contract_members contract_members_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER contract_members_updated_at BEFORE UPDATE ON public.contract_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3492 (class 2620 OID 49234)
-- Name: contracts contracts_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3498 (class 2620 OID 57533)
-- Name: document_contracts document_contracts_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER document_contracts_updated_at BEFORE UPDATE ON public.document_contracts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3497 (class 2620 OID 57532)
-- Name: document_tasks document_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER document_tasks_updated_at BEFORE UPDATE ON public.document_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3494 (class 2620 OID 49236)
-- Name: documents documents_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3499 (class 2620 OID 57534)
-- Name: groups groups_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3501 (class 2620 OID 57536)
-- Name: roles roles_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3495 (class 2620 OID 57530)
-- Name: task_assignments task_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER task_assignments_updated_at BEFORE UPDATE ON public.task_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3493 (class 2620 OID 49235)
-- Name: tasks tasks_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3500 (class 2620 OID 57535)
-- Name: user_groups user_groups_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER user_groups_updated_at BEFORE UPDATE ON public.user_groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3502 (class 2620 OID 57537)
-- Name: user_roles user_roles_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3491 (class 2620 OID 49233)
-- Name: users users_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3473 (class 2606 OID 57387)
-- Name: contract_members contract_members_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contract_members
    ADD CONSTRAINT contract_members_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- TOC entry 3474 (class 2606 OID 57392)
-- Name: contract_members contract_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contract_members
    ADD CONSTRAINT contract_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3489 (class 2606 OID 65620)
-- Name: contract_stages contract_stages_proofreading_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contract_stages
    ADD CONSTRAINT contract_stages_proofreading_contract_id_fkey FOREIGN KEY (proofreading_contract_id) REFERENCES public.proofreading_contracts(id) ON DELETE CASCADE;


--
-- TOC entry 3490 (class 2606 OID 65615)
-- Name: contract_stages contract_stages_translation_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contract_stages
    ADD CONSTRAINT contract_stages_translation_contract_id_fkey FOREIGN KEY (translation_contract_id) REFERENCES public.translation_contracts(id) ON DELETE CASCADE;


--
-- TOC entry 3477 (class 2606 OID 57444)
-- Name: document_contracts document_contracts_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_contracts
    ADD CONSTRAINT document_contracts_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- TOC entry 3478 (class 2606 OID 57439)
-- Name: document_contracts document_contracts_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_contracts
    ADD CONSTRAINT document_contracts_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- TOC entry 3475 (class 2606 OID 57414)
-- Name: document_tasks document_tasks_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_tasks
    ADD CONSTRAINT document_tasks_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- TOC entry 3476 (class 2606 OID 57419)
-- Name: document_tasks document_tasks_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_tasks
    ADD CONSTRAINT document_tasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- TOC entry 3468 (class 2606 OID 49206)
-- Name: documents documents_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;


--
-- TOC entry 3469 (class 2606 OID 49211)
-- Name: documents documents_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- TOC entry 3470 (class 2606 OID 49216)
-- Name: documents documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3486 (class 2606 OID 65637)
-- Name: proofreading_contracts proofreading_contracts_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.proofreading_contracts
    ADD CONSTRAINT proofreading_contracts_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.components(id);


--
-- TOC entry 3487 (class 2606 OID 65575)
-- Name: proofreading_contracts proofreading_contracts_translation_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.proofreading_contracts
    ADD CONSTRAINT proofreading_contracts_translation_contract_id_fkey FOREIGN KEY (translation_contract_id) REFERENCES public.translation_contracts(id);


--
-- TOC entry 3488 (class 2606 OID 65570)
-- Name: proofreading_contracts proofreading_contracts_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.proofreading_contracts
    ADD CONSTRAINT proofreading_contracts_work_id_fkey FOREIGN KEY (work_id) REFERENCES public.works(id);


--
-- TOC entry 3471 (class 2606 OID 57360)
-- Name: task_assignments task_assignments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- TOC entry 3472 (class 2606 OID 57365)
-- Name: task_assignments task_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3466 (class 2606 OID 49191)
-- Name: tasks tasks_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;


--
-- TOC entry 3467 (class 2606 OID 65583)
-- Name: tasks tasks_related_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_related_work_id_fkey FOREIGN KEY (related_work_id) REFERENCES public.works(id);


--
-- TOC entry 3484 (class 2606 OID 65632)
-- Name: translation_contracts translation_contracts_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.translation_contracts
    ADD CONSTRAINT translation_contracts_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.components(id);


--
-- TOC entry 3485 (class 2606 OID 65555)
-- Name: translation_contracts translation_contracts_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.translation_contracts
    ADD CONSTRAINT translation_contracts_work_id_fkey FOREIGN KEY (work_id) REFERENCES public.works(id);


--
-- TOC entry 3479 (class 2606 OID 57485)
-- Name: user_groups user_groups_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- TOC entry 3480 (class 2606 OID 57480)
-- Name: user_groups user_groups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3481 (class 2606 OID 57522)
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 3482 (class 2606 OID 57517)
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3483 (class 2606 OID 65627)
-- Name: works works_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.works
    ADD CONSTRAINT works_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.components(id);


--
-- TOC entry 2151 (class 826 OID 16394)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- TOC entry 2150 (class 826 OID 16393)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


-- Completed on 2026-01-30 17:47:42

--
-- PostgreSQL database dump complete
--

\unrestrict CuXedRbOPh91p359ATL80x9aeH4HSyMf2xwRU4RYbEwHvkcn76Xv4pxb1jjxo3g

