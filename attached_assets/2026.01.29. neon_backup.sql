--
-- PostgreSQL database dump
--

\restrict bRwdrTBpML0egFntT5FQFadvZ7gYVZSoxoEt7QrOO4fOqRKDNh95Bx8QKdub6Ah

-- Dumped from database version 17.7 (bdd1736)
-- Dumped by pg_dump version 17.7

-- Started on 2026-01-29 17:49:15

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
-- TOC entry 3601 (class 0 OID 0)
-- Dependencies: 7
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 250 (class 1255 OID 24657)
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
-- TOC entry 3602 (class 0 OID 0)
-- Dependencies: 236
-- Name: TABLE contract_members; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.contract_members IS 'Bảng trung gian contracts-users: ai phụ trách / tham gia hợp đồng.';


--
-- TOC entry 3603 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN contract_members.role; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.contract_members.role IS 'Ví dụ: phụ_trách_chính, tham_gia.';


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
-- TOC entry 3604 (class 0 OID 0)
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
-- TOC entry 3605 (class 0 OID 0)
-- Dependencies: 238
-- Name: TABLE document_contracts; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.document_contracts IS 'Bảng trung gian documents-contracts: 1 tài liệu gắn nhiều hợp đồng.';


--
-- TOC entry 3606 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN document_contracts.role; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.document_contracts.role IS 'Vai trò của tài liệu với hợp đồng (vd: phụ lục, biên bản).';


--
-- TOC entry 3607 (class 0 OID 0)
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
-- TOC entry 3608 (class 0 OID 0)
-- Dependencies: 237
-- Name: TABLE document_tasks; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.document_tasks IS 'Bảng trung gian documents-tasks: 1 tài liệu gắn nhiều tasks.';


--
-- TOC entry 3609 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN document_tasks.role; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.document_tasks.role IS 'Vai trò của tài liệu với task (vd: bản thảo, biên bản).';


--
-- TOC entry 3610 (class 0 OID 0)
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
-- TOC entry 3611 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE documents; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.documents IS 'Hồ sơ giấy tờ (file/dossier); gắn contract_id hoặc task_id hoặc đứng riêng.';


--
-- TOC entry 3612 (class 0 OID 0)
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
-- TOC entry 3613 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE groups; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.groups IS 'Nhóm công việc / nhóm nhân sự. 1 nhân sự có thể thuộc nhiều nhóm (user_groups).';


--
-- TOC entry 3614 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN groups.code; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.groups.code IS 'Mã ổn định: bien_tap, thu_ky_hop_phan, cv_chung, thiet_ke_cntt, quet_trung_lap.';


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
-- TOC entry 3615 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.roles IS 'Vai trò phân quyền. 1 nhân sự có thể có nhiều vai trò (user_roles). Dùng cho quyền xem/sửa task.';


--
-- TOC entry 3616 (class 0 OID 0)
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
-- TOC entry 3617 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE task_assignments; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.task_assignments IS 'Bảng trung gian users-tasks: 1 task nhiều nhân sự, mỗi lần giao có ngày nhận / ngày hoàn thành dự kiến / ngày hoàn thành thực tế.';


--
-- TOC entry 3618 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN task_assignments.stage_type; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.task_assignments.stage_type IS 'primary | btv1 | btv2 | doc_duyet (primary = gán việc đơn từ tasks.assignee_id cũ).';


--
-- TOC entry 3619 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN task_assignments.received_at; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.task_assignments.received_at IS 'Ngày nhận công việc.';


--
-- TOC entry 3620 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN task_assignments.due_date; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.task_assignments.due_date IS 'Ngày hoàn thành dự kiến.';


--
-- TOC entry 3621 (class 0 OID 0)
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tasks OWNER TO neondb_owner;

--
-- TOC entry 3622 (class 0 OID 0)
-- Dependencies: 232
-- Name: TABLE tasks; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.tasks IS 'Công việc (chỉ thông tin task-level). Người giao, ngày nhận/hoàn thành: bảng task_assignments.';


