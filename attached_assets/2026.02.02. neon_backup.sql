--
-- PostgreSQL database dump
--

-- Dumped from database version 17.7 (bdd1736)
-- Dumped by pg_dump version 17.7

-- Started on 2026-02-02 16:14:16

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
-- TOC entry 3689 (class 0 OID 0)
-- Dependencies: 7
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 256 (class 1255 OID 24657)
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
-- TOC entry 3690 (class 0 OID 0)
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
-- TOC entry 3691 (class 0 OID 0)
-- Dependencies: 236
-- Name: TABLE contract_members; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.contract_members IS 'Bảng trung gian contracts-users: ai phụ trách / tham gia hợp đồng.';


--
-- TOC entry 3692 (class 0 OID 0)
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
-- TOC entry 3693 (class 0 OID 0)
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
-- TOC entry 3694 (class 0 OID 0)
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
-- TOC entry 3695 (class 0 OID 0)
-- Dependencies: 238
-- Name: TABLE document_contracts; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.document_contracts IS 'Bảng trung gian documents-contracts: 1 tài liệu gắn nhiều hợp đồng.';


--
-- TOC entry 3696 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN document_contracts.role; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.document_contracts.role IS 'Vai trò của tài liệu với hợp đồng (vd: phụ lục, biên bản).';


--
-- TOC entry 3697 (class 0 OID 0)
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
-- TOC entry 3698 (class 0 OID 0)
-- Dependencies: 237
-- Name: TABLE document_tasks; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.document_tasks IS 'Bảng trung gian documents-tasks: 1 tài liệu gắn nhiều tasks.';


--
-- TOC entry 3699 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN document_tasks.role; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.document_tasks.role IS 'Vai trò của tài liệu với task (vd: bản thảo, biên bản).';


--
-- TOC entry 3700 (class 0 OID 0)
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
-- TOC entry 3701 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE documents; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.documents IS 'Hồ sơ giấy tờ (file/dossier); gắn contract_id hoặc task_id hoặc đứng riêng.';


--
-- TOC entry 3702 (class 0 OID 0)
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
-- TOC entry 3703 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE groups; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.groups IS 'Nhóm công việc / nhóm nhân sự. 1 nhân sự có thể thuộc nhiều nhóm (user_groups).';


--
-- TOC entry 3704 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN groups.code; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.groups.code IS 'Mã ổn định: bien_tap, thu_ky_hop_phan, cv_chung, thiet_ke_cntt, quet_trung_lap.';


--
-- TOC entry 248 (class 1259 OID 73736)
-- Name: notifications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    task_id text,
    task_assignment_id uuid,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone
);


ALTER TABLE public.notifications OWNER TO neondb_owner;

--
-- TOC entry 3705 (class 0 OID 0)
-- Dependencies: 248
-- Name: TABLE notifications; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.notifications IS 'Thông báo cho nhân sự: task_assigned, task_due_soon, task_overdue.';


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
-- TOC entry 3706 (class 0 OID 0)
-- Dependencies: 245
-- Name: TABLE proofreading_contracts; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.proofreading_contracts IS 'Hợp đồng hiệu đính (theo dõi hợp đồng hiệu đính).';


--
-- TOC entry 3707 (class 0 OID 0)
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
-- TOC entry 3708 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.roles IS 'Vai trò phân quyền. 1 nhân sự có thể có nhiều vai trò (user_roles). Dùng cho quyền xem/sửa task.';


--
-- TOC entry 3709 (class 0 OID 0)
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
-- TOC entry 3710 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE task_assignments; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.task_assignments IS 'Bảng trung gian users-tasks: 1 task nhiều nhân sự, mỗi lần giao có ngày nhận / ngày hoàn thành dự kiến / ngày hoàn thành thực tế.';


--
-- TOC entry 3711 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN task_assignments.stage_type; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.task_assignments.stage_type IS 'primary | btv1 | btv2 | doc_duyet (primary = gán việc đơn từ tasks.assignee_id cũ).';


--
-- TOC entry 3712 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN task_assignments.received_at; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.task_assignments.received_at IS 'Ngày nhận công việc.';


--
-- TOC entry 3713 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN task_assignments.due_date; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.task_assignments.due_date IS 'Ngày hoàn thành dự kiến.';


--
-- TOC entry 3714 (class 0 OID 0)
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
    related_contract_id uuid,
    vote text
);


ALTER TABLE public.tasks OWNER TO neondb_owner;

--
-- TOC entry 3715 (class 0 OID 0)
-- Dependencies: 232
-- Name: TABLE tasks; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.tasks IS 'Công việc (chỉ thông tin task-level). Người giao, ngày nhận/hoàn thành: bảng task_assignments.';


--
-- TOC entry 3716 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN tasks."group"; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.tasks."group" IS 'Nhóm CV: CV chung, Biên tập, Thiết kế + CNTT, Quét trùng lặp';


--
-- TOC entry 3717 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN tasks.task_type; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.tasks.task_type IS 'GENERAL | TRANSLATION | PROOFREADING | ...; NULL/legacy coi như GENERAL.';


--
-- TOC entry 3718 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN tasks.related_work_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.tasks.related_work_id IS 'Gắn task với work (tác phẩm). Optional.';


--
-- TOC entry 3719 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN tasks.related_contract_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.tasks.related_contract_id IS 'UUID của translation_contracts(id) hoặc proofreading_contracts(id); kiểm tra ở app theo task_type.';


--
-- TOC entry 3720 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN tasks.vote; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.tasks.vote IS 'Đánh giá công việc của Người kiểm soát: tot | kha | khong_tot | khong_hoan_thanh';


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
    component_id uuid,
    overview_value numeric(15,2),
    translation_value numeric(15,2)
);


ALTER TABLE public.translation_contracts OWNER TO neondb_owner;

--
-- TOC entry 3721 (class 0 OID 0)
-- Dependencies: 244
-- Name: TABLE translation_contracts; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.translation_contracts IS 'Hợp đồng dịch thuật (theo dõi hợp đồng dịch thuật).';


--
-- TOC entry 3722 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN translation_contracts.component_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.translation_contracts.component_id IS 'Hợp phần (phân loại hợp đồng); có thể suy từ work_id hoặc set trực tiếp.';


--
-- TOC entry 3723 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN translation_contracts.overview_value; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.translation_contracts.overview_value IS 'Kinh phí viết bài tổng quan (người dùng nhập)';


--
-- TOC entry 3724 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN translation_contracts.translation_value; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.translation_contracts.translation_value IS 'Kinh phí dịch thuật = đơn giá * số trang dự tính';


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
-- TOC entry 3725 (class 0 OID 0)
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    component_id uuid
);


ALTER TABLE public.user_roles OWNER TO neondb_owner;

--
-- TOC entry 3726 (class 0 OID 0)
-- Dependencies: 242
-- Name: TABLE user_roles; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.user_roles IS 'Bảng trung gian users-roles: 1 nhân sự có nhiều vai trò. component_id: hợp phần (vd Thư ký hợp phần); NULL = toàn cục.';


--
-- TOC entry 3727 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN user_roles.component_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.user_roles.component_id IS 'Hợp phần áp dụng cho vai trò (vd: Thư ký hợp phần). NULL = vai trò toàn cục (Admin/Manager/Employee).';


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
-- TOC entry 3728 (class 0 OID 0)
-- Dependencies: 230
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.users IS 'Nhân sự. Vai trò: bảng user_roles. Nhóm: bảng user_groups.';


--
-- TOC entry 3729 (class 0 OID 0)
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
-- TOC entry 3730 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE works; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.works IS 'Tác phẩm / công việc nguồn (trục nghiệp vụ bền vững).';


--
-- TOC entry 3731 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN works.component_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.works.component_id IS 'Hợp phần dịch thuật (phân loại tác phẩm).';


--
-- TOC entry 3681 (class 0 OID 65591)
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
-- TOC entry 3671 (class 0 OID 57375)
-- Dependencies: 236
-- Data for Name: contract_members; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.contract_members (id, contract_id, user_id, role, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3682 (class 0 OID 65605)
-- Dependencies: 247
-- Data for Name: contract_stages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.contract_stages (id, translation_contract_id, proofreading_contract_id, stage_code, stage_order, start_date, end_date, actual_completion_date, note) FROM stdin;
\.


--
-- TOC entry 3666 (class 0 OID 49166)
-- Dependencies: 231
-- Data for Name: contracts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.contracts (id, code, type, name, party_a, party_b, signed_at, value, status, contract_scope, description, start_date, end_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3673 (class 0 OID 57427)
-- Dependencies: 238
-- Data for Name: document_contracts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.document_contracts (id, document_id, contract_id, role, note, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3672 (class 0 OID 57402)
-- Dependencies: 237
-- Data for Name: document_tasks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.document_tasks (id, document_id, task_id, role, note, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3668 (class 0 OID 49196)
-- Dependencies: 233
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.documents (id, title, document_type, file_path, storage_key, contract_id, task_id, uploaded_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3674 (class 0 OID 57456)
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
-- TOC entry 3683 (class 0 OID 73736)
-- Dependencies: 248
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.notifications (id, user_id, type, task_id, task_assignment_id, title, message, is_read, created_at, read_at) FROM stdin;
6a1f3b0c-3e4c-4b7d-9f8c-2d3a5b6c7d80	a45f4e87-1449-4cd3-a32c-9b16b315b1f7	task_overdue	task-1769829346523-mj93dpe	3114ad54-96ff-4477-9b2a-737e299b0939	Công việc đã quá hạn	Đã quá hạn (2025-09-30): Hỗ trợ xây dựng thuyết minh Thư tịch Phật giáo Việt Nam thư mục quan yếu (Hợp phần Phật điển Việt Nam)	f	2026-02-02 00:00:00+00	\N
0c7f1a2b-4d5e-4f6a-9b3c-1d2e3f4a5b6c	0607714e-e265-4ed1-a36f-39cedd66f10f	task_overdue	task-1769830334378-679953r	86074d8c-31ff-4a1f-a10e-0eb1161862dc	Công việc đã quá hạn	Đã quá hạn (2026-01-31): Hỗ trợ Dịch giả đọc đối chiếu Vân đài loại ngữ	f	2026-02-02 00:00:00+00	\N
b9a8c7d6-e5f4-4a3b-8c2d-1e0f9a8b7c6d	94025b61-6607-4f2f-b2b4-f4567f14f0b8	task_overdue	task-1769830334378-679953r	266a79c6-9e25-4c3e-b5c6-acb0263db34e	Công việc đã quá hạn	Đã quá hạn (2026-01-31): Hỗ trợ Dịch giả đọc đối chiếu Vân đài loại ngữ	f	2026-02-02 00:00:00+00	\N
2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f60	e0f74135-4578-4c1c-9944-55f17046607b	task_overdue	task-1769917584523-1rj9w3a	1ce45d62-974f-4465-9cb4-baa9cecedd30	Công việc đã quá hạn	Đã quá hạn (2025-07-15): Hoàn thành HS Quyết toán HĐ dịch thuật - tài liệu Dị bộ tông luân luận (GĐ2)	f	2026-02-02 00:00:00+00	\N
7e6d5c4b-3a2f-4e1d-9c8b-7a6f5e4d3c2b	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	task_overdue	task-1769780386538-0jvd1hm	2f657443-aa24-4000-abf5-cdf778b3c972	Công việc đã quá hạn	Đã quá hạn (2025-05-31): Điều chỉnh và hoàn thành Thuyết minh và Dự toán Đề án Diệu Liên GĐ2	f	2026-02-02 00:00:00+00	\N
1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d	52fa58ae-5f0a-4687-9d47-b0e5d3a210d3	task_overdue	task-1769829631251-rx6sotb	ed0fcf29-990f-47dd-a437-7e782e4ca3a0	Công việc đã quá hạn	Đã quá hạn (2025-10-29): Đọc thẩm định bản dịch NTCDA - tài liệu Trung dung - Đại học tiết yếu	f	2026-02-02 00:00:00+00	\N
b7cf2eb0-95da-def9-0dfd-c40fd4173006	fa3da8df-1bc3-43fb-be3f-25bbfdf3113b	task_assigned	task-1769830674576-78moydp	3e229a80-7dbf-4838-85d4-f1512914c4af	Công việc mới được giao	Bạn được giao: Đọc rà soát bản thảo chuyển in + Xây dựng Quy trình rà soát bản thảo chuyển in	f	2026-01-31 03:37:47.318078+00	\N
10490f9f-a0f1-9217-7c49-25f055a9f930	732a44be-0c38-4334-8897-63e49094c6e5	task_assigned	task-1769830674576-78moydp	08ae1b5d-3176-4590-8861-d3582be6524c	Công việc mới được giao	Bạn được giao: Đọc rà soát bản thảo chuyển in + Xây dựng Quy trình rà soát bản thảo chuyển in	f	2026-01-31 03:37:47.358513+00	\N
2a6f21d4-d3af-5d60-194d-be85ecb067e0	fa3da8df-1bc3-43fb-be3f-25bbfdf3113b	task_assigned	task-1769829273381-go74zqy	459fbb0c-24ef-4c7f-8553-965c08f5835e	Công việc mới được giao	Bạn được giao: Xây dựng Sơ thảo Đề án định mức biên tập	f	2026-01-31 03:38:09.654466+00	\N
0274fd6c-8d32-0c59-0cdf-1b1694a9a48f	6cd0ecee-eb79-463b-84a8-9932c54c7cc2	task_assigned	task-1769829273381-go74zqy	eb1c1484-578e-40d9-ad14-745788330fed	Công việc mới được giao	Bạn được giao: Xây dựng Sơ thảo Đề án định mức biên tập	f	2026-01-31 03:38:09.692453+00	\N
e5e712c9-e589-3e47-7651-dbbf14226040	732a44be-0c38-4334-8897-63e49094c6e5	task_assigned	task-1769829273381-go74zqy	0b75df55-d255-41c4-8157-84b011a88f62	Công việc mới được giao	Bạn được giao: Xây dựng Sơ thảo Đề án định mức biên tập	f	2026-01-31 03:38:09.731542+00	\N
32236444-4695-169a-ab79-a9d05ac9aced	a45f4e87-1449-4cd3-a32c-9b16b315b1f7	task_assigned	task-1769829346523-mj93dpe	3114ad54-96ff-4477-9b2a-737e299b0939	Công việc mới được giao	Bạn được giao: Hỗ trợ xây dựng thuyết minh Thư tịch Phật giáo Việt Nam thư mục quan yếu (Hợp phần Phật điển Việt Nam)	f	2026-01-31 03:38:33.274682+00	\N
dc6defd6-0527-d612-4cf7-8664585a6874	732a44be-0c38-4334-8897-63e49094c6e5	task_assigned	task-1769829346523-mj93dpe	7221b650-a681-467c-89e9-e63dd12cefc6	Công việc mới được giao	Bạn được giao: Hỗ trợ xây dựng thuyết minh Thư tịch Phật giáo Việt Nam thư mục quan yếu (Hợp phần Phật điển Việt Nam)	f	2026-01-31 03:38:33.330615+00	\N
4f336eaa-b786-eb5d-f0d7-29fd8bd5ed4f	fa3da8df-1bc3-43fb-be3f-25bbfdf3113b	task_assigned	task-1769829472741-5iu316h	9fbd569c-2961-4b58-bdc9-8701f9f6b23f	Công việc mới được giao	Bạn được giao: Phối hợp xây dựng Kế hoạch và Dự toán Kinh phí in ấn xuất bản	f	2026-01-31 03:38:47.762167+00	\N
2185915f-0c1e-7c5c-5a06-0fa5bee45d58	6cd0ecee-eb79-463b-84a8-9932c54c7cc2	task_assigned	task-1769829472741-5iu316h	aea75303-36b4-444a-8cac-fab6e0ad087e	Công việc mới được giao	Bạn được giao: Phối hợp xây dựng Kế hoạch và Dự toán Kinh phí in ấn xuất bản	f	2026-01-31 03:38:47.816862+00	\N
c3c355e8-bebe-a79f-ef7f-6c20241c9467	732a44be-0c38-4334-8897-63e49094c6e5	task_assigned	task-1769829472741-5iu316h	215bb07a-7c3c-4a8c-8815-ae6a2ef6bef0	Công việc mới được giao	Bạn được giao: Phối hợp xây dựng Kế hoạch và Dự toán Kinh phí in ấn xuất bản	f	2026-01-31 03:38:47.871443+00	\N
745bd29e-2c28-2669-2663-74f4a088878b	0607714e-e265-4ed1-a36f-39cedd66f10f	task_assigned	task-1769830334378-679953r	86074d8c-31ff-4a1f-a10e-0eb1161862dc	Công việc mới được giao	Bạn được giao: Hỗ trợ Dịch giả đọc đối chiếu Vân đài loại ngữ	f	2026-01-31 03:39:03.817144+00	\N
eaecac37-c4fc-9755-18ea-da8192c5827f	94025b61-6607-4f2f-b2b4-f4567f14f0b8	task_assigned	task-1769830334378-679953r	266a79c6-9e25-4c3e-b5c6-acb0263db34e	Công việc mới được giao	Bạn được giao: Hỗ trợ Dịch giả đọc đối chiếu Vân đài loại ngữ	f	2026-01-31 03:39:03.86238+00	\N
c1daa316-6474-d50e-7a4c-3637bc75d3fa	732a44be-0c38-4334-8897-63e49094c6e5	task_assigned	task-1769830334378-679953r	dfd3639b-b279-4761-b318-430ca8549d5b	Công việc mới được giao	Bạn được giao: Hỗ trợ Dịch giả đọc đối chiếu Vân đài loại ngữ	f	2026-01-31 03:39:03.905883+00	\N
bc928958-31d5-0d8b-9ebb-9692afd79295	e0f74135-4578-4c1c-9944-55f17046607b	task_assigned	task-1769917584523-1rj9w3a	1ce45d62-974f-4465-9cb4-baa9cecedd30	Công việc mới được giao	Bạn được giao: Hoàn thành HS Quyết toán HĐ dịch thuật - tài liệu Dị bộ tông luân luận (GĐ2)	f	2026-02-01 03:51:12.364621+00	\N
01cc327e-d488-a147-7014-f57c72a1fb4b	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	task_assigned	task-1769917584523-1rj9w3a	f0c51923-e424-40fe-abec-8a5efd01e8fa	Công việc mới được giao	Bạn được giao: Hoàn thành HS Quyết toán HĐ dịch thuật - tài liệu Dị bộ tông luân luận (GĐ2)	f	2026-02-01 03:51:12.420137+00	\N
d7ae0a98-522f-3274-ba3b-f43df0fb5586	e0f74135-4578-4c1c-9944-55f17046607b	task_assigned	task-1769919533177-lpq21pi	fa2efd7b-abd9-4898-9635-ce15a7c8a78e	Công việc mới được giao	Bạn được giao: Chuẩn bị Phiếu đề nghị (bổ sung 02 thành viên) + Phụ lục Hợp đồng dịch thuật tài liệu Tỳ kheo Ni truyện (GĐ 2)	f	2026-02-01 04:18:44.892628+00	\N
877bd265-bddf-df8f-e924-7563a24c6b00	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	task_assigned	task-1769919533177-lpq21pi	8dd6af9c-7672-4c9f-82af-42faeb507358	Công việc mới được giao	Bạn được giao: Chuẩn bị Phiếu đề nghị (bổ sung 02 thành viên) + Phụ lục Hợp đồng dịch thuật tài liệu Tỳ kheo Ni truyện (GĐ 2)	f	2026-02-01 04:18:44.942702+00	\N
9a79e7ca-4ad3-1706-8a72-a04c2b89832d	99434b30-4982-48e9-8c81-b3466309537e	task_assigned	task-1769776824967-rb9mw3u	b1987a5d-f4d9-4180-9186-ea876fa30355	Công việc mới được giao	Bạn được giao: Sửa bông 7 Na Tiên tỳ kheo kinh 19x27	f	2026-02-01 04:21:32.741766+00	\N
c200c777-72d3-3997-08ca-1eae0bb01a6a	99434b30-4982-48e9-8c81-b3466309537e	task_assigned	task-1769778057465-3hgvw9g	f3e21b59-9854-41cf-b8f7-556d34882d90	Công việc mới được giao	Bạn được giao: Sửa bông 4 Tịnh Độ tam kinh 19x27	f	2026-01-30 13:12:05.207551+00	\N
21bab0cd-c995-7180-200e-2b816b092e72	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	task_assigned	task-1769780386538-0jvd1hm	2f657443-aa24-4000-abf5-cdf778b3c972	Công việc mới được giao	Bạn được giao: Điều chỉnh và hoàn thành Thuyết minh và Dự toán Đề án Diệu Liên GĐ2	f	2026-01-30 13:41:02.423731+00	\N
87758c68-4ba1-f44d-8a6c-9b9bce9dfc25	732a44be-0c38-4334-8897-63e49094c6e5	task_assigned	task-1769780386538-0jvd1hm	a2a30cea-56bc-4ad9-b6c2-2d75cb98fc96	Công việc mới được giao	Bạn được giao: Điều chỉnh và hoàn thành Thuyết minh và Dự toán Đề án Diệu Liên GĐ2	f	2026-01-30 13:41:02.48064+00	\N
9bd43677-9a47-8b21-e10d-73bc9fc4fc65	52fa58ae-5f0a-4687-9d47-b0e5d3a210d3	task_assigned	task-1769829631251-rx6sotb	ed0fcf29-990f-47dd-a437-7e782e4ca3a0	Công việc mới được giao	Bạn được giao: Đọc thẩm định bản dịch NTCDA - tài liệu Trung dung - Đại học tiết yếu 	f	2026-01-31 03:20:24.024789+00	\N
\.


--
-- TOC entry 3680 (class 0 OID 65562)
-- Dependencies: 245
-- Data for Name: proofreading_contracts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.proofreading_contracts (id, contract_number, work_id, translation_contract_id, proofreader_name, page_count, rate_ratio, contract_value, start_date, end_date, actual_completion_date, note, component_id) FROM stdin;
\.


--
-- TOC entry 3676 (class 0 OID 57493)
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
5a2218d6-1a6e-4d37-99ed-b8d9f5dce15b	leader	Trưởng nhóm	Trưởng các nhóm công việc	2026-02-02 07:56:03.268189+00	2026-02-02 07:56:03.268189+00
\.


--
-- TOC entry 3669 (class 0 OID 49238)
-- Dependencies: 234
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.session (sid, sess, expire) FROM stdin;
vFi2OqLV_YN2j3V7ZG3BPMrXjWsgIYNO	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-04T15:44:40.034Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-08 09:35:40
Y5gVamoJx_1xhTsprFtIJNrmIoPaybXt	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-09T09:09:31.359Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"f8b8d9ad-fac3-4bfc-8f09-88de3e255e00"}}	2026-02-09 09:11:49
yy3hBBhEe-siIz5VVAFtgbYG0LWhdREM	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-06T04:57:30.059Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-06 04:57:31
RpgYFxP63CTJIsHj-379lPytqokKEV7P	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-06T04:57:45.332Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-06 04:57:46
yaCw5C1PgGm-7xSqc5X8s8_TwRj2buQZ	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-04T11:57:51.208Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-04 12:42:32
eltor8JXac49UggH4qxhxAFDq0xQRrvb	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-06T04:58:50.122Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-09 09:13:20
8FTT_s434T5JGSdxpW7J9JMzdcYqjbYf	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-06T10:39:23.015Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"11817e25-7e55-4b0d-82ef-9ff26de11efa"}}	2026-02-06 14:00:22
\.


--
-- TOC entry 3670 (class 0 OID 57344)
-- Dependencies: 235
-- Data for Name: task_assignments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.task_assignments (id, task_id, user_id, stage_type, round_number, received_at, due_date, completed_at, status, progress, notes, created_at, updated_at) FROM stdin;
3e229a80-7dbf-4838-85d4-f1512914c4af	task-1769830674576-78moydp	fa3da8df-1bc3-43fb-be3f-25bbfdf3113b	nhan_su_1	1	2026-01-01	2026-01-15	2026-01-09 00:00:00+00	not_started	0	\N	2026-01-31 03:37:47.318078+00	2026-01-31 03:37:47.318078+00
08ae1b5d-3176-4590-8861-d3582be6524c	task-1769830674576-78moydp	732a44be-0c38-4334-8897-63e49094c6e5	kiem_soat	1	\N	\N	\N	not_started	0	\N	2026-01-31 03:37:47.358513+00	2026-01-31 03:37:47.358513+00
459fbb0c-24ef-4c7f-8553-965c08f5835e	task-1769829273381-go74zqy	fa3da8df-1bc3-43fb-be3f-25bbfdf3113b	nhan_su_1	1	2024-11-01	\N	\N	not_started	0	\N	2026-01-31 03:38:09.654466+00	2026-01-31 03:38:09.654466+00
eb1c1484-578e-40d9-ad14-745788330fed	task-1769829273381-go74zqy	6cd0ecee-eb79-463b-84a8-9932c54c7cc2	nhan_su_2	1	\N	\N	\N	not_started	0	\N	2026-01-31 03:38:09.692453+00	2026-01-31 03:38:09.692453+00
0b75df55-d255-41c4-8157-84b011a88f62	task-1769829273381-go74zqy	732a44be-0c38-4334-8897-63e49094c6e5	kiem_soat	1	\N	\N	\N	not_started	0	\N	2026-01-31 03:38:09.731542+00	2026-01-31 03:38:09.731542+00
3114ad54-96ff-4477-9b2a-737e299b0939	task-1769829346523-mj93dpe	a45f4e87-1449-4cd3-a32c-9b16b315b1f7	nhan_su_1	1	2025-03-03	2025-09-30	\N	not_started	0	\N	2026-01-31 03:38:33.274682+00	2026-01-31 03:38:33.274682+00
7221b650-a681-467c-89e9-e63dd12cefc6	task-1769829346523-mj93dpe	732a44be-0c38-4334-8897-63e49094c6e5	kiem_soat	1	\N	\N	\N	not_started	0	\N	2026-01-31 03:38:33.330615+00	2026-01-31 03:38:33.330615+00
9fbd569c-2961-4b58-bdc9-8701f9f6b23f	task-1769829472741-5iu316h	fa3da8df-1bc3-43fb-be3f-25bbfdf3113b	nhan_su_1	1	2025-10-01	2025-10-31	2026-01-01 00:00:00+00	not_started	0	\N	2026-01-31 03:38:47.762167+00	2026-01-31 03:38:47.762167+00
aea75303-36b4-444a-8cac-fab6e0ad087e	task-1769829472741-5iu316h	6cd0ecee-eb79-463b-84a8-9932c54c7cc2	nhan_su_2	1	2025-10-01	2025-10-31	2026-01-01 00:00:00+00	not_started	0	\N	2026-01-31 03:38:47.816862+00	2026-01-31 03:38:47.816862+00
215bb07a-7c3c-4a8c-8815-ae6a2ef6bef0	task-1769829472741-5iu316h	732a44be-0c38-4334-8897-63e49094c6e5	kiem_soat	1	\N	\N	\N	not_started	0	\N	2026-01-31 03:38:47.871443+00	2026-01-31 03:38:47.871443+00
86074d8c-31ff-4a1f-a10e-0eb1161862dc	task-1769830334378-679953r	0607714e-e265-4ed1-a36f-39cedd66f10f	nhan_su_1	1	2025-12-02	2026-01-31	\N	not_started	0	\N	2026-01-31 03:39:03.817144+00	2026-01-31 03:39:03.817144+00
266a79c6-9e25-4c3e-b5c6-acb0263db34e	task-1769830334378-679953r	94025b61-6607-4f2f-b2b4-f4567f14f0b8	nhan_su_2	1	2025-12-02	2026-01-31	\N	not_started	0	\N	2026-01-31 03:39:03.86238+00	2026-01-31 03:39:03.86238+00
dfd3639b-b279-4761-b318-430ca8549d5b	task-1769830334378-679953r	732a44be-0c38-4334-8897-63e49094c6e5	kiem_soat	1	\N	\N	\N	not_started	0	\N	2026-01-31 03:39:03.905883+00	2026-01-31 03:39:03.905883+00
1ce45d62-974f-4465-9cb4-baa9cecedd30	task-1769917584523-1rj9w3a	e0f74135-4578-4c1c-9944-55f17046607b	nhan_su_1	1	2025-06-04	2025-07-15	\N	not_started	0	\N	2026-02-01 03:51:12.364621+00	2026-02-01 03:51:12.364621+00
f0c51923-e424-40fe-abec-8a5efd01e8fa	task-1769917584523-1rj9w3a	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	kiem_soat	1	\N	\N	\N	not_started	0	\N	2026-02-01 03:51:12.420137+00	2026-02-01 03:51:12.420137+00
fa2efd7b-abd9-4898-9635-ce15a7c8a78e	task-1769919533177-lpq21pi	e0f74135-4578-4c1c-9944-55f17046607b	nhan_su_1	1	2025-12-04	2026-01-20	2026-01-23 00:00:00+00	not_started	0	\N	2026-02-01 04:18:44.892628+00	2026-02-01 04:18:44.892628+00
8dd6af9c-7672-4c9f-82af-42faeb507358	task-1769919533177-lpq21pi	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	kiem_soat	1	\N	\N	\N	not_started	0	\N	2026-02-01 04:18:44.942702+00	2026-02-01 04:18:44.942702+00
b1987a5d-f4d9-4180-9186-ea876fa30355	task-1769776824967-rb9mw3u	99434b30-4982-48e9-8c81-b3466309537e	ktv_chinh	1	2026-01-07	2026-01-08	2026-01-08 00:00:00+00	completed	100	\N	2026-02-01 04:21:32.741766+00	2026-02-01 04:21:32.741766+00
f3e21b59-9854-41cf-b8f7-556d34882d90	task-1769778057465-3hgvw9g	99434b30-4982-48e9-8c81-b3466309537e	ktv_chinh	1	2026-01-08	2026-01-08	2026-01-08 00:00:00+00	completed	100	\N	2026-01-30 13:12:05.207551+00	2026-01-30 13:12:05.207551+00
2f657443-aa24-4000-abf5-cdf778b3c972	task-1769780386538-0jvd1hm	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	nhan_su_1	1	2025-05-20	2025-05-31	\N	not_started	0	\N	2026-01-30 13:41:02.423731+00	2026-01-30 13:41:02.423731+00
a2a30cea-56bc-4ad9-b6c2-2d75cb98fc96	task-1769780386538-0jvd1hm	732a44be-0c38-4334-8897-63e49094c6e5	kiem_soat	1	\N	\N	\N	not_started	0	\N	2026-01-30 13:41:02.48064+00	2026-01-30 13:41:02.48064+00
ed0fcf29-990f-47dd-a437-7e782e4ca3a0	task-1769829631251-rx6sotb	52fa58ae-5f0a-4687-9d47-b0e5d3a210d3	nhan_su_1	1	2025-09-29	2025-10-29	\N	not_started	0	\N	2026-01-31 03:20:24.024789+00	2026-01-31 03:20:24.024789+00
\.


--
-- TOC entry 3667 (class 0 OID 49176)
-- Dependencies: 232
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.tasks (id, title, description, "group", status, priority, progress, notes, workflow, source_sheet_id, source_sheet_name, contract_id, created_at, updated_at, task_type, related_work_id, related_contract_id, vote) FROM stdin;
task-1769829631251-rx6sotb	Đọc thẩm định bản dịch NTCDA - tài liệu Trung dung - Đại học tiết yếu 	\N	CV chung	In Progress	High	0	\N	\N	\N	\N	\N	2026-01-31 03:20:31.251+00	2026-01-31 03:20:31.251+00	GENERAL	\N	\N	\N
task-1769830674576-78moydp	Đọc rà soát bản thảo chuyển in + Xây dựng Quy trình rà soát bản thảo chuyển in	\N	CV chung	Completed	Medium	100	\N	\N	\N	\N	\N	2026-01-31 03:37:54.576+00	2026-01-31 03:37:54.576+00	GENERAL	\N	\N	\N
task-1769829273381-go74zqy	Xây dựng Sơ thảo Đề án định mức biên tập	\N	CV chung	In Progress	Medium	0	Tạm dừng	\N	\N	\N	\N	2026-01-31 03:14:33.381+00	2026-01-31 03:38:09.575253+00	GENERAL	\N	\N	\N
task-1769829346523-mj93dpe	Hỗ trợ xây dựng thuyết minh Thư tịch Phật giáo Việt Nam thư mục quan yếu (Hợp phần Phật điển Việt Nam)	\N	CV chung	In Progress	Medium	0	Tạm dừng	\N	\N	\N	\N	2026-01-31 03:15:46.523+00	2026-01-31 03:38:33.171003+00	GENERAL	\N	\N	\N
task-1769829472741-5iu316h	Phối hợp xây dựng Kế hoạch và Dự toán Kinh phí in ấn xuất bản	\N	CV chung	Completed	Medium	100	\N	\N	\N	\N	\N	2026-01-31 03:17:52.741+00	2026-01-31 03:38:47.657324+00	GENERAL	\N	\N	\N
task-1769778057465-3hgvw9g	Sửa bông 4 Tịnh Độ tam kinh 19x27	\N	Thiết kế	Completed	Medium	100	\N	\N	\N	\N	\N	2026-01-30 13:00:57.465+00	2026-01-30 13:12:05.096041+00	DESIGN	123eaa2b-84df-4da4-b244-fff1a49243a2	\N	\N
task-1769830334378-679953r	Hỗ trợ Dịch giả đọc đối chiếu Vân đài loại ngữ	\N	CV chung	In Progress	Medium	0	\N	\N	\N	\N	\N	2026-01-31 03:32:14.378+00	2026-01-31 03:39:03.73045+00	GENERAL	\N	\N	\N
task-1769780386538-0jvd1hm	Điều chỉnh và hoàn thành Thuyết minh và Dự toán Đề án Diệu Liên GĐ2	\N	CNTT	In Progress	High	0	\N	\N	\N	\N	\N	2026-01-30 13:39:46.538+00	2026-01-30 13:41:02.31011+00	IT	\N	\N	\N
task-1769917584523-1rj9w3a	Hoàn thành HS Quyết toán HĐ dịch thuật - tài liệu Dị bộ tông luân luận (GĐ2)	\N	Thư ký hợp phần	Pending	Medium	0	Chưa quyết toán, đợi xem xét	\N	\N	\N	\N	2026-02-01 03:46:24.523+00	2026-02-01 03:51:12.202536+00	GENERAL	45ac2ea6-afd2-4f49-963d-44865d9e41d5	\N	\N
task-1769919533177-lpq21pi	Chuẩn bị Phiếu đề nghị (bổ sung 02 thành viên) + Phụ lục Hợp đồng dịch thuật tài liệu Tỳ kheo Ni truyện (GĐ 2)	\N	Thư ký hợp phần	Completed	Medium	100	- 16/12/2025: VP đang chỉnh sửa\n- 29/12/2025: gửi 02 phiếu xin chữ ký DG\n- 12/1/2026: DG gửi lại 02 phiếu, đợi xin chữ ký thầy Quảng Đại"	\N	\N	\N	\N	2026-02-01 04:18:53.177+00	2026-02-01 04:18:53.177+00	GENERAL	a1c0c896-0c43-471e-83c1-d010ac0d1a1b	\N	\N
task-1769776824967-rb9mw3u	Sửa bông 7 Na Tiên tỳ kheo kinh 19x27	\N	Thiết kế	Completed	High	100	\N	\N	\N	\N	\N	2026-01-30 12:40:24.967+00	2026-02-01 04:21:32.656468+00	DESIGN	342b21b4-615b-4904-ba88-e423f3157de3	\N	\N
\.


--
-- TOC entry 3679 (class 0 OID 65547)
-- Dependencies: 244
-- Data for Name: translation_contracts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.translation_contracts (id, contract_number, work_id, unit_price, contract_value, start_date, end_date, extension_start_date, extension_end_date, actual_completion_date, actual_word_count, actual_page_count, completion_rate, settlement_value, note, component_id, overview_value, translation_value) FROM stdin;
d08e3dfc-dc51-4fe4-9512-1336cc7d23b0	67/HĐ-VPKĐ	342b21b4-615b-4904-ba88-e423f3157de3	300000	101900000	2023-11-29	2023-11-28	\N	\N	2023-11-08	96964	277	1.0147	103100000	\N	32037af6-b306-4ea7-af9d-ae766e67dde6	20000000.00	81900000.00
\.


--
-- TOC entry 3675 (class 0 OID 57470)
-- Dependencies: 240
-- Data for Name: user_groups; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_groups (id, user_id, group_id, created_at, updated_at) FROM stdin;
cf25ff30-f4e8-4aa7-87a7-305fa45d0505	11817e25-7e55-4b0d-82ef-9ff26de11efa	d4b1672f-f8f9-4936-acd6-90a750757e5c	2026-01-29 10:59:40.265196+00	2026-01-29 10:59:40.265196+00
afccd9c1-4610-4236-9abb-06f817962518	99434b30-4982-48e9-8c81-b3466309537e	66df46df-2814-428d-996e-a5aaeff4c263	2026-01-29 11:02:45.723798+00	2026-01-29 11:02:45.723798+00
1d9d6135-11d0-4e8e-8006-6fb5e906a20f	9f59f810-2c2a-4242-b56c-77d4bdf73391	985a7b8c-f5e5-4b55-ab7d-42a397ddee34	2026-01-29 11:04:54.618387+00	2026-01-29 11:04:54.618387+00
dc9ab3cf-a310-4027-afbd-5c46074a941d	9f59f810-2c2a-4242-b56c-77d4bdf73391	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-01-29 11:04:54.618387+00	2026-01-29 11:04:54.618387+00
2e991729-7f37-4b7a-9279-076e52fae83e	52fa58ae-5f0a-4687-9d47-b0e5d3a210d3	985a7b8c-f5e5-4b55-ab7d-42a397ddee34	2026-01-30 02:36:30.029231+00	2026-01-30 02:36:30.029231+00
f88fcc5b-379d-413a-ac4e-fe7bc694b979	52fa58ae-5f0a-4687-9d47-b0e5d3a210d3	f4adb090-2b47-4ebc-8e9f-94be393e5228	2026-01-30 02:36:30.029231+00	2026-01-30 02:36:30.029231+00
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
7aed292d-559f-4a24-95cb-4e06964dcbfe	e0f74135-4578-4c1c-9944-55f17046607b	985a7b8c-f5e5-4b55-ab7d-42a397ddee34	2026-02-02 07:29:08.466557+00	2026-02-02 07:29:08.466557+00
d8a6097c-361c-4a2d-ba52-ca221eb82072	e0f74135-4578-4c1c-9944-55f17046607b	d4b1672f-f8f9-4936-acd6-90a750757e5c	2026-02-02 07:29:08.466557+00	2026-02-02 07:29:08.466557+00
1c3d2981-8dae-4024-90bc-4c528a59f790	e0f74135-4578-4c1c-9944-55f17046607b	3e0ba4ba-6ad8-4624-ae9c-891232056b28	2026-02-02 07:29:08.466557+00	2026-02-02 07:29:08.466557+00
\.


--
-- TOC entry 3677 (class 0 OID 57507)
-- Dependencies: 242
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_roles (id, user_id, role_id, created_at, updated_at, component_id) FROM stdin;
39870ad3-d5d7-4cef-9cd2-06e5024654ba	11817e25-7e55-4b0d-82ef-9ff26de11efa	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-29 10:59:40.152895+00	2026-01-29 10:59:40.152895+00	\N
a82f6346-5757-429f-8cb3-884e70f21c49	99434b30-4982-48e9-8c81-b3466309537e	10114bd1-51e1-4719-9149-309c86e2a079	2026-01-29 11:02:45.629841+00	2026-01-29 11:02:45.629841+00	\N
658d927e-a4d7-4b98-b668-cca2eef7d647	79a84794-8a33-4b27-ab86-e2ce152e46da	10114bd1-51e1-4719-9149-309c86e2a079	2026-01-30 02:37:19.024924+00	2026-01-30 02:37:19.024924+00	\N
61c55900-09e1-4d6c-8427-41735d7a7bc8	79a84794-8a33-4b27-ab86-e2ce152e46da	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:37:19.024924+00	2026-01-30 02:37:19.024924+00	\N
0b8d87d2-65ac-45f9-99e7-78d6b1d9c7e0	46be9276-294e-49a5-8d43-6d45b7b3fa3a	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:37:36.764314+00	2026-01-30 02:37:36.764314+00	\N
97f131af-7c1d-49f0-89f4-14d00a24deda	46be9276-294e-49a5-8d43-6d45b7b3fa3a	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:37:36.764314+00	2026-01-30 02:37:36.764314+00	\N
488ddab3-2c43-488a-a15a-cc819d67d3d7	219965d8-1855-461e-81ba-5264e8405e3a	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:37:52.83487+00	2026-01-30 02:37:52.83487+00	\N
440c7e2b-422b-4671-bb90-dfc8ec2ab6e3	219965d8-1855-461e-81ba-5264e8405e3a	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:37:52.83487+00	2026-01-30 02:37:52.83487+00	\N
43993c52-00dd-4144-9289-1c8dfa3e3b3c	ccedb4bb-b523-4a4e-a628-ccdcdb1cdef2	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:38:07.866273+00	2026-01-30 02:38:07.866273+00	\N
1b4f10f1-0516-486b-b415-1a3d5e0772d7	ccedb4bb-b523-4a4e-a628-ccdcdb1cdef2	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:38:07.866273+00	2026-01-30 02:38:07.866273+00	\N
65e8b991-09ac-4663-bcfa-bff63b92e76e	02cfd1a3-7a97-4187-914c-55fee83f380e	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:39:37.653869+00	2026-01-30 02:39:37.653869+00	\N
b201ee3b-81df-42ef-82d8-96f30ebc74bb	02cfd1a3-7a97-4187-914c-55fee83f380e	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:39:37.653869+00	2026-01-30 02:39:37.653869+00	\N
48de3bdf-2ae2-4138-9e99-c686e4c0eeb3	6845e494-d1b9-40ae-b36f-2cdb09291747	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:41:15.492358+00	2026-01-30 02:41:15.492358+00	\N
1a7c14b9-e5c5-4569-8d68-aaba04fe3ed9	6845e494-d1b9-40ae-b36f-2cdb09291747	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:41:15.492358+00	2026-01-30 02:41:15.492358+00	\N
418b4f19-8bad-4a34-8ea8-c3b2438bc942	6845e494-d1b9-40ae-b36f-2cdb09291747	10114bd1-51e1-4719-9149-309c86e2a079	2026-01-30 02:41:15.492358+00	2026-01-30 02:41:15.492358+00	\N
d6fa6d0f-ba23-4578-a38e-8f0c56b3c9a5	50ee08d4-15aa-406a-98c5-d2b26ce1a83b	10114bd1-51e1-4719-9149-309c86e2a079	2026-01-30 02:43:17.626929+00	2026-01-30 02:43:17.626929+00	\N
314233ab-63da-4b87-9de7-92cfbd172c6c	50ee08d4-15aa-406a-98c5-d2b26ce1a83b	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:43:17.626929+00	2026-01-30 02:43:17.626929+00	\N
42fa2e0f-0605-419e-8638-4cc0e4787197	50ee08d4-15aa-406a-98c5-d2b26ce1a83b	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:43:17.626929+00	2026-01-30 02:43:17.626929+00	\N
6457d2ed-642c-4e00-9ed2-c8be83b6a78e	6cd0ecee-eb79-463b-84a8-9932c54c7cc2	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:44:42.964016+00	2026-01-30 02:44:42.964016+00	\N
7eafcce9-346e-4ff9-a0a0-52d7af7dbd78	6cd0ecee-eb79-463b-84a8-9932c54c7cc2	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:44:42.964016+00	2026-01-30 02:44:42.964016+00	\N
ae1bcbec-0fce-4fac-ab17-39e0545076fb	c28a1e2b-b90e-44cb-95c7-4369e21d15c3	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:45:27.388948+00	2026-01-30 02:45:27.388948+00	\N
cb33c4aa-d19c-4380-b93b-d79dab56cdf3	6267364c-d995-471f-bd07-ef118ad65d71	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:45:42.839075+00	2026-01-30 02:45:42.839075+00	\N
46f5d6ad-746c-4174-b712-7ebb365332cb	6267364c-d995-471f-bd07-ef118ad65d71	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:45:42.839075+00	2026-01-30 02:45:42.839075+00	\N
25f17d08-5e9c-4b21-ab75-b1a504d97238	fa3da8df-1bc3-43fb-be3f-25bbfdf3113b	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:45:59.674406+00	2026-01-30 02:45:59.674406+00	\N
2a5bba9f-4f13-494d-8fd7-29e67c473c99	fa3da8df-1bc3-43fb-be3f-25bbfdf3113b	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:45:59.674406+00	2026-01-30 02:45:59.674406+00	\N
8ca209e7-cc44-4c63-a44f-16f2d3635d1a	732a44be-0c38-4334-8897-63e49094c6e5	75f7b60f-bb13-40ff-a066-b72cf82dacc1	2026-01-30 02:47:09.310041+00	2026-01-30 02:47:09.310041+00	\N
c68ce596-099e-436a-b51d-fd723162281a	94025b61-6607-4f2f-b2b4-f4567f14f0b8	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-30 02:47:53.455953+00	2026-01-30 02:47:53.455953+00	\N
07a47b1a-c75a-4542-8f0f-fd19bfdf8422	94025b61-6607-4f2f-b2b4-f4567f14f0b8	83004138-2d9d-4ced-9510-cc77eac41299	2026-01-30 02:47:53.455953+00	2026-01-30 02:47:53.455953+00	\N
20cf624e-b4bf-4370-bdd9-3dca79b6c5cc	e0f74135-4578-4c1c-9944-55f17046607b	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-02-02 07:30:17.388745+00	2026-02-02 07:30:17.388745+00	58786d42-3079-4d1e-b2f7-b160208c2293
175493c1-aebc-484f-906a-cbea5279e412	e0f74135-4578-4c1c-9944-55f17046607b	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-02-02 07:30:17.388745+00	2026-02-02 07:30:17.388745+00	32037af6-b306-4ea7-af9d-ae766e67dde6
1ad07c0b-2576-4c3c-ba27-8b786e06943e	e0f74135-4578-4c1c-9944-55f17046607b	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-02-02 07:30:17.388745+00	2026-02-02 07:30:17.388745+00	\N
ffcb5777-3640-4aea-8384-ee6735f27e05	e0f74135-4578-4c1c-9944-55f17046607b	83004138-2d9d-4ced-9510-cc77eac41299	2026-02-02 07:30:17.388745+00	2026-02-02 07:30:17.388745+00	\N
082cfa73-9424-4a0c-b181-4129bdddc720	52fa58ae-5f0a-4687-9d47-b0e5d3a210d3	903a9649-1514-4393-acd3-991a33608dad	2026-02-02 07:30:42.433968+00	2026-02-02 07:30:42.433968+00	\N
cae31f37-e66a-49e8-991d-3480768b9b30	52fa58ae-5f0a-4687-9d47-b0e5d3a210d3	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-02-02 07:30:42.433968+00	2026-02-02 07:30:42.433968+00	1d724f5c-67fb-4a63-b7d2-434d22f90e05
b1a5cf5e-cb7b-402a-aedd-85e711f21f76	52fa58ae-5f0a-4687-9d47-b0e5d3a210d3	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-02-02 07:30:42.433968+00	2026-02-02 07:30:42.433968+00	59a2a4c4-c508-403d-bf55-1b1917f8d714
2335dc46-47b9-4ab3-8617-37ec82c0267b	19c6c15c-c249-4410-9c37-2f19ca885bee	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-02-02 07:30:55.257279+00	2026-02-02 07:30:55.257279+00	\N
6059c67b-17cd-4f1f-822b-9a87dbae9976	19c6c15c-c249-4410-9c37-2f19ca885bee	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-02-02 07:30:55.257279+00	2026-02-02 07:30:55.257279+00	25aed873-6915-4d53-9354-5f9704364fb1
917780ab-4961-4ff0-ad04-5c0c38e654fa	19c6c15c-c249-4410-9c37-2f19ca885bee	83004138-2d9d-4ced-9510-cc77eac41299	2026-02-02 07:30:55.257279+00	2026-02-02 07:30:55.257279+00	\N
d7c0504a-68ae-4d16-974f-5d818ff75b0a	a45f4e87-1449-4cd3-a32c-9b16b315b1f7	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-02-02 07:31:12.158526+00	2026-02-02 07:31:12.158526+00	\N
ff039eaa-66e2-4c13-9a29-d9b29f0faf96	a45f4e87-1449-4cd3-a32c-9b16b315b1f7	83004138-2d9d-4ced-9510-cc77eac41299	2026-02-02 07:31:12.158526+00	2026-02-02 07:31:12.158526+00	\N
a2149734-8e72-4032-9079-5ea178f5131b	a45f4e87-1449-4cd3-a32c-9b16b315b1f7	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-02-02 07:31:12.158526+00	2026-02-02 07:31:12.158526+00	25aed873-6915-4d53-9354-5f9704364fb1
ac119cf0-a12c-421b-94cd-a671b4606226	e177e33b-2720-4a23-ac89-a8a4c93857b3	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-02-02 07:31:26.720021+00	2026-02-02 07:31:26.720021+00	\N
e8da7f4e-9896-4b7f-ad45-f66a1377b27a	e177e33b-2720-4a23-ac89-a8a4c93857b3	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-02-02 07:31:26.720021+00	2026-02-02 07:31:26.720021+00	58786d42-3079-4d1e-b2f7-b160208c2293
9f0ccf06-6792-4fa6-8384-861fa76c3bb0	e177e33b-2720-4a23-ac89-a8a4c93857b3	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-02-02 07:31:26.720021+00	2026-02-02 07:31:26.720021+00	32037af6-b306-4ea7-af9d-ae766e67dde6
b7edf658-5571-4ce4-a357-6378a399697b	e177e33b-2720-4a23-ac89-a8a4c93857b3	83004138-2d9d-4ced-9510-cc77eac41299	2026-02-02 07:31:26.720021+00	2026-02-02 07:31:26.720021+00	\N
14aa5d82-acc6-4695-8181-5b8c489c55c6	3c17630a-da96-42da-8147-6a8544202429	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-02-02 07:31:35.349243+00	2026-02-02 07:31:35.349243+00	\N
d4a9d41e-bf0d-4f72-a0f0-1a29bdcd90c1	3c17630a-da96-42da-8147-6a8544202429	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-02-02 07:31:35.349243+00	2026-02-02 07:31:35.349243+00	58786d42-3079-4d1e-b2f7-b160208c2293
4e563880-7cac-4ef1-bb07-730c6370d822	3c17630a-da96-42da-8147-6a8544202429	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-02-02 07:31:35.349243+00	2026-02-02 07:31:35.349243+00	32037af6-b306-4ea7-af9d-ae766e67dde6
e59716e9-ad6f-4a74-ad91-8d118667b969	3c17630a-da96-42da-8147-6a8544202429	83004138-2d9d-4ced-9510-cc77eac41299	2026-02-02 07:31:35.349243+00	2026-02-02 07:31:35.349243+00	\N
8dd79194-2c90-4c96-b4e3-ff5e5a1cc2ff	3c17630a-da96-42da-8147-6a8544202429	10114bd1-51e1-4719-9149-309c86e2a079	2026-02-02 07:31:35.349243+00	2026-02-02 07:31:35.349243+00	\N
8fa93904-b29c-48fd-86de-e180edd35f65	0607714e-e265-4ed1-a36f-39cedd66f10f	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-02-02 07:31:53.806071+00	2026-02-02 07:31:53.806071+00	\N
0603ce22-a01b-4ee3-bf22-184201f03ac7	0607714e-e265-4ed1-a36f-39cedd66f10f	83004138-2d9d-4ced-9510-cc77eac41299	2026-02-02 07:31:53.806071+00	2026-02-02 07:31:53.806071+00	\N
c85292aa-c779-4c65-bc9a-081779839436	0607714e-e265-4ed1-a36f-39cedd66f10f	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-02-02 07:31:53.806071+00	2026-02-02 07:31:53.806071+00	59a2a4c4-c508-403d-bf55-1b1917f8d714
e7768288-e487-410c-a299-e84a3e1cf03b	0607714e-e265-4ed1-a36f-39cedd66f10f	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-02-02 07:31:53.806071+00	2026-02-02 07:31:53.806071+00	1d724f5c-67fb-4a63-b7d2-434d22f90e05
e225f56f-02aa-4e2f-b1e0-8859bd51399f	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	b5a3a01b-77f5-447a-aeee-096edfdd36f5	2026-02-02 07:32:09.690432+00	2026-02-02 07:32:09.690432+00	\N
f33c38b6-f2c0-4ae8-a68d-b4de1966c77d	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-02-02 07:32:09.690432+00	2026-02-02 07:32:09.690432+00	58786d42-3079-4d1e-b2f7-b160208c2293
2da3b033-5558-450f-a08e-9f4dc8eb16dc	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-02-02 07:32:09.690432+00	2026-02-02 07:32:09.690432+00	32037af6-b306-4ea7-af9d-ae766e67dde6
a56138b3-26b7-4135-8820-f9cdee6bc8db	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	83004138-2d9d-4ced-9510-cc77eac41299	2026-02-02 07:32:09.690432+00	2026-02-02 07:32:09.690432+00	\N
45e01965-4cf1-4174-ad06-b11f06b2597f	9f59f810-2c2a-4242-b56c-77d4bdf73391	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-02-02 07:32:18.460513+00	2026-02-02 07:32:18.460513+00	25aed873-6915-4d53-9354-5f9704364fb1
f2ba36db-6342-41bf-9f06-1cf5f38b9f8d	9f59f810-2c2a-4242-b56c-77d4bdf73391	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-02-02 07:32:18.460513+00	2026-02-02 07:32:18.460513+00	\N
8fc7f487-6fbb-4ff7-9de6-d59f46be5247	9f59f810-2c2a-4242-b56c-77d4bdf73391	83004138-2d9d-4ced-9510-cc77eac41299	2026-02-02 07:32:18.460513+00	2026-02-02 07:32:18.460513+00	\N
f47b6ecb-e941-4a28-a7e8-7841e3069d5b	0eef4c99-11d9-420c-a012-b9defe3d5bb6	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-02-02 07:32:26.630641+00	2026-02-02 07:32:26.630641+00	25aed873-6915-4d53-9354-5f9704364fb1
fed2c290-8ebc-4269-8308-e176f34453e9	0eef4c99-11d9-420c-a012-b9defe3d5bb6	83004138-2d9d-4ced-9510-cc77eac41299	2026-02-02 07:32:26.630641+00	2026-02-02 07:32:26.630641+00	\N
728f2e14-0a04-42cc-9f92-1d43c6172579	0eef4c99-11d9-420c-a012-b9defe3d5bb6	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-02-02 07:32:26.630641+00	2026-02-02 07:32:26.630641+00	\N
59425c4f-dcfa-48f3-9b30-11329e6db574	5a3dc6e5-c7d4-467b-aa3f-673312685b82	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-02-02 07:32:41.899072+00	2026-02-02 07:32:41.899072+00	\N
a485fb73-940c-41e1-b01a-ec4c16cf87a4	5a3dc6e5-c7d4-467b-aa3f-673312685b82	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-02-02 07:32:41.899072+00	2026-02-02 07:32:41.899072+00	58786d42-3079-4d1e-b2f7-b160208c2293
48138f3a-e57a-4bea-95cb-4b0a43a0e7af	5a3dc6e5-c7d4-467b-aa3f-673312685b82	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-02-02 07:32:41.899072+00	2026-02-02 07:32:41.899072+00	32037af6-b306-4ea7-af9d-ae766e67dde6
282ef76d-76f7-40bf-b26b-1d402d8170d7	5a3dc6e5-c7d4-467b-aa3f-673312685b82	83004138-2d9d-4ced-9510-cc77eac41299	2026-02-02 07:32:41.899072+00	2026-02-02 07:32:41.899072+00	\N
427b171f-4088-4bf1-a866-0b73e2ad7a67	b5b30517-5c9c-4036-afd9-4e2948651238	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-02-02 07:32:52.594178+00	2026-02-02 07:32:52.594178+00	25aed873-6915-4d53-9354-5f9704364fb1
e1ade932-4c0c-4174-8ebf-35b9e7d0ab80	b5b30517-5c9c-4036-afd9-4e2948651238	83004138-2d9d-4ced-9510-cc77eac41299	2026-02-02 07:32:52.594178+00	2026-02-02 07:32:52.594178+00	\N
db90d919-fd85-4e42-a836-ceff9d909dec	88d7b1cf-5818-4202-aa28-a36912e3c3ed	b5a3a01b-77f5-447a-aeee-096edfdd36f5	2026-02-02 08:09:58.159874+00	2026-02-02 08:09:58.159874+00	\N
\.


--
-- TOC entry 3665 (class 0 OID 49152)
-- Dependencies: 230
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, email, password_hash, display_name, first_name, last_name, department, is_active, created_at, updated_at) FROM stdin;
50ee08d4-15aa-406a-98c5-d2b26ce1a83b	giangngtv.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Thị Vân Giang	Giang	Nguyễn Thị Vân	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:43:17.538432+00
6cd0ecee-eb79-463b-84a8-9932c54c7cc2	dungna.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Ngô Ánh Dung	Dung	Ngô Ánh	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:44:42.873092+00
52fa58ae-5f0a-4687-9d47-b0e5d3a210d3	hadv@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Dương Văn Hà	Hà	Dương Văn	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-02-02 07:30:42.345476+00
a45f4e87-1449-4cd3-a32c-9b16b315b1f7	nghiemdung.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nghiêm Thuỳ Dung	Dung	Nghiêm Thuỳ	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-02-02 07:31:12.069703+00
9f59f810-2c2a-4242-b56c-77d4bdf73391	anhtm@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Trần Minh Ánh	Ánh	Trần Minh	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-02-02 07:32:18.333747+00
5a3dc6e5-c7d4-467b-aa3f-673312685b82	chauvm.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Vũ Minh Châu	Châu	Vũ Minh	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-02-02 07:32:41.806121+00
88d7b1cf-5818-4202-aa28-a36912e3c3ed	admin@kdpd.local	$2b$10$Qw2yKYN4QZOOKU5LRpQABOGbTB1RKc0FGM9QoUNmgdnhQXPK2KWMO	admin	Admin	KDPD	Ban Thư ký	t	2026-01-28 11:19:24.186555+00	2026-02-02 08:09:58.048224+00
99434b30-4982-48e9-8c81-b3466309537e	ngochant.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Ngọc Hà	Hà	Nguyễn Ngọc	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-29 11:02:45.534957+00
6845e494-d1b9-40ae-b36f-2cdb09291747	linhntt.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Thị Thuỳ Linh	Linh	Nguyễn Thị Thuỳ	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:41:15.38138+00
b5b30517-5c9c-4036-afd9-4e2948651238	hoangvq.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Vũ Quốc Hoàng	Hoàng	Vũ Quốc	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-02-02 07:32:52.475749+00
c28a1e2b-b90e-44cb-95c7-4369e21d15c3	tankhai283@gmail.com	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Trần Tấn Khải	Khải	Trần Tấn	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:45:27.281026+00
6267364c-d995-471f-bd07-ef118ad65d71	quyentt.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Trần Tất Quyến	Quyến	Trần Tất	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:45:42.739888+00
fa3da8df-1bc3-43fb-be3f-25bbfdf3113b	votuoanh.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Võ Thị Tú Oanh	Oanh	Võ Thị Tú	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:45:59.55794+00
732a44be-0c38-4334-8897-63e49094c6e5	vuhuongvtnt@gmail.com	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Vũ Thị Hương	Hương	Vũ Thị	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:47:09.2201+00
94025b61-6607-4f2f-b2b4-f4567f14f0b8	thaodp.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Đào Phương Thảo	Thảo	Đào Phương	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:47:53.346903+00
e0f74135-4578-4c1c-9944-55f17046607b	nguyendh.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Dương Hương Nguyên	Nguyên	Dương Hương	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-02-02 07:30:17.280661+00
11817e25-7e55-4b0d-82ef-9ff26de11efa	thanhctk.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Cung Thị Kim Thành	Thành	Cung Thị Kim	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-29 10:44:23.872824+00
19c6c15c-c249-4410-9c37-2f19ca885bee	sonld@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Lê Đình Sơn	Sơn	Lê Đình	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-02-02 07:30:55.163315+00
79a84794-8a33-4b27-ab86-e2ce152e46da	hieuhn@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Hoàng Ngọc Hiếu	Hiếu	Hoàng Ngọc	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:37:18.920291+00
46be9276-294e-49a5-8d43-6d45b7b3fa3a	nhungkp.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Kiều Phương Nhung	Nhung	Kiều Phương	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:37:36.64554+00
ccedb4bb-b523-4a4e-a628-ccdcdb1cdef2	hoailtm@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Lê Thị Minh Hoài	Hoài	Lê Thị Minh	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:38:07.751716+00
02cfd1a3-7a97-4187-914c-55fee83f380e	thinc@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Cẩm Thi	Thi	Nguyễn Cẩm	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:39:37.566863+00
e177e33b-2720-4a23-ac89-a8a4c93857b3	maint.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nghiêm Thị Mai	Mai	Nghiêm Thị	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-02-02 07:31:26.630021+00
3c17630a-da96-42da-8147-6a8544202429	trangnl.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Linh Trang	Trang	Nguyễn Linh	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-02-02 07:31:35.225433+00
0607714e-e265-4ed1-a36f-39cedd66f10f	tienntt.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Thị Thuỷ Tiên	Tiên	Nguyễn Thị Thuỷ	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-02-02 07:31:53.686953+00
0eef4c99-11d9-420c-a012-b9defe3d5bb6	ngatt.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Trần Thanh Ngà	Ngà	Trần Thanh	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-02-02 07:32:26.505195+00
219965d8-1855-461e-81ba-5264e8405e3a	haiyenle.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Lê Thị Hải Yến	Yến	Lê Thị Hải	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:37:52.742916+00
f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	vinhnv.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Viết Vinh	Vinh	Nguyễn Viết	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-02-02 07:32:09.601464+00
\.