--
-- TOC entry 3623 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN tasks."group"; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.tasks."group" IS 'Nhóm CV: CV chung, Biên tập, Thiết kế + CNTT, Quét trùng lặp';


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
-- TOC entry 3624 (class 0 OID 0)
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
-- TOC entry 3625 (class 0 OID 0)
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
    role text,
    employee_group text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_employee_group_check CHECK (((employee_group IS NULL) OR (employee_group = ANY (ARRAY['thong_thuong'::text, 'thu_ky_hop_phan'::text, 'bien_tap'::text]))))
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- TOC entry 3626 (class 0 OID 0)
-- Dependencies: 230
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.users IS 'Nhân sự - đồng bộ từ Google Contacts; role: Admin/Manager/Employee; employee_group cho Employee.';


--
-- TOC entry 3627 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN users.department; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.users.department IS 'Đơn vị: 1 nhân sự chỉ thuộc một department (vd: Ban Thư ký).';


--
-- TOC entry 3628 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN users.role; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.users.role IS 'Vai trò chính (tùy chọn, tương thích cũ). Chi tiết nhiều vai trò: bảng user_roles.';


--
-- TOC entry 3629 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN users.employee_group; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.users.employee_group IS 'Nhóm chính (tùy chọn, tương thích cũ). Chi tiết nhiều nhóm: bảng user_groups.';