--
-- TOC entry 3678 (class 0 OID 65536)
-- Dependencies: 243
-- Data for Name: works; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.works (id, stage, title_vi, title_hannom, document_code, base_word_count, base_page_count, estimate_factor, estimate_word_count, estimate_page_count, note, created_at, component_id) FROM stdin;
f0c8aa8c-637d-4ab9-a61e-5c9df45408c4	1	Tạp A hàm kinh	雜阿含經	T0099	590385	1687	1.5	885578	2530	\N	2026-01-30 08:38:05.904158+00	58786d42-3079-4d1e-b2f7-b160208c2293
123eaa2b-84df-4da4-b244-fff1a49243a2	1	Tịnh độ tam kinh	淨土三經	\N	35000	100	2	70000	200	\N	2026-01-30 12:59:11.590254+00	32037af6-b306-4ea7-af9d-ae766e67dde6
7970f848-da41-4230-9d18-6648e2aee73e	1	Kim cương kinh	金剛經	\N	7300	21	2	14600	42	\N	2026-01-31 10:56:47.794174+00	32037af6-b306-4ea7-af9d-ae766e67dde6
f4344ed5-7653-4c61-996f-720e850a3170	1	Pháp hoa kinh	法華經	\N	88000	251	2	176000	503	\N	2026-01-31 10:56:47.859442+00	32037af6-b306-4ea7-af9d-ae766e67dde6
443a238d-3246-4322-9f25-1234c92737e8	1	Hoa nghiêm kinh	華嚴經	\N	694000	1983	2	1388000	3966	\N	2026-01-31 10:56:47.912182+00	32037af6-b306-4ea7-af9d-ae766e67dde6
ac245e1c-9737-4248-a1e0-f1eb6e94e3a4	1	Bát nhã tâm kinh	般若心經	\N	84721	242	1	84721	242	\N	2026-01-31 10:58:06.743112+00	32037af6-b306-4ea7-af9d-ae766e67dde6
4e8ae4c7-43c9-43fd-b6b1-8bd5ca71b7f4	1	Viên giác kinh	圓覺經	\N	15000	43	2	30000	86	\N	2026-01-31 11:10:39.307653+00	32037af6-b306-4ea7-af9d-ae766e67dde6
dfbef106-ac89-4773-a4a3-a5cad36fbfc9	1	Giải thâm mật kinh	解深密經	\N	39000	111	2	78000	223	\N	2026-01-31 11:10:39.371532+00	32037af6-b306-4ea7-af9d-ae766e67dde6
e378ef5b-ebba-4a9f-a15a-d799a6607159	1	Lăng Già kinh	楞伽經	\N	73000	209	2	146000	417	\N	2026-01-31 11:10:39.422878+00	32037af6-b306-4ea7-af9d-ae766e67dde6
d90d9ca7-15ac-40e2-9359-08f340ac31a2	1	Thắng Man kinh	勝鬘經	\N	11000	31	2	22000	63	\N	2026-01-31 11:10:39.474337+00	32037af6-b306-4ea7-af9d-ae766e67dde6
409cd5fa-648c-4c53-b0a9-86351a2ee2df	1	Đại Nhật kinh	大日經	\N	72000	206	2	144000	411	\N	2026-01-31 11:10:39.5283+00	32037af6-b306-4ea7-af9d-ae766e67dde6
ac8a3e4e-dad7-4b98-9226-e610e7fb65f5	1	Lăng nghiêm kinh	楞嚴經	\N	84000	240	2	168000	480	\N	2026-01-31 11:10:39.582171+00	32037af6-b306-4ea7-af9d-ae766e67dde6
7bb57241-6d80-4dec-852c-808f983a019b	1	Duy Ma Cật kinh	維摩吉經	\N	34000	97	2	68000	194	\N	2026-01-31 11:10:39.635094+00	32037af6-b306-4ea7-af9d-ae766e67dde6
0df6cee1-b06d-4c08-b63c-d3b41f9b2380	1	Dược Sư kinh	藥師經	\N	7000	20	2	14000	40	\N	2026-01-31 11:10:39.688104+00	32037af6-b306-4ea7-af9d-ae766e67dde6
0e498c92-5661-4e64-9d19-78fd997b01ee	1	Lục tổ đàn kinh	六祖壇經	\N	34000	97	2	68000	194	\N	2026-01-31 11:10:39.740026+00	32037af6-b306-4ea7-af9d-ae766e67dde6
55896bdf-d70a-4f39-ad6b-3e20f0d72717	1	Phật thuyết Di Lặc thượng sinh hạ sinh kinh	佛說彌勒上生下生經	\N	10000	29	2	20000	57	\N	2026-01-31 11:10:39.793537+00	32037af6-b306-4ea7-af9d-ae766e67dde6
4a1901ef-fea9-433d-8bb8-b1d2665b2b9f	1	Lục độ tập kinh	六度集經	\N	86000	246	2	172000	491	\N	2026-01-31 11:10:39.846382+00	32037af6-b306-4ea7-af9d-ae766e67dde6
f9825e52-2244-4ff6-9602-ff66a8961f8e	1	Địa tạng bản nguyện kinh ngoại nhị bộ	地藏本願經外二部	\N	22000	63	2	44000	126	\N	2026-01-31 11:10:39.89941+00	32037af6-b306-4ea7-af9d-ae766e67dde6
5856b684-3bc2-444b-aaaa-cae50207d908	1	Đại thừa khởi tín luận	大乘起信論	\N	14000	40	2	28000	80	\N	2026-01-31 11:10:39.951371+00	32037af6-b306-4ea7-af9d-ae766e67dde6
44a33467-286b-424f-95e9-3a1fb33e2df5	1	Đại Đường Tây Vực ký	大唐西域記	\N	131000	374	2	262000	749	\N	2026-01-31 11:10:40.002187+00	32037af6-b306-4ea7-af9d-ae766e67dde6
2278af0b-f402-4d95-8dbc-395d1fe9e644	1	Xuất tam tạng ký tập	出三藏記集	\N	164000	469	2	328000	937	\N	2026-01-31 11:10:40.054081+00	32037af6-b306-4ea7-af9d-ae766e67dde6
08ca2f33-7c98-4e8d-9342-fa0adc4512dc	1	Đại thừa huyền luận	大乘玄論	\N	106000	303	2	212000	606	\N	2026-01-31 11:10:40.156841+00	32037af6-b306-4ea7-af9d-ae766e67dde6
90ffb7a7-66f8-4afc-b92d-6d57d22eb472	1	Thập nhị môn luận	十二門論	\N	15000	43	2	30000	86	\N	2026-01-31 11:10:40.20884+00	32037af6-b306-4ea7-af9d-ae766e67dde6
1033df12-f0f1-43a0-a794-3146ed3d6704	1	Trung luận	中論	\N	54000	154	2	108000	309	\N	2026-01-31 11:10:40.260553+00	32037af6-b306-4ea7-af9d-ae766e67dde6
003e1ebe-e996-4516-ba26-d6029b4ad48a	1	Bách luận	百倫	\N	25000	71	2	50000	143	\N	2026-01-31 11:10:40.314055+00	32037af6-b306-4ea7-af9d-ae766e67dde6
6d758280-76b5-495c-9cbe-316e673c5889	1	Triệu luận	肇論	\N	20000	57	2	40000	114	\N	2026-01-31 11:10:40.366522+00	32037af6-b306-4ea7-af9d-ae766e67dde6
de60a453-2afc-4c30-bc71-7fede28e2406	1	Biện trung biên luận	辯中邊論	\N	20000	57	2	40000	114	\N	2026-01-31 11:10:40.419773+00	32037af6-b306-4ea7-af9d-ae766e67dde6
2007c5c4-b5c5-4d2f-8b27-960e30bdc472	1	Thành duy thức luận	成唯識論	\N	92000	263	2	184000	526	\N	2026-01-31 11:10:40.473133+00	32037af6-b306-4ea7-af9d-ae766e67dde6
19ef2999-76eb-4316-b40e-06ba791450ee	1	Duy thức tứ luận	唯識四論	\N	35000	100	2	70000	200	\N	2026-01-31 11:10:40.527493+00	32037af6-b306-4ea7-af9d-ae766e67dde6
7083b0ef-de65-4955-924a-67544d3a8f90	1	Phật tính luận	佛性論	\N	44000	126	2	88000	251	\N	2026-01-31 11:10:40.579183+00	32037af6-b306-4ea7-af9d-ae766e67dde6
02b07552-6f95-4e3f-b866-54d6a2501baa	1	Du già sư địa luận	瑜伽師地論	\N	924000	2640	2	1848000	5280	\N	2026-01-31 11:10:40.629928+00	32037af6-b306-4ea7-af9d-ae766e67dde6
ef7a6664-d942-4044-aac8-a40405232c8e	1	Nhiếp đại thừa luận	攝大乘論	\N	32000	91	2	64000	183	\N	2026-01-31 11:10:40.681092+00	32037af6-b306-4ea7-af9d-ae766e67dde6
6e5710f4-12dc-4732-bf61-d14152b31388	1	Đại Tuệ Phổ Giác thiền sư ngữ lục	大慧普覺禪師語錄	\N	214000	611	2	428000	1223	\N	2026-01-31 11:10:40.734102+00	32037af6-b306-4ea7-af9d-ae766e67dde6
6dfd18f2-5bb9-4afb-aa8b-34b9798064e4	1	Phật quốc ký	佛國記	\N	17000	49	2	34000	97	\N	2026-01-31 11:10:40.786813+00	32037af6-b306-4ea7-af9d-ae766e67dde6
2f8a5598-9203-4bf7-803e-47165434f483	1	Thích Ca Mâu Ni truyện	釋迦牟尼傳	\N	193503	553	2	387006	1106	\N	2026-01-31 11:10:40.839563+00	32037af6-b306-4ea7-af9d-ae766e67dde6
d204c4a4-0dc5-4be1-b59b-5a3728cf1085	2	Đại thừa bản sinh tâm địa quán kinh	大乘本生心地觀經	\N	62100	177	2	124200	355	\N	2026-01-31 11:20:25.67673+00	32037af6-b306-4ea7-af9d-ae766e67dde6
733e6fc8-efbb-489f-885f-dd8771a64a59	2	Phật di giáo tam kinh	佛遺教三經	\N	8990	26	2	17980	51	- Phật thuyết Tứ thập nhị chương kinh\r\n- Phật thuyết bát đại nhân giác kinh\r\n- Phật thuyết Ban niết bàn lược thuyết giáo giới kinh	2026-01-31 11:20:25.738507+00	32037af6-b306-4ea7-af9d-ae766e67dde6
590b6942-405a-4a70-8ab5-174156172483	2	An ban thủ ý kinh	安般守意經	\N	18800	54	2	37600	107	\N	2026-01-31 11:20:25.786646+00	32037af6-b306-4ea7-af9d-ae766e67dde6
342b21b4-615b-4904-ba88-e423f3157de3	2	Na Tiên tỳ kheo kinh	那先比丘經	\N	47800	137	2	95600	273	\N	2026-01-31 11:20:25.835094+00	32037af6-b306-4ea7-af9d-ae766e67dde6
75e87f46-d0dd-4ab3-b1b1-78f410801f8c	2	Ban chu tam muội kinh	般舟三昧經	\N	26100	75	2	52200	149	\N	2026-01-31 11:20:25.893796+00	32037af6-b306-4ea7-af9d-ae766e67dde6
dfb0092b-533b-490a-8011-cdad7bef627e	2	Phật thuyết Phạm võng kinh	佛說梵網經	\N	20300	58	2	40600	116	\N	2026-01-31 11:20:25.946536+00	32037af6-b306-4ea7-af9d-ae766e67dde6
9011dd3c-6b0b-4bce-9cc8-71cad392d273	2	Ưu bà tắc giới kinh	優婆塞戒經	\N	74200	212	2	148400	424	\N	2026-01-31 11:20:25.994858+00	32037af6-b306-4ea7-af9d-ae766e67dde6
44b53168-3cfe-4adf-a610-c1d898987e53	2	Pháp cú kinh	法句經	\N	20000	57	2	40000	114	\N	2026-01-31 11:20:26.042325+00	32037af6-b306-4ea7-af9d-ae766e67dde6
a80a3fa4-456a-4bac-81c1-0e232690105f	2	An lạc tập	安樂集	\N	31800	91	2	63600	182	\N	2026-01-31 11:20:26.090154+00	32037af6-b306-4ea7-af9d-ae766e67dde6
b6bd64dd-3de6-470b-b5e8-0e258a288dd0	2	Chính pháp nhãn tạng	正法眼藏	\N	120500	344	2	241000	689	\N	2026-01-31 11:20:26.137835+00	32037af6-b306-4ea7-af9d-ae766e67dde6
1615a0e7-0f9b-4772-aff6-8a9e52b73cd4	2	Thiền tông vô môn quan	禪宗無門關	\N	9000	26	2	18000	51	\N	2026-01-31 11:20:26.186788+00	32037af6-b306-4ea7-af9d-ae766e67dde6
a1c0c896-0c43-471e-83c1-d010ac0d1a1b	2	Tỳ kheo Ni truyện	比丘尼傳	\N	20800	59	2	41600	119	\N	2026-01-31 11:20:26.235124+00	32037af6-b306-4ea7-af9d-ae766e67dde6
8e92ab19-7dbb-4317-82d6-a3f7ffca0b70	2	Tống Cao tăng truyện	宋高僧傳	\N	311200	889	2	622400	1778	\N	2026-01-31 11:20:26.283934+00	32037af6-b306-4ea7-af9d-ae766e67dde6
0a2f7867-91e6-4bee-8616-90d3ba34a49f	2	Đường Cao tăng truyện	唐高僧傳	\N	439500	1256	2	879000	2511	\N	2026-01-31 11:20:26.343844+00	32037af6-b306-4ea7-af9d-ae766e67dde6
d2b1fab1-748b-48d5-9e9f-a3f7365e9006	2	Lương Cao tăng truyện	梁高僧傳	\N	164600	470	2	329200	941	\N	2026-01-31 11:20:26.397078+00	32037af6-b306-4ea7-af9d-ae766e67dde6
169123cd-1aa9-4d03-ae50-194198f026c1	2	Pháp uyển châu lâm	法苑珠林	\N	1148900	3283	2	2297800	6565	\N	2026-01-31 11:20:26.446112+00	32037af6-b306-4ea7-af9d-ae766e67dde6
91652e1e-fd27-4418-b730-42ad1aa668cc	2	Thành thực luận	成實論	\N	212300	607	2	424600	1213	\N	2026-01-31 11:20:26.496581+00	32037af6-b306-4ea7-af9d-ae766e67dde6
45ac2ea6-afd2-4f49-963d-44865d9e41d5	2	Dị bộ tông luân luận	異部宗輪論	\N	4700	13	2	9400	27	\N	2026-01-31 11:20:26.544673+00	32037af6-b306-4ea7-af9d-ae766e67dde6
951c69c9-9524-4404-8e5a-a8e446cf78be	2	Mâu Tử lý hoặc luận	牟子理惑論	\N	10000	29	2	20000	57	\N	2026-01-31 11:20:26.596508+00	32037af6-b306-4ea7-af9d-ae766e67dde6
8d7a590d-85b7-4597-87d3-2cefa1b45e5f	2	Tạp A tỳ đàm tâm luận	雜阿毘曇心論	\N	152100	435	2	304200	869	\N	2026-01-31 11:20:26.643256+00	32037af6-b306-4ea7-af9d-ae766e67dde6
1c4c7ad5-cdc9-486f-aa72-b169c3132da4	2	Đại trí độ luận	大智度論	\N	1166000	3331	2	2332000	6663	- Giai đoạn 1: (Q.01-25)\r\n- Giai đoạn 2 (Q.26-50)\r\n- Giai đoạn 3: (Q.51-75)\r\n- Giai đoạn 4 (Q.76-100) + Bài tổng quan	2026-01-31 11:20:26.690928+00	32037af6-b306-4ea7-af9d-ae766e67dde6
59ba2e09-5ebd-4264-8946-9df4bfd588ab	2	Lâm Tế lục	臨濟錄	\N	21300	61	2	42600	122	\N	2026-01-31 11:20:26.738349+00	32037af6-b306-4ea7-af9d-ae766e67dde6
05e77972-e1cf-4043-935f-fcbf33eb2751	1	Trung A hàm kinh	中阿含經	\N	652000	1863	2	1304000	3726	\N	2026-01-31 11:32:45.802259+00	32037af6-b306-4ea7-af9d-ae766e67dde6
9e646141-6026-4425-abe2-07db3759218e	1	Trường A hàm kinh	長阿含經	\N	247000	706	2	494000	1411	\N	2026-01-31 11:32:45.855746+00	32037af6-b306-4ea7-af9d-ae766e67dde6
576cbc49-e60c-4471-b1e2-362c6c759838	1	Tăng nhất A hàm kinh	增一阿含經	\N	444000	1269	2	888000	2537	\N	2026-01-31 11:32:45.90689+00	32037af6-b306-4ea7-af9d-ae766e67dde6
cc052469-ea7a-41ea-9256-42388093539e	1	Tạp A hàm kinh	雜阿含經	\N	591000	1689	2	1182000	3377	\N	2026-01-31 11:32:45.958198+00	32037af6-b306-4ea7-af9d-ae766e67dde6
6b6794ae-d03c-4cc1-84a2-31baa8d484d2	3	Kim cương đỉnh kinh	金剛頂經	\N	22650	65	2	45300	129	\N	2026-01-31 11:32:46.008468+00	32037af6-b306-4ea7-af9d-ae766e67dde6
54534084-78b8-4fba-91a4-01d776f489ef	3	Đại bát Niết bàn kinh	大般涅槃經	\N	404724	1156	2	809448	2313	- Tập 1 - tập 2 (Tạp uẩn, Kết uẩn)\r\n- Tập 4 - tập 6 (Trí uẩn, Nghiệp uẩn, Đại chủng uẩn)\r\n- Tập 7- tập 8 (Căn uẩn, Định uẩn, Kiến uẩn)	2026-01-31 11:32:46.059047+00	32037af6-b306-4ea7-af9d-ae766e67dde6
4bb3659e-6a4b-4ab3-a4c6-4c4ca7e3fad7	3	An ban thủ ý kinh	安般守意經	\N	18843	54	2	37686	108	\N	2026-01-31 11:32:46.110855+00	32037af6-b306-4ea7-af9d-ae766e67dde6
708f1b35-6aed-481d-b850-ac0adbd586cc	3	Kim quang minh kinh	金光明經	\N	35064	100	2	70128	200	\N	2026-01-31 11:32:46.161911+00	32037af6-b306-4ea7-af9d-ae766e67dde6
e2f41415-c929-457e-accd-c0cab0786b3e	3	Bách dụ kinh	百喻經	\N	22612	65	2	45224	129	\N	2026-01-31 11:32:46.213288+00	32037af6-b306-4ea7-af9d-ae766e67dde6
d68dc478-4e9f-4317-bdac-e5b84bd1cf6e	3	Đại tỳ ba sa luận	大毗婆沙論	\N	1542450	4407	2	3084900	8814	\N	2026-01-31 11:32:46.26672+00	32037af6-b306-4ea7-af9d-ae766e67dde6
a431194c-5392-4d4d-b4ad-d2f39caeb41b	3	Hoa nghiêm nguyên nhân luận	華嚴原人論	\N	22949	66	2	45898	131	\N	2026-01-31 11:32:46.319507+00	32037af6-b306-4ea7-af9d-ae766e67dde6
c444136e-c2bd-44f6-ac99-633245821a8b	3	Thập địa kinh luận	十地經論	\N	128187	366	2	256374	732	\N	2026-01-31 11:32:46.370945+00	32037af6-b306-4ea7-af9d-ae766e67dde6
5139b1b6-a93d-4aee-b487-934c92e3ff47	3	Nhân minh nhập chính \r\nlý luận	因明入正理論	\N	3507	10	2	7014	20	\N	2026-01-31 11:32:46.421397+00	32037af6-b306-4ea7-af9d-ae766e67dde6
f4d9a797-2160-47ab-a3d0-db0819348542	3	Nhân minh nhập chính \r\nlý luận sớ	因明入正理論疏	\N	86066	246	2	172132	492	\N	2026-01-31 11:32:46.472189+00	32037af6-b306-4ea7-af9d-ae766e67dde6
1bd03bc0-653a-405e-869c-0ecacd23d644	3	Giải thoát đạo luận	解脫道論	\N	104800	299	2	209600	599	\N	2026-01-31 11:32:46.524338+00	32037af6-b306-4ea7-af9d-ae766e67dde6
ccfa964e-6c41-4d26-a581-fae7c99d3b4f	3	Giáo quán cương tông	教觀綱宗	\N	10031	29	2	20062	57	\N	2026-01-31 11:32:46.575528+00	32037af6-b306-4ea7-af9d-ae766e67dde6
68d0fb12-d232-40d7-9c81-2dc04b279a88	3	Ma ha chỉ quán	摩訶止觀	\N	220643	630	2	441286	1261	\N	2026-01-31 11:32:46.626577+00	32037af6-b306-4ea7-af9d-ae766e67dde6
9bd694aa-86b5-4ce6-ad31-d58b8b50cc1b	3	Tứ phần luật	四分律	\N	743333	2124	2	1486666	4248	\N	2026-01-31 11:32:46.678555+00	32037af6-b306-4ea7-af9d-ae766e67dde6
5964e42c-a49c-4ff7-827a-4446313868bf	3	Sắc tu Bách Trượng thanh quy	敕修百丈清規	\N	83192	238	2	166384	475	\N	2026-01-31 11:32:46.729705+00	32037af6-b306-4ea7-af9d-ae766e67dde6
be6ce9e1-8b13-4184-b529-8a815cb348ff	3	Tri môn cảnh huấn	緇門警訓	\N	90909	260	2	181818	519	\N	2026-01-31 11:32:46.781736+00	32037af6-b306-4ea7-af9d-ae766e67dde6
ee0bc420-a03d-45fd-b8fb-1c5b354e349e	3	Cảnh Đức truyền đăng lục	景德傳燈錄	\N	440000	1257	2	880000	2514	\N	2026-01-31 11:32:46.834227+00	32037af6-b306-4ea7-af9d-ae766e67dde6
43cdae66-1712-4188-a6a2-fb4252c21a37	3	Thiên Đồng Chính Giác thiền sư ngữ lục	天童正覺禪師語錄	\N	191587	547	2	383174	1095	\N	2026-01-31 11:32:46.8858+00	32037af6-b306-4ea7-af9d-ae766e67dde6
0c2d5f18-75f1-435a-a136-78eb9704326f	3	Thần Hội ngữ lục	神會語錄	\N	8947	26	2	17894	51	\N	2026-01-31 11:32:46.937089+00	32037af6-b306-4ea7-af9d-ae766e67dde6
d8c71d11-47d8-4f7a-a510-d546b12be132	3	Bích Nham lục	碧巖錄	\N	155947	446	2	311894	891	\N	2026-01-31 11:32:46.987836+00	32037af6-b306-4ea7-af9d-ae766e67dde6
4ffe77fb-62bd-47b7-9eb6-a9e8f9605c8d	3	Đại thừa đại nghĩa chương	大乘大義章	\N	37361	107	2	74722	213	\N	2026-01-31 11:32:47.040313+00	32037af6-b306-4ea7-af9d-ae766e67dde6
8f23592e-9953-4511-ad3c-32ac51b03084	3	Vĩnh Gia chứng đạo ca	永嘉證道歌	\N	2535	7	2	5070	14	\N	2026-01-31 11:32:47.090169+00	32037af6-b306-4ea7-af9d-ae766e67dde6
1890e122-54ab-4b9e-8b80-049a5e5896f1	3	Thiền lâm tượng khí tiên	禪林象器箋	\N	514118	1469	2	1028236	2938	\N	2026-01-31 11:32:47.141072+00	32037af6-b306-4ea7-af9d-ae766e67dde6
aa39940b-d6be-40c5-a5d8-37e42e3ef307	3	Thiền môn sư tư thừa tập đồ	禪門師資承襲圖	\N	7433	21	2	14866	42	\N	2026-01-31 11:32:47.191792+00	32037af6-b306-4ea7-af9d-ae766e67dde6
ab2fe0c6-3e80-413b-9cbb-8f3fca026319	3	Vạn thiện đồng quy tập	萬善同歸集	\N	65047	186	2	130094	372	\N	2026-01-31 11:32:47.242611+00	32037af6-b306-4ea7-af9d-ae766e67dde6
b0b8a7c9-d8aa-419d-94c1-61adcdcb343d	3	Nam Hải ký quy nội pháp truyện	南海寄歸內法傳	\N	47371	135	2	94742	271	\N	2026-01-31 11:32:47.296689+00	32037af6-b306-4ea7-af9d-ae766e67dde6
3a7143f7-0943-4599-be95-83e22d23d6e1	3	Nhập Đường cầu pháp tuần lễ ký	入唐求法巡禮記	\N	100239	286	2	200478	573	\N	2026-01-31 11:32:47.347483+00	32037af6-b306-4ea7-af9d-ae766e67dde6
219be72d-c746-4501-ba6a-5b4e23613fd2	3	Thiền lâm tăng bảo truyện	禪林僧寶傳	\N	105000	300	2	210000	600	\N	2026-01-31 11:32:47.399078+00	32037af6-b306-4ea7-af9d-ae766e67dde6
09634f4d-e694-4ecb-807d-303c6a250529	4	Tứ thập nhị chương kinh	四十二章經	T17n0784	3200	9	2	6400	18	\N	2026-01-31 11:38:01.036326+00	32037af6-b306-4ea7-af9d-ae766e67dde6
90e87a44-0571-4950-b479-548fc4fc93bb	4	Phật thuyết chuyển pháp luân kinh	佛說轉法輪經	T02n0109	900	3	2	1800	5	\N	2026-01-31 11:38:01.088275+00	32037af6-b306-4ea7-af9d-ae766e67dde6
339e13f3-25ae-4be8-9f3a-d6bafd44e51b	4	Duyên khởi kinh	緣起經	T02n0124	1100	3	2	2200	6	\N	2026-01-31 11:38:01.13933+00	32037af6-b306-4ea7-af9d-ae766e67dde6
8244390b-d60c-4811-b089-84eebb9ee0d1	4	Xuất diệu kinh	出曜經	T04n0212	256400	733	2	512800	1465	\N	2026-01-31 11:38:01.189999+00	32037af6-b306-4ea7-af9d-ae766e67dde6
08e9a441-39a6-40bf-b2cb-ce0ddff33776	4	A Súc Phật quốc kinh	阿閦佛國經	T11n0313	21000	60	2	42000	120	\N	2026-01-31 11:38:01.241192+00	32037af6-b306-4ea7-af9d-ae766e67dde6
491db246-c205-4142-9f2f-4fe6d336c9d7	4	Phụ tử hợp tập kinh	父子合集經	T11n0320	84400	241	2	168800	482	\N	2026-01-31 11:38:01.291639+00	32037af6-b306-4ea7-af9d-ae766e67dde6
e52ddc70-ace9-4be4-9cd0-fae4c9e38465	4	Xưng tán Tịnh Độ Phật nhiếp thụ kinh	稱讚淨土佛攝受經	T12n0367	4700	13	2	9400	27	\N	2026-01-31 11:38:01.342925+00	32037af6-b306-4ea7-af9d-ae766e67dde6
f9f9cc31-03c4-4682-8cca-db6033f95aa7	4	Phật thuyết Vu Lan bồn kinh	佛說盂蘭盆經	T16n0685	1000	3	2	2000	6	\N	2026-01-31 11:38:01.395369+00	32037af6-b306-4ea7-af9d-ae766e67dde6
799c2a41-af57-47f1-8540-8c70acd7dbb3	4	Phật thuyết đại báo phụ mẫu ân trọng kinh	佛說父母恩難報經	T16n0684	500	1	2	1000	3	\N	2026-01-31 11:38:01.446162+00	32037af6-b306-4ea7-af9d-ae766e67dde6
30edb0e0-0975-4f36-9fc1-eab9bed812a3	4	Thập thiện nghiệp đạo kinh	十善業道經	T15n0600	3000	9	2	6000	17	\N	2026-01-31 11:38:01.497756+00	32037af6-b306-4ea7-af9d-ae766e67dde6
30068341-d323-45e6-8e97-4676ffa0ff0d	4	Bi hoa kinh	悲華經	T03n0157	105100	300	2	210200	601	\N	2026-01-31 11:38:01.547616+00	32037af6-b306-4ea7-af9d-ae766e67dde6
7963438e-749d-4ab0-ac72-88dac81b6a81	4	Thiên địa bát dương thần chú kinh	天地八陽神呪經	T85n2897	4100	12	2	8200	23	\N	2026-01-31 11:38:01.598168+00	32037af6-b306-4ea7-af9d-ae766e67dde6
076ef20a-531d-4201-9d83-7fcac10fa09a	4	Cao Vương Quán Thế Âm kinh	高王觀世音經	T85n2898	800	2	2	1600	5	\N	2026-01-31 11:38:01.648632+00	32037af6-b306-4ea7-af9d-ae766e67dde6
945435ec-559c-400f-91e3-f191b3710571	4	Tập chư kinh lễ sám nghi	集諸經禮懺儀	T47n1982	11700	33	2	23400	67	\N	2026-01-31 11:38:01.698322+00	32037af6-b306-4ea7-af9d-ae766e67dde6
a3c36112-3b27-403b-8c46-6c89aed0494d	4	Đại Đường Đại Từ Ân tự Tam tạng pháp sư truyện	大唐大慈恩寺三藏法師傳	T50n2053	96800	277	2	193600	553	\N	2026-01-31 11:38:01.748643+00	32037af6-b306-4ea7-af9d-ae766e67dde6
591888f3-1c56-41f5-aa8a-9db09d039d3d	4	Đại Đường Tây Vực cầu pháp cao tăng truyện	大唐西域求法高僧傳	T51n2066	18100	52	2	36200	103	\N	2026-01-31 11:38:01.799582+00	32037af6-b306-4ea7-af9d-ae766e67dde6
54c445da-b62b-415a-b238-50580b8300a3	4	Phạm võng kinh cổ tích ký	梵網經古迹記	T40n1815	51300	147	2	102600	293	\N	2026-01-31 11:38:01.848846+00	32037af6-b306-4ea7-af9d-ae766e67dde6
b8464285-d2af-44ea-8d0c-f4bb11b23ba2	4	Quy nguyên trực chỉ	歸元直指	X61n1156	92500	264	2	185000	529	\N	2026-01-31 11:38:01.898609+00	32037af6-b306-4ea7-af9d-ae766e67dde6
5ca9440d-5aa2-40f3-bbfe-20556f1234d1	4	Thập tụng luật	十誦律	T23n1435	816400	2333	2	1632800	4665	\N	2026-01-31 11:38:01.949036+00	32037af6-b306-4ea7-af9d-ae766e67dde6
c14e8eeb-9a62-4449-8157-8270ba623af5	4	Thiếu Thất lục môn	少室六門	T48n2009	18000	51	2	36000	103	\N	2026-01-31 11:38:01.998662+00	32037af6-b306-4ea7-af9d-ae766e67dde6
3290f0f9-9c3c-4c82-9059-7fe8d083ef9e	4	Quán Vô Lượng Thọ Phật kinh sớ diệu tông sao	觀無量壽佛經疏妙宗鈔	T37n1751	56400	161	2	112800	322	\N	2026-01-31 11:38:02.049724+00	32037af6-b306-4ea7-af9d-ae766e67dde6
8b7a4664-8c67-4191-b130-4ff39837655c	4	A Di Đà kinh sớ sao	阿彌陀經疏鈔	X22n2404	125100	357	2	250200	715	\N	2026-01-31 11:38:02.100012+00	32037af6-b306-4ea7-af9d-ae766e67dde6
019de380-4589-4cc1-8659-645bbf6f50b2	4	Pháp hoa văn cú ký	法華文句記	T34n1719	351600	1005	2	703200	2009	\N	2026-01-31 11:38:02.151928+00	32037af6-b306-4ea7-af9d-ae766e67dde6
\.


--
-- TOC entry 3465 (class 2606 OID 65602)
-- Name: components components_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.components
    ADD CONSTRAINT components_code_key UNIQUE (code);


--
-- TOC entry 3467 (class 2606 OID 65600)
-- Name: components components_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.components
    ADD CONSTRAINT components_pkey PRIMARY KEY (id);


--
-- TOC entry 3409 (class 2606 OID 57384)
-- Name: contract_members contract_members_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contract_members
    ADD CONSTRAINT contract_members_pkey PRIMARY KEY (id);


--
-- TOC entry 3411 (class 2606 OID 57386)
-- Name: contract_members contract_members_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contract_members
    ADD CONSTRAINT contract_members_unique UNIQUE (contract_id, user_id);


--
-- TOC entry 3471 (class 2606 OID 65614)
-- Name: contract_stages contract_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contract_stages
    ADD CONSTRAINT contract_stages_pkey PRIMARY KEY (id);


--
-- TOC entry 3381 (class 2606 OID 49175)
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 3421 (class 2606 OID 57436)
-- Name: document_contracts document_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_contracts
    ADD CONSTRAINT document_contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 3423 (class 2606 OID 57438)
-- Name: document_contracts document_contracts_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_contracts
    ADD CONSTRAINT document_contracts_unique UNIQUE (document_id, contract_id);