--
-- TOC entry 3589 (class 0 OID 57375)
-- Dependencies: 236
-- Data for Name: contract_members; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.contract_members (id, contract_id, user_id, role, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3584 (class 0 OID 49166)
-- Dependencies: 231
-- Data for Name: contracts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.contracts (id, code, type, name, party_a, party_b, signed_at, value, status, contract_scope, description, start_date, end_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3591 (class 0 OID 57427)
-- Dependencies: 238
-- Data for Name: document_contracts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.document_contracts (id, document_id, contract_id, role, note, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3590 (class 0 OID 57402)
-- Dependencies: 237
-- Data for Name: document_tasks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.document_tasks (id, document_id, task_id, role, note, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3586 (class 0 OID 49196)
-- Dependencies: 233
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.documents (id, title, document_type, file_path, storage_key, contract_id, task_id, uploaded_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3592 (class 0 OID 57456)
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
-- TOC entry 3594 (class 0 OID 57493)
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
-- TOC entry 3587 (class 0 OID 49238)
-- Dependencies: 234
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.session (sid, sess, expire) FROM stdin;
yaCw5C1PgGm-7xSqc5X8s8_TwRj2buQZ	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-04T11:57:51.208Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-04 12:42:32
vFi2OqLV_YN2j3V7ZG3BPMrXjWsgIYNO	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-04T15:44:40.034Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-04 15:44:41
pXQIDnIKplH4bh7dc72DfcEA-OKrI5tm	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-05T01:50:21.567Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-05 10:44:25
\.


--
-- TOC entry 3588 (class 0 OID 57344)
-- Dependencies: 235
-- Data for Name: task_assignments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.task_assignments (id, task_id, user_id, stage_type, round_number, received_at, due_date, completed_at, status, progress, notes, created_at, updated_at) FROM stdin;
c87026f3-0e3b-44b6-a24f-2d6b8c69f8af	task-1769675296722-paqwqrv	3c17630a-da96-42da-8147-6a8544202429	btv2	3	2025-12-29	2026-01-02	2026-01-03 00:00:00+00	completed	100	\N	2026-01-29 09:57:54.461313+00	2026-01-29 09:57:54.461313+00
60e329c4-0a46-4546-8895-fab7cffd0e36	task-1769675296722-paqwqrv	219965d8-1855-461e-81ba-5264e8405e3a	btv1	3	2026-01-03	2026-01-09	2026-01-08 00:00:00+00	completed	100	\N	2026-01-29 09:57:54.520056+00	2026-01-29 09:57:54.520056+00
0b0a138d-df52-4257-bd80-6f1c7df3c4cd	task-1769675296722-paqwqrv	732a44be-0c38-4334-8897-63e49094c6e5	doc_duyet	3	2026-01-09	2026-01-18	2026-01-26 00:00:00+00	completed	100	\N	2026-01-29 09:57:54.578629+00	2026-01-29 09:57:54.578629+00
b61629cb-1ea9-4e2b-bcb5-b1fe829a4741	task-1769675173549-5x9i0zv	e0f74135-4578-4c1c-9944-55f17046607b	btv2	1	2025-12-28	2025-12-31	2025-12-31 00:00:00+00	completed	100	\N	2026-01-29 10:04:21.181396+00	2026-01-29 10:04:21.181396+00
d5b44631-575d-4dc7-9e38-508c56c6556e	task-1769675173549-5x9i0zv	11817e25-7e55-4b0d-82ef-9ff26de11efa	btv1	1	2026-01-01	2026-01-05	2026-01-05 00:00:00+00	completed	100	\N	2026-01-29 10:04:21.240042+00	2026-01-29 10:04:21.240042+00
1a437bdc-65b3-434b-b731-da7461e50677	task-1769675173549-5x9i0zv	732a44be-0c38-4334-8897-63e49094c6e5	doc_duyet	1	2026-01-05	2026-01-10	2026-01-15 00:00:00+00	completed	100	\N	2026-01-29 10:04:21.29817+00	2026-01-29 10:04:21.29817+00
\.


--
-- TOC entry 3585 (class 0 OID 49176)
-- Dependencies: 232
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.tasks (id, title, description, "group", status, priority, progress, notes, workflow, source_sheet_id, source_sheet_name, contract_id, created_at, updated_at) FROM stdin;
task-1769675296722-paqwqrv	Test tạo mới task Biên tập 2	\N	Biên tập	Completed	Medium	100	Test tạo mới task Biên tập 2	"{\\"rounds\\":[{\\"roundNumber\\":1,\\"roundType\\":\\"Bông 3 (tinh)\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"completedDate\\":null,\\"stages\\":[{\\"type\\":\\"btv2\\",\\"assignee\\":\\"Nguyễn Linh Trang\\",\\"status\\":\\"completed\\",\\"startDate\\":\\"2025-12-29\\",\\"dueDate\\":\\"2026-01-02\\",\\"completedDate\\":\\"2026-01-03\\",\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":100},{\\"type\\":\\"btv1\\",\\"assignee\\":\\"Lê Thị Hải Yến\\",\\"status\\":\\"completed\\",\\"startDate\\":\\"2026-01-03\\",\\"dueDate\\":\\"2026-01-09\\",\\"completedDate\\":\\"2026-01-08\\",\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":100},{\\"type\\":\\"doc_duyet\\",\\"assignee\\":\\"Vũ Thị Hương\\",\\"status\\":\\"completed\\",\\"startDate\\":\\"2026-01-09\\",\\"dueDate\\":\\"2026-01-18\\",\\"completedDate\\":\\"2026-01-26\\",\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":100}]}],\\"currentRound\\":1,\\"totalRounds\\":1}"	\N	\N	\N	2026-01-29 08:28:16.722+00	2026-01-29 09:57:54.342339+00
task-1769675173549-5x9i0zv	Test tạo mới task Biên tập 1	\N	Biên tập	Completed	Medium	100	Test tạo mới task Biên tập 1	"{\\"rounds\\":[{\\"roundNumber\\":1,\\"roundType\\":\\"Bông 1 (thô)\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"completedDate\\":null,\\"stages\\":[{\\"type\\":\\"btv2\\",\\"assignee\\":\\"Dương Hương Nguyên\\",\\"status\\":\\"completed\\",\\"startDate\\":\\"2025-12-28\\",\\"dueDate\\":\\"2025-12-31\\",\\"completedDate\\":\\"2025-12-31\\",\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":100},{\\"type\\":\\"btv1\\",\\"assignee\\":\\"Cung Thị Kim Thành\\",\\"status\\":\\"completed\\",\\"startDate\\":\\"2026-01-01\\",\\"dueDate\\":\\"2026-01-05\\",\\"completedDate\\":\\"2026-01-05\\",\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":100},{\\"type\\":\\"doc_duyet\\",\\"assignee\\":\\"Vũ Thị Hương\\",\\"status\\":\\"completed\\",\\"startDate\\":\\"2026-01-05\\",\\"dueDate\\":\\"2026-01-10\\",\\"completedDate\\":\\"2026-01-15\\",\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":100}]}],\\"currentRound\\":1,\\"totalRounds\\":1}"	\N	\N	\N	2026-01-29 08:26:13.549+00	2026-01-29 10:04:21.066601+00
\.


--
-- TOC entry 3593 (class 0 OID 57470)
-- Dependencies: 240
-- Data for Name: user_groups; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_groups (id, user_id, group_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3595 (class 0 OID 57507)
-- Dependencies: 242
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_roles (id, user_id, role_id, created_at, updated_at) FROM stdin;
97fcebd5-1787-4094-81b5-df5534c937e1	88d7b1cf-5818-4202-aa28-a36912e3c3ed	b5a3a01b-77f5-447a-aeee-096edfdd36f5	2026-01-29 05:13:39.635153+00	2026-01-29 05:13:39.635153+00
\.


--
-- TOC entry 3583 (class 0 OID 49152)
-- Dependencies: 230
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, email, password_hash, display_name, first_name, last_name, department, role, employee_group, is_active, created_at, updated_at) FROM stdin;
88d7b1cf-5818-4202-aa28-a36912e3c3ed	admin@kdpd.local	$2b$10$Qw2yKYN4QZOOKU5LRpQABOGbTB1RKc0FGM9QoUNmgdnhQXPK2KWMO	admin	Admin	KDPD	Ban Thư ký	Admin	\N	t	2026-01-28 11:19:24.186555+00	2026-01-28 11:19:24.186555+00
9f59f810-2c2a-4242-b56c-77d4bdf73391	anhtm@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Trần Minh Ánh	Ánh	Trần Minh	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.218548+00
916316a5-f8b2-4d03-a046-ba00c22e727f	duongvanha.nhanvan@gmail.com	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Dương Văn Hà	Hà	Dương Văn	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.217711+00
50ee08d4-15aa-406a-98c5-d2b26ce1a83b	giangngtv.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Thị Vân Giang	Giang	Nguyễn Thị Vân	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.229976+00
99434b30-4982-48e9-8c81-b3466309537e	ngochant.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Ngọc Hà	Hà	Nguyễn Ngọc	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.250024+00
a45f4e87-1449-4cd3-a32c-9b16b315b1f7	nghiemdung.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nghiêm Thuỳ Dung	Dung	Nghiêm Thuỳ	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.261865+00
52fa58ae-5f0a-4687-9d47-b0e5d3a210d3	hadv@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Dương Văn Hà	Hà	Dương Văn	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.281536+00
6cd0ecee-eb79-463b-84a8-9932c54c7cc2	dungna.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Ngô Ánh Dung	Dung	Ngô Ánh	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.298242+00
5a3dc6e5-c7d4-467b-aa3f-673312685b82	chauvm.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Vũ Minh Châu	Châu	Vũ Minh	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.354758+00
3c17630a-da96-42da-8147-6a8544202429	trangnl.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Linh Trang	Trang	Nguyễn Linh	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.230551+00
fa3da8df-1bc3-43fb-be3f-25bbfdf3113b	votuoanh.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Võ Thị Tú Oanh	Oanh	Võ Thị Tú	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.225713+00
6267364c-d995-471f-bd07-ef118ad65d71	quyentt.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Trần Tất Quyến	Quyến	Trần Tất	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.255967+00
02cfd1a3-7a97-4187-914c-55fee83f380e	thinc@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Cẩm Thi	Thi	Nguyễn Cẩm	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.237568+00
0607714e-e265-4ed1-a36f-39cedd66f10f	tienntt.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Thị Thuỷ Tiên	Tiên	Nguyễn Thị Thuỷ	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.27267+00
e177e33b-2720-4a23-ac89-a8a4c93857b3	maint.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nghiêm Thị Mai	Mai	Nghiêm Thị	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.284439+00
b5b30517-5c9c-4036-afd9-4e2948651238	hoangvq.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Vũ Quốc Hoàng	Hoàng	Vũ Quốc	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.304832+00
c28a1e2b-b90e-44cb-95c7-4369e21d15c3	tankhai283@gmail.com	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Trần Tấn Khải	Khải	Trần Tấn	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.310449+00
19c6c15c-c249-4410-9c37-2f19ca885bee	sonld@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Lê Đình Sơn	Sơn	Lê Đình	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.296347+00
e0f74135-4578-4c1c-9944-55f17046607b	nguyendh.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Dương Hương Nguyên	Nguyên	Dương Hương	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.327589+00
79a84794-8a33-4b27-ab86-e2ce152e46da	hieuhn@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Hoàng Ngọc Hiếu	Hiếu	Hoàng Ngọc	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.339988+00
ccedb4bb-b523-4a4e-a628-ccdcdb1cdef2	hoailtm@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Lê Thị Minh Hoài	Hoài	Lê Thị Minh	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.325084+00
0eef4c99-11d9-420c-a012-b9defe3d5bb6	ngatt.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Trần Thanh Ngà	Ngà	Trần Thanh	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.342557+00
6845e494-d1b9-40ae-b36f-2cdb09291747	linhntt.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Thị Thuỳ Linh	Linh	Nguyễn Thị Thuỳ	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.348616+00
46be9276-294e-49a5-8d43-6d45b7b3fa3a	nhungkp.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Kiều Phương Nhung	Nhung	Kiều Phương	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.360751+00
732a44be-0c38-4334-8897-63e49094c6e5	vuhuongvtnt@gmail.com	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Vũ Thị Hương	Hương	Vũ Thị	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.37441+00
11817e25-7e55-4b0d-82ef-9ff26de11efa	thanhctk.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Cung Thị Kim Thành	Thành	Cung Thị Kim	Ban Thư ký	Biên tập viên	bien_tap	t	2026-01-28 11:19:12.44656+00	2026-01-29 10:44:23.872824+00
94025b61-6607-4f2f-b2b4-f4567f14f0b8	thaodp.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Đào Phương Thảo	Thảo	Đào Phương	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.372122+00
219965d8-1855-461e-81ba-5264e8405e3a	haiyenle.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Lê Thị Hải Yến	Yến	Lê Thị Hải	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.266584+00
f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	vinhnv.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Viết Vinh	Vinh	Nguyễn Viết	Ban Thư ký	\N	\N	t	2026-01-28 11:19:12.44656+00	2026-01-28 12:04:05.370429+00
\.


--
-- TOC entry 3371 (class 2606 OID 57384)
-- Name: contract_members contract_members_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contract_members
    ADD CONSTRAINT contract_members_pkey PRIMARY KEY (id);


--
-- TOC entry 3373 (class 2606 OID 57386)
-- Name: contract_members contract_members_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contract_members
    ADD CONSTRAINT contract_members_unique UNIQUE (contract_id, user_id);


--
-- TOC entry 3346 (class 2606 OID 49175)
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 3383 (class 2606 OID 57436)
-- Name: document_contracts document_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_contracts
    ADD CONSTRAINT document_contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 3385 (class 2606 OID 57438)
-- Name: document_contracts document_contracts_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_contracts
    ADD CONSTRAINT document_contracts_unique UNIQUE (document_id, contract_id);


--
-- TOC entry 3377 (class 2606 OID 57411)
-- Name: document_tasks document_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_tasks
    ADD CONSTRAINT document_tasks_pkey PRIMARY KEY (id);


--
-- TOC entry 3379 (class 2606 OID 57413)
-- Name: document_tasks document_tasks_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_tasks
    ADD CONSTRAINT document_tasks_unique UNIQUE (document_id, task_id);


--
-- TOC entry 3355 (class 2606 OID 49205)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 3389 (class 2606 OID 57467)
-- Name: groups groups_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_code_unique UNIQUE (code);


--
-- TOC entry 3391 (class 2606 OID 57465)
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- TOC entry 3401 (class 2606 OID 57504)
-- Name: roles roles_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_code_unique UNIQUE (code);


--
-- TOC entry 3403 (class 2606 OID 57502)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3361 (class 2606 OID 49244)
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- TOC entry 3367 (class 2606 OID 57357)
-- Name: task_assignments task_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 3369 (class 2606 OID 57359)
-- Name: task_assignments task_assignments_unique_assignment; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_unique_assignment UNIQUE (task_id, user_id, stage_type, round_number);


--
-- TOC entry 3353 (class 2606 OID 49185)
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- TOC entry 3396 (class 2606 OID 57477)
-- Name: user_groups user_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_pkey PRIMARY KEY (id);


--
-- TOC entry 3398 (class 2606 OID 57479)
-- Name: user_groups user_groups_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_unique UNIQUE (user_id, group_id);


--
-- TOC entry 3407 (class 2606 OID 57514)
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3409 (class 2606 OID 57516)
-- Name: user_roles user_roles_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_unique UNIQUE (user_id, role_id);


--
-- TOC entry 3342 (class 2606 OID 49165)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3344 (class 2606 OID 49163)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3359 (class 1259 OID 49245)
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- TOC entry 3374 (class 1259 OID 57397)
-- Name: idx_contract_members_contract_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_contract_members_contract_id ON public.contract_members USING btree (contract_id);


--
-- TOC entry 3375 (class 1259 OID 57398)
-- Name: idx_contract_members_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_contract_members_user_id ON public.contract_members USING btree (user_id);


--
-- TOC entry 3347 (class 1259 OID 49225)
-- Name: idx_contracts_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_contracts_status ON public.contracts USING btree (status);


--
-- TOC entry 3348 (class 1259 OID 49224)
-- Name: idx_contracts_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_contracts_type ON public.contracts USING btree (type);


--
-- TOC entry 3386 (class 1259 OID 57450)
-- Name: idx_document_contracts_contract_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_document_contracts_contract_id ON public.document_contracts USING btree (contract_id);


--
-- TOC entry 3387 (class 1259 OID 57449)
-- Name: idx_document_contracts_document_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_document_contracts_document_id ON public.document_contracts USING btree (document_id);


--
-- TOC entry 3380 (class 1259 OID 57424)
-- Name: idx_document_tasks_document_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_document_tasks_document_id ON public.document_tasks USING btree (document_id);


--
-- TOC entry 3381 (class 1259 OID 57425)
-- Name: idx_document_tasks_task_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_document_tasks_task_id ON public.document_tasks USING btree (task_id);


--
-- TOC entry 3356 (class 1259 OID 49230)
-- Name: idx_documents_contract_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documents_contract_id ON public.documents USING btree (contract_id) WHERE (contract_id IS NOT NULL);


--
-- TOC entry 3357 (class 1259 OID 49231)
-- Name: idx_documents_task_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documents_task_id ON public.documents USING btree (task_id) WHERE (task_id IS NOT NULL);


--
-- TOC entry 3358 (class 1259 OID 49232)
-- Name: idx_documents_uploaded_by; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documents_uploaded_by ON public.documents USING btree (uploaded_by) WHERE (uploaded_by IS NOT NULL);


--
-- TOC entry 3392 (class 1259 OID 57468)
-- Name: idx_groups_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_groups_code ON public.groups USING btree (code);


--
-- TOC entry 3399 (class 1259 OID 57505)
-- Name: idx_roles_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_roles_code ON public.roles USING btree (code);


--
-- TOC entry 3362 (class 1259 OID 57372)
-- Name: idx_task_assignments_due_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_task_assignments_due_date ON public.task_assignments USING btree (due_date) WHERE (due_date IS NOT NULL);


--
-- TOC entry 3363 (class 1259 OID 57373)
-- Name: idx_task_assignments_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_task_assignments_status ON public.task_assignments USING btree (status);


--
-- TOC entry 3364 (class 1259 OID 57370)
-- Name: idx_task_assignments_task_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_task_assignments_task_id ON public.task_assignments USING btree (task_id);


--
-- TOC entry 3365 (class 1259 OID 57371)
-- Name: idx_task_assignments_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_task_assignments_user_id ON public.task_assignments USING btree (user_id);


--
-- TOC entry 3349 (class 1259 OID 49229)
-- Name: idx_tasks_contract_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tasks_contract_id ON public.tasks USING btree (contract_id) WHERE (contract_id IS NOT NULL);


--
-- TOC entry 3350 (class 1259 OID 49227)
-- Name: idx_tasks_group; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tasks_group ON public.tasks USING btree ("group");


--
-- TOC entry 3351 (class 1259 OID 49228)
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- TOC entry 3393 (class 1259 OID 57491)
-- Name: idx_user_groups_group_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_groups_group_id ON public.user_groups USING btree (group_id);


--
-- TOC entry 3394 (class 1259 OID 57490)
-- Name: idx_user_groups_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_groups_user_id ON public.user_groups USING btree (user_id);


--
-- TOC entry 3404 (class 1259 OID 57528)
-- Name: idx_user_roles_role_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_roles_role_id ON public.user_roles USING btree (role_id);


--
-- TOC entry 3405 (class 1259 OID 57527)
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- TOC entry 3338 (class 1259 OID 49221)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 3339 (class 1259 OID 49223)
-- Name: idx_users_employee_group; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_employee_group ON public.users USING btree (employee_group) WHERE (employee_group IS NOT NULL);


--
-- TOC entry 3340 (class 1259 OID 49222)
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- TOC entry 3431 (class 2620 OID 57531)
-- Name: contract_members contract_members_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER contract_members_updated_at BEFORE UPDATE ON public.contract_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3427 (class 2620 OID 49234)
-- Name: contracts contracts_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3433 (class 2620 OID 57533)
-- Name: document_contracts document_contracts_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER document_contracts_updated_at BEFORE UPDATE ON public.document_contracts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3432 (class 2620 OID 57532)
-- Name: document_tasks document_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER document_tasks_updated_at BEFORE UPDATE ON public.document_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3429 (class 2620 OID 49236)
-- Name: documents documents_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3434 (class 2620 OID 57534)
-- Name: groups groups_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3436 (class 2620 OID 57536)
-- Name: roles roles_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3430 (class 2620 OID 57530)
-- Name: task_assignments task_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER task_assignments_updated_at BEFORE UPDATE ON public.task_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3428 (class 2620 OID 49235)
-- Name: tasks tasks_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3435 (class 2620 OID 57535)
-- Name: user_groups user_groups_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER user_groups_updated_at BEFORE UPDATE ON public.user_groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3437 (class 2620 OID 57537)
-- Name: user_roles user_roles_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3426 (class 2620 OID 49233)
-- Name: users users_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3416 (class 2606 OID 57387)
-- Name: contract_members contract_members_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contract_members
    ADD CONSTRAINT contract_members_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- TOC entry 3417 (class 2606 OID 57392)
-- Name: contract_members contract_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contract_members
    ADD CONSTRAINT contract_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3420 (class 2606 OID 57444)
-- Name: document_contracts document_contracts_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_contracts
    ADD CONSTRAINT document_contracts_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- TOC entry 3421 (class 2606 OID 57439)
-- Name: document_contracts document_contracts_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_contracts
    ADD CONSTRAINT document_contracts_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- TOC entry 3418 (class 2606 OID 57414)
-- Name: document_tasks document_tasks_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_tasks
    ADD CONSTRAINT document_tasks_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- TOC entry 3419 (class 2606 OID 57419)
-- Name: document_tasks document_tasks_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_tasks
    ADD CONSTRAINT document_tasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- TOC entry 3411 (class 2606 OID 49206)
-- Name: documents documents_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;


--
-- TOC entry 3412 (class 2606 OID 49211)
-- Name: documents documents_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- TOC entry 3413 (class 2606 OID 49216)
-- Name: documents documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3414 (class 2606 OID 57360)
-- Name: task_assignments task_assignments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- TOC entry 3415 (class 2606 OID 57365)
-- Name: task_assignments task_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3410 (class 2606 OID 49191)
-- Name: tasks tasks_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;


--
-- TOC entry 3422 (class 2606 OID 57485)
-- Name: user_groups user_groups_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- TOC entry 3423 (class 2606 OID 57480)
-- Name: user_groups user_groups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3424 (class 2606 OID 57522)
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 3425 (class 2606 OID 57517)
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 2131 (class 826 OID 16394)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- TOC entry 2130 (class 826 OID 16393)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


-- Completed on 2026-01-29 17:49:21

--
-- PostgreSQL database dump complete
--

\unrestrict bRwdrTBpML0egFntT5FQFadvZ7gYVZSoxoEt7QrOO4fOqRKDNh95Bx8QKdub6Ah