--
-- TOC entry 3415 (class 2606 OID 57411)
-- Name: document_tasks document_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_tasks
    ADD CONSTRAINT document_tasks_pkey PRIMARY KEY (id);


--
-- TOC entry 3417 (class 2606 OID 57413)
-- Name: document_tasks document_tasks_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_tasks
    ADD CONSTRAINT document_tasks_unique UNIQUE (document_id, task_id);


--
-- TOC entry 3393 (class 2606 OID 49205)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 3427 (class 2606 OID 57467)
-- Name: groups groups_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_code_unique UNIQUE (code);


--
-- TOC entry 3429 (class 2606 OID 57465)
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- TOC entry 3478 (class 2606 OID 73745)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 3463 (class 2606 OID 65569)
-- Name: proofreading_contracts proofreading_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.proofreading_contracts
    ADD CONSTRAINT proofreading_contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 3439 (class 2606 OID 57504)
-- Name: roles roles_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_code_unique UNIQUE (code);


--
-- TOC entry 3441 (class 2606 OID 57502)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3399 (class 2606 OID 49244)
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- TOC entry 3405 (class 2606 OID 57357)
-- Name: task_assignments task_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 3407 (class 2606 OID 57359)
-- Name: task_assignments task_assignments_unique_assignment; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_unique_assignment UNIQUE (task_id, user_id, stage_type, round_number);


--
-- TOC entry 3391 (class 2606 OID 49185)
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- TOC entry 3458 (class 2606 OID 65554)
-- Name: translation_contracts translation_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.translation_contracts
    ADD CONSTRAINT translation_contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 3434 (class 2606 OID 57477)
-- Name: user_groups user_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_pkey PRIMARY KEY (id);


--
-- TOC entry 3436 (class 2606 OID 57479)
-- Name: user_groups user_groups_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_unique UNIQUE (user_id, group_id);


--
-- TOC entry 3446 (class 2606 OID 57514)
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3377 (class 2606 OID 49165)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3379 (class 2606 OID 49163)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3453 (class 2606 OID 65544)
-- Name: works works_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.works
    ADD CONSTRAINT works_pkey PRIMARY KEY (id);


--
-- TOC entry 3397 (class 1259 OID 49245)
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- TOC entry 3468 (class 1259 OID 65603)
-- Name: idx_components_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_components_code ON public.components USING btree (code);


--
-- TOC entry 3469 (class 1259 OID 65604)
-- Name: idx_components_display_order; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_components_display_order ON public.components USING btree (display_order);


--
-- TOC entry 3412 (class 1259 OID 57397)
-- Name: idx_contract_members_contract_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_contract_members_contract_id ON public.contract_members USING btree (contract_id);


--
-- TOC entry 3413 (class 1259 OID 57398)
-- Name: idx_contract_members_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_contract_members_user_id ON public.contract_members USING btree (user_id);


--
-- TOC entry 3472 (class 1259 OID 65626)
-- Name: idx_contract_stages_proofreading; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_contract_stages_proofreading ON public.contract_stages USING btree (proofreading_contract_id) WHERE (proofreading_contract_id IS NOT NULL);


--
-- TOC entry 3473 (class 1259 OID 65625)
-- Name: idx_contract_stages_translation; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_contract_stages_translation ON public.contract_stages USING btree (translation_contract_id) WHERE (translation_contract_id IS NOT NULL);


--
-- TOC entry 3382 (class 1259 OID 49225)
-- Name: idx_contracts_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_contracts_status ON public.contracts USING btree (status);


--
-- TOC entry 3383 (class 1259 OID 49224)
-- Name: idx_contracts_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_contracts_type ON public.contracts USING btree (type);


--
-- TOC entry 3424 (class 1259 OID 57450)
-- Name: idx_document_contracts_contract_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_document_contracts_contract_id ON public.document_contracts USING btree (contract_id);


--
-- TOC entry 3425 (class 1259 OID 57449)
-- Name: idx_document_contracts_document_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_document_contracts_document_id ON public.document_contracts USING btree (document_id);


--
-- TOC entry 3418 (class 1259 OID 57424)
-- Name: idx_document_tasks_document_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_document_tasks_document_id ON public.document_tasks USING btree (document_id);


--
-- TOC entry 3419 (class 1259 OID 57425)
-- Name: idx_document_tasks_task_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_document_tasks_task_id ON public.document_tasks USING btree (task_id);


--
-- TOC entry 3394 (class 1259 OID 49230)
-- Name: idx_documents_contract_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documents_contract_id ON public.documents USING btree (contract_id) WHERE (contract_id IS NOT NULL);


--
-- TOC entry 3395 (class 1259 OID 49231)
-- Name: idx_documents_task_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documents_task_id ON public.documents USING btree (task_id) WHERE (task_id IS NOT NULL);


--
-- TOC entry 3396 (class 1259 OID 49232)
-- Name: idx_documents_uploaded_by; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documents_uploaded_by ON public.documents USING btree (uploaded_by) WHERE (uploaded_by IS NOT NULL);


--
-- TOC entry 3430 (class 1259 OID 57468)
-- Name: idx_groups_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_groups_code ON public.groups USING btree (code);


--
-- TOC entry 3474 (class 1259 OID 73763)
-- Name: idx_notifications_assignment_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_assignment_type ON public.notifications USING btree (user_id, task_assignment_id, type);


--
-- TOC entry 3475 (class 1259 OID 73761)
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- TOC entry 3476 (class 1259 OID 73762)
-- Name: idx_notifications_user_read; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, is_read);


--
-- TOC entry 3459 (class 1259 OID 65644)
-- Name: idx_proofreading_contracts_component_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_proofreading_contracts_component_id ON public.proofreading_contracts USING btree (component_id) WHERE (component_id IS NOT NULL);


--
-- TOC entry 3460 (class 1259 OID 65581)
-- Name: idx_proofreading_contracts_translation_contract_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_proofreading_contracts_translation_contract_id ON public.proofreading_contracts USING btree (translation_contract_id);


--
-- TOC entry 3461 (class 1259 OID 65580)
-- Name: idx_proofreading_contracts_work_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_proofreading_contracts_work_id ON public.proofreading_contracts USING btree (work_id);


--
-- TOC entry 3437 (class 1259 OID 57505)
-- Name: idx_roles_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_roles_code ON public.roles USING btree (code);


--
-- TOC entry 3400 (class 1259 OID 57372)
-- Name: idx_task_assignments_due_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_task_assignments_due_date ON public.task_assignments USING btree (due_date) WHERE (due_date IS NOT NULL);


--
-- TOC entry 3401 (class 1259 OID 57373)
-- Name: idx_task_assignments_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_task_assignments_status ON public.task_assignments USING btree (status);


--
-- TOC entry 3402 (class 1259 OID 57370)
-- Name: idx_task_assignments_task_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_task_assignments_task_id ON public.task_assignments USING btree (task_id);


--
-- TOC entry 3403 (class 1259 OID 57371)
-- Name: idx_task_assignments_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_task_assignments_user_id ON public.task_assignments USING btree (user_id);


--
-- TOC entry 3384 (class 1259 OID 49229)
-- Name: idx_tasks_contract_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tasks_contract_id ON public.tasks USING btree (contract_id) WHERE (contract_id IS NOT NULL);


--
-- TOC entry 3385 (class 1259 OID 49227)
-- Name: idx_tasks_group; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tasks_group ON public.tasks USING btree ("group");


--
-- TOC entry 3386 (class 1259 OID 65589)
-- Name: idx_tasks_related_contract; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tasks_related_contract ON public.tasks USING btree (related_contract_id) WHERE (related_contract_id IS NOT NULL);


--
-- TOC entry 3387 (class 1259 OID 65588)
-- Name: idx_tasks_related_work; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tasks_related_work ON public.tasks USING btree (related_work_id) WHERE (related_work_id IS NOT NULL);


--
-- TOC entry 3388 (class 1259 OID 49228)
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- TOC entry 3389 (class 1259 OID 65590)
-- Name: idx_tasks_task_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tasks_task_type ON public.tasks USING btree (task_type) WHERE (task_type IS NOT NULL);


--
-- TOC entry 3454 (class 1259 OID 65643)
-- Name: idx_translation_contracts_component_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_translation_contracts_component_id ON public.translation_contracts USING btree (component_id) WHERE (component_id IS NOT NULL);


--
-- TOC entry 3455 (class 1259 OID 65561)
-- Name: idx_translation_contracts_contract_number; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_translation_contracts_contract_number ON public.translation_contracts USING btree (contract_number) WHERE (contract_number IS NOT NULL);


--
-- TOC entry 3456 (class 1259 OID 65560)
-- Name: idx_translation_contracts_work_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_translation_contracts_work_id ON public.translation_contracts USING btree (work_id);


--
-- TOC entry 3431 (class 1259 OID 57491)
-- Name: idx_user_groups_group_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_groups_group_id ON public.user_groups USING btree (group_id);


--
-- TOC entry 3432 (class 1259 OID 57490)
-- Name: idx_user_groups_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_groups_user_id ON public.user_groups USING btree (user_id);


--
-- TOC entry 3442 (class 1259 OID 73735)
-- Name: idx_user_roles_component_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_roles_component_id ON public.user_roles USING btree (component_id) WHERE (component_id IS NOT NULL);


--
-- TOC entry 3443 (class 1259 OID 57528)
-- Name: idx_user_roles_role_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_roles_role_id ON public.user_roles USING btree (role_id);


--
-- TOC entry 3444 (class 1259 OID 57527)
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- TOC entry 3375 (class 1259 OID 49221)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 3449 (class 1259 OID 65642)
-- Name: idx_works_component_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_works_component_id ON public.works USING btree (component_id) WHERE (component_id IS NOT NULL);


--
-- TOC entry 3450 (class 1259 OID 65546)
-- Name: idx_works_document_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_works_document_code ON public.works USING btree (document_code) WHERE (document_code IS NOT NULL);


--
-- TOC entry 3451 (class 1259 OID 65545)
-- Name: idx_works_stage; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_works_stage ON public.works USING btree (stage) WHERE (stage IS NOT NULL);


--
-- TOC entry 3447 (class 1259 OID 73734)
-- Name: user_roles_user_role_component_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX user_roles_user_role_component_key ON public.user_roles USING btree (user_id, role_id, component_id) WHERE (component_id IS NOT NULL);


--
-- TOC entry 3448 (class 1259 OID 73733)
-- Name: user_roles_user_role_global_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX user_roles_user_role_global_key ON public.user_roles USING btree (user_id, role_id) WHERE (component_id IS NULL);


--
-- TOC entry 3513 (class 2620 OID 57531)
-- Name: contract_members contract_members_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER contract_members_updated_at BEFORE UPDATE ON public.contract_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3509 (class 2620 OID 49234)
-- Name: contracts contracts_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3515 (class 2620 OID 57533)
-- Name: document_contracts document_contracts_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER document_contracts_updated_at BEFORE UPDATE ON public.document_contracts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3514 (class 2620 OID 57532)
-- Name: document_tasks document_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER document_tasks_updated_at BEFORE UPDATE ON public.document_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3511 (class 2620 OID 49236)
-- Name: documents documents_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3516 (class 2620 OID 57534)
-- Name: groups groups_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3518 (class 2620 OID 57536)
-- Name: roles roles_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3512 (class 2620 OID 57530)
-- Name: task_assignments task_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER task_assignments_updated_at BEFORE UPDATE ON public.task_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3510 (class 2620 OID 49235)
-- Name: tasks tasks_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3517 (class 2620 OID 57535)
-- Name: user_groups user_groups_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER user_groups_updated_at BEFORE UPDATE ON public.user_groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3519 (class 2620 OID 57537)
-- Name: user_roles user_roles_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3508 (class 2620 OID 49233)
-- Name: users users_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3486 (class 2606 OID 57387)
-- Name: contract_members contract_members_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contract_members
    ADD CONSTRAINT contract_members_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- TOC entry 3487 (class 2606 OID 57392)
-- Name: contract_members contract_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contract_members
    ADD CONSTRAINT contract_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3503 (class 2606 OID 65620)
-- Name: contract_stages contract_stages_proofreading_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contract_stages
    ADD CONSTRAINT contract_stages_proofreading_contract_id_fkey FOREIGN KEY (proofreading_contract_id) REFERENCES public.proofreading_contracts(id) ON DELETE CASCADE;


--
-- TOC entry 3504 (class 2606 OID 65615)
-- Name: contract_stages contract_stages_translation_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contract_stages
    ADD CONSTRAINT contract_stages_translation_contract_id_fkey FOREIGN KEY (translation_contract_id) REFERENCES public.translation_contracts(id) ON DELETE CASCADE;


--
-- TOC entry 3490 (class 2606 OID 57444)
-- Name: document_contracts document_contracts_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_contracts
    ADD CONSTRAINT document_contracts_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- TOC entry 3491 (class 2606 OID 57439)
-- Name: document_contracts document_contracts_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_contracts
    ADD CONSTRAINT document_contracts_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- TOC entry 3488 (class 2606 OID 57414)
-- Name: document_tasks document_tasks_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_tasks
    ADD CONSTRAINT document_tasks_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- TOC entry 3489 (class 2606 OID 57419)
-- Name: document_tasks document_tasks_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_tasks
    ADD CONSTRAINT document_tasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- TOC entry 3481 (class 2606 OID 49206)
-- Name: documents documents_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;


--
-- TOC entry 3482 (class 2606 OID 49211)
-- Name: documents documents_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- TOC entry 3483 (class 2606 OID 49216)
-- Name: documents documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3505 (class 2606 OID 73756)
-- Name: notifications notifications_task_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_task_assignment_id_fkey FOREIGN KEY (task_assignment_id) REFERENCES public.task_assignments(id) ON DELETE CASCADE;


--
-- TOC entry 3506 (class 2606 OID 73751)
-- Name: notifications notifications_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- TOC entry 3507 (class 2606 OID 73746)
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3500 (class 2606 OID 65637)
-- Name: proofreading_contracts proofreading_contracts_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.proofreading_contracts
    ADD CONSTRAINT proofreading_contracts_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.components(id);


--
-- TOC entry 3501 (class 2606 OID 65575)
-- Name: proofreading_contracts proofreading_contracts_translation_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.proofreading_contracts
    ADD CONSTRAINT proofreading_contracts_translation_contract_id_fkey FOREIGN KEY (translation_contract_id) REFERENCES public.translation_contracts(id);


--
-- TOC entry 3502 (class 2606 OID 65570)
-- Name: proofreading_contracts proofreading_contracts_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.proofreading_contracts
    ADD CONSTRAINT proofreading_contracts_work_id_fkey FOREIGN KEY (work_id) REFERENCES public.works(id);


--
-- TOC entry 3484 (class 2606 OID 57360)
-- Name: task_assignments task_assignments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- TOC entry 3485 (class 2606 OID 57365)
-- Name: task_assignments task_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3479 (class 2606 OID 49191)
-- Name: tasks tasks_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;


--
-- TOC entry 3480 (class 2606 OID 65583)
-- Name: tasks tasks_related_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_related_work_id_fkey FOREIGN KEY (related_work_id) REFERENCES public.works(id);


--
-- TOC entry 3498 (class 2606 OID 65632)
-- Name: translation_contracts translation_contracts_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.translation_contracts
    ADD CONSTRAINT translation_contracts_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.components(id);


--
-- TOC entry 3499 (class 2606 OID 65555)
-- Name: translation_contracts translation_contracts_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.translation_contracts
    ADD CONSTRAINT translation_contracts_work_id_fkey FOREIGN KEY (work_id) REFERENCES public.works(id);


--
-- TOC entry 3492 (class 2606 OID 57485)
-- Name: user_groups user_groups_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- TOC entry 3493 (class 2606 OID 57480)
-- Name: user_groups user_groups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3494 (class 2606 OID 73728)
-- Name: user_roles user_roles_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.components(id) ON DELETE SET NULL;


--
-- TOC entry 3495 (class 2606 OID 57522)
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 3496 (class 2606 OID 57517)
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3497 (class 2606 OID 65627)
-- Name: works works_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.works
    ADD CONSTRAINT works_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.components(id);


--
-- TOC entry 2155 (class 826 OID 16394)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- TOC entry 2154 (class 826 OID 16393)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


-- Completed on 2026-02-02 16:14:22

--
-- PostgreSQL database dump complete
--

\unrestrict lJQZniL8e1jEzLcuVw7iWuZrYDE3UUrH9e71oIp0dPhjYfRgyqNY7QZ9W6Agfyd

