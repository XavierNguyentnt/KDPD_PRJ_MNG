--
-- PostgreSQL database dump
--

\restrict yaL0CLFRWs9JUSLTJXKK8648vHiheRqcu4dPJEJeEAun5OAIlhRlaJOfw06Vv7n

-- Dumped from database version 17.7 (bdd1736)
-- Dumped by pg_dump version 17.7

-- Started on 2026-02-12 12:00:46

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
-- TOC entry 8 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- TOC entry 3680 (class 0 OID 0)
-- Dependencies: 8
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 254 (class 1255 OID 24657)
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
-- TOC entry 242 (class 1259 OID 65591)
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
-- TOC entry 3681 (class 0 OID 0)
-- Dependencies: 242
-- Name: TABLE components; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.components IS 'Hợp phần dịch thuật: dùng để phân loại tác phẩm và hợp đồng (VD: Phật tạng toàn dịch, Phật điển, Nho tạng).';


--
-- TOC entry 235 (class 1259 OID 57456)
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
-- TOC entry 3682 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE groups; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.groups IS 'Nhóm công việc / nhóm nhân sự. 1 nhân sự có thể thuộc nhiều nhóm (user_groups).';


--
-- TOC entry 3683 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN groups.code; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.groups.code IS 'Mã ổn định: bien_tap, thu_ky_hop_phan, cv_chung, thiet_ke_cntt, quet_trung_lap.';


--
-- TOC entry 243 (class 1259 OID 73736)
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
-- TOC entry 3684 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE notifications; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.notifications IS 'Thông báo cho nhân sự: task_assigned, task_due_soon, task_overdue.';


--
-- TOC entry 246 (class 1259 OID 90144)
-- Name: payments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid,
    payment_type text,
    voucher_no text,
    payment_date date,
    amount numeric(15,2) NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payments OWNER TO neondb_owner;

--
-- TOC entry 3685 (class 0 OID 0)
-- Dependencies: 246
-- Name: TABLE payments; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.payments IS 'Mỗi lần chi tiền = 1 record (tạm ứng/quyết toán/khác).';


--
-- TOC entry 3686 (class 0 OID 0)
-- Dependencies: 246
-- Name: COLUMN payments.payment_type; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.payments.payment_type IS 'advance | settlement | other';


--
-- TOC entry 245 (class 1259 OID 81943)
-- Name: proofreading_contract_members; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.proofreading_contract_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    proofreading_contract_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.proofreading_contract_members OWNER TO neondb_owner;

--
-- TOC entry 3687 (class 0 OID 0)
-- Dependencies: 245
-- Name: TABLE proofreading_contract_members; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.proofreading_contract_members IS 'Bảng trung gian proofreading_contracts-users: ai là người hiệu đính/người tham gia hợp đồng hiệu đính. Role "partner" lưu trong user_roles.';


--
-- TOC entry 241 (class 1259 OID 65562)
-- Name: proofreading_contracts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.proofreading_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_number text,
    work_id uuid,
    translation_contract_id uuid,
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
-- TOC entry 3688 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE proofreading_contracts; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.proofreading_contracts IS 'Hợp đồng hiệu đính (theo dõi hợp đồng hiệu đính). Thông tin người hiệu đính lưu trong bảng proofreading_contract_members.';


--
-- TOC entry 3689 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN proofreading_contracts.component_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.proofreading_contracts.component_id IS 'Hợp phần (phân loại hợp đồng); có thể suy từ work_id hoặc set trực tiếp.';


--
-- TOC entry 237 (class 1259 OID 57493)
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
-- TOC entry 3690 (class 0 OID 0)
-- Dependencies: 237
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.roles IS 'Vai trò phân quyền. 1 nhân sự có thể có nhiều vai trò (user_roles). Dùng cho quyền xem/sửa task.';


--
-- TOC entry 3691 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN roles.code; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.roles.code IS 'Mã ổn định: admin, manager, employee (hoặc chi tiết: task_view, task_edit, task_approve, ...).';


--
-- TOC entry 233 (class 1259 OID 49238)
-- Name: session; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO neondb_owner;

--
-- TOC entry 234 (class 1259 OID 57344)
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
-- TOC entry 3692 (class 0 OID 0)
-- Dependencies: 234
-- Name: TABLE task_assignments; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.task_assignments IS 'Bảng trung gian users-tasks: 1 task nhiều nhân sự, mỗi lần giao có ngày nhận / ngày hoàn thành dự kiến / ngày hoàn thành thực tế.';


--
-- TOC entry 3693 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN task_assignments.stage_type; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.task_assignments.stage_type IS 'primary | btv1 | btv2 | doc_duyet (primary = gán việc đơn từ tasks.assignee_id cũ).';


--
-- TOC entry 3694 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN task_assignments.received_at; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.task_assignments.received_at IS 'Ngày nhận công việc.';


--
-- TOC entry 3695 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN task_assignments.due_date; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.task_assignments.due_date IS 'Ngày hoàn thành dự kiến.';


--
-- TOC entry 3696 (class 0 OID 0)
-- Dependencies: 234
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
-- TOC entry 3697 (class 0 OID 0)
-- Dependencies: 232
-- Name: TABLE tasks; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.tasks IS 'Công việc (chỉ thông tin task-level). Người giao, ngày nhận/hoàn thành: bảng task_assignments.';


--
-- TOC entry 3698 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN tasks."group"; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.tasks."group" IS 'Nhóm CV: CV chung, Biên tập, Thiết kế + CNTT, Quét trùng lặp';


--
-- TOC entry 3699 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN tasks.task_type; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.tasks.task_type IS 'GENERAL | TRANSLATION | PROOFREADING | ...; NULL/legacy coi như GENERAL.';


--
-- TOC entry 3700 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN tasks.related_work_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.tasks.related_work_id IS 'Gắn task với work (tác phẩm). Optional.';


--
-- TOC entry 3701 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN tasks.related_contract_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.tasks.related_contract_id IS 'UUID của translation_contracts(id) hoặc proofreading_contracts(id); kiểm tra ở app theo task_type.';


--
-- TOC entry 3702 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN tasks.vote; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.tasks.vote IS 'Đánh giá công việc của Người kiểm soát: tot | kha | khong_tot | khong_hoan_thanh';


--
-- TOC entry 244 (class 1259 OID 81920)
-- Name: translation_contract_members; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.translation_contract_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    translation_contract_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.translation_contract_members OWNER TO neondb_owner;

--
-- TOC entry 3703 (class 0 OID 0)
-- Dependencies: 244
-- Name: TABLE translation_contract_members; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.translation_contract_members IS 'Bảng trung gian translation_contracts-users: ai là dịch giả/người tham gia hợp đồng dịch thuật. Role "partner" lưu trong user_roles.';


--
-- TOC entry 240 (class 1259 OID 65547)
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
    translation_value numeric(15,2),
    progress_check_date date,
    expert_review_date date,
    project_acceptance_date date,
    status text,
    cancelled_at date,
    proofreading_in_progress boolean DEFAULT false,
    editing_in_progress boolean DEFAULT false,
    print_transfer_date date,
    published_date date,
    proofreading_completed boolean DEFAULT false,
    editing_completed boolean DEFAULT false,
    advance_include_overview boolean DEFAULT false,
    advance_1_percent numeric,
    advance_2_percent numeric,
    is_settled boolean DEFAULT false
);


ALTER TABLE public.translation_contracts OWNER TO neondb_owner;

--
-- TOC entry 3704 (class 0 OID 0)
-- Dependencies: 240
-- Name: TABLE translation_contracts; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.translation_contracts IS 'Hợp đồng dịch thuật (theo dõi hợp đồng dịch thuật).';


--
-- TOC entry 3705 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN translation_contracts.component_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.translation_contracts.component_id IS 'Hợp phần (phân loại hợp đồng); có thể suy từ work_id hoặc set trực tiếp.';


--
-- TOC entry 3706 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN translation_contracts.overview_value; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.translation_contracts.overview_value IS 'Kinh phí viết bài tổng quan (người dùng nhập)';


--
-- TOC entry 3707 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN translation_contracts.translation_value; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.translation_contracts.translation_value IS 'Kinh phí dịch thuật = đơn giá * số trang dự tính';


--
-- TOC entry 3708 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN translation_contracts.advance_include_overview; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.translation_contracts.advance_include_overview IS 'Có bao gồm kinh phí bài tổng quan trong tính toán tạm ứng không';


--
-- TOC entry 3709 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN translation_contracts.advance_1_percent; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.translation_contracts.advance_1_percent IS 'Tỷ lệ tạm ứng lần 1 (%)';


--
-- TOC entry 3710 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN translation_contracts.advance_2_percent; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.translation_contracts.advance_2_percent IS 'Tỷ lệ tạm ứng lần 2 (%)';


--
-- TOC entry 3711 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN translation_contracts.is_settled; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.translation_contracts.is_settled IS 'Đã tất toán (công nợ = 0)';


--
-- TOC entry 236 (class 1259 OID 57470)
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
-- TOC entry 3712 (class 0 OID 0)
-- Dependencies: 236
-- Name: TABLE user_groups; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.user_groups IS 'Bảng trung gian users-groups: 1 nhân sự thuộc nhiều nhóm (vd: vừa Biên tập vừa Thư ký hợp phần).';


--
-- TOC entry 238 (class 1259 OID 57507)
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
-- TOC entry 3713 (class 0 OID 0)
-- Dependencies: 238
-- Name: TABLE user_roles; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.user_roles IS 'Bảng trung gian users-roles: 1 nhân sự có nhiều vai trò. component_id: hợp phần (vd Thư ký hợp phần); NULL = toàn cục.';


--
-- TOC entry 3714 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN user_roles.component_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.user_roles.component_id IS 'Hợp phần áp dụng cho vai trò (vd: Thư ký hợp phần). NULL = vai trò toàn cục (Admin/Manager/Employee).';


--
-- TOC entry 231 (class 1259 OID 49152)
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
-- TOC entry 3715 (class 0 OID 0)
-- Dependencies: 231
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.users IS 'Nhân sự. Vai trò: bảng user_roles. Nhóm: bảng user_groups.';


--
-- TOC entry 3716 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN users.department; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.users.department IS 'Đơn vị: 1 nhân sự chỉ thuộc một department (vd: Ban Thư ký).';


--
-- TOC entry 239 (class 1259 OID 65536)
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
-- TOC entry 3717 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE works; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.works IS 'Tác phẩm / công việc nguồn (trục nghiệp vụ bền vững).';


--
-- TOC entry 3718 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN works.component_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.works.component_id IS 'Hợp phần dịch thuật (phân loại tác phẩm).';


--
-- TOC entry 3670 (class 0 OID 65591)
-- Dependencies: 242
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
-- TOC entry 3663 (class 0 OID 57456)
-- Dependencies: 235
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.groups (id, code, name, description, created_at, updated_at) FROM stdin;
f4adb090-2b47-4ebc-8e9f-94be393e5228	manager	Quản lý	Nhóm quản lý	2026-01-29 10:24:00.102403+00	2026-01-29 10:24:00.102403+00
3e0ba4ba-6ad8-4624-ae9c-891232056b28	thong_thuong	Thông thường	Nhân sự Dự án nói chung	2026-01-29 05:12:54.640797+00	2026-01-29 10:24:00.190793+00
d4b1672f-f8f9-4936-acd6-90a750757e5c	bien_tap	Biên tập	Nhóm biên tập	2026-01-29 05:12:54.640797+00	2026-01-29 10:24:27.12318+00
985a7b8c-f5e5-4b55-ab7d-42a397ddee34	hop_phan_dich_thuat	Hợp phần dịch thuật	Nhóm thư ký hợp phần	2026-01-29 05:12:54.640797+00	2026-01-29 10:25:26.983241+00
03b38e9c-5e81-41ff-be3a-8ed75b24ecda	it	Kỹ thuật	Nhóm nhân sự phụ trách CNTT	2026-01-29 10:21:24.851979+00	2026-01-29 10:27:19.181145+00
66df46df-2814-428d-996e-a5aaeff4c263	thiet_ke	Thiết kế 	Nhóm thiết kế và CNTT	2026-01-29 05:12:54.640797+00	2026-02-12 04:46:22.620886+00
\.


--
-- TOC entry 3671 (class 0 OID 73736)
-- Dependencies: 243
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.notifications (id, user_id, type, task_id, task_assignment_id, title, message, is_read, created_at, read_at) FROM stdin;
ec35bd0c-eaad-4cde-bf3e-b2373d740001	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	task_overdue	task-1769780386538-0jvd1hm	2f657443-aa24-4000-abf5-cdf778b3c972	Công việc đã quá hạn	Đã quá hạn (2025-05-31): Điều chỉnh và hoàn thành Thuyết minh và Dự toán Đề án Diệu Liên GĐ2	t	2026-02-02 09:41:34.363+00	2026-02-02 09:42:22.291+00
b7524300-5ebc-44c5-b6dc-ef2f074cf201	fa3da8df-1bc3-43fb-be3f-25bbfdf3113b	task_assigned	task-1770092467619-0etmrjo	fe9a2aeb-f830-44ff-832f-0d45912d8138	Công việc mới được giao	Bạn được giao: Biên tập B1 Thành Duy thức luận	f	2026-02-03 04:21:07.816+00	\N
e8b15de5-f61c-41f4-8120-adef8c589b4b	02cfd1a3-7a97-4187-914c-55fee83f380e	task_assigned	task-1770092467619-0etmrjo	628b90c0-efb0-4c21-b6ad-b34f0ea93061	Công việc mới được giao	Bạn được giao: Biên tập B1 Thành Duy thức luận	f	2026-02-03 04:21:07.966+00	\N
17f6108a-f2be-4302-ad89-a4e0b70d197c	732a44be-0c38-4334-8897-63e49094c6e5	task_assigned	task-1770092467619-0etmrjo	aae311b9-5b86-4f2f-8576-9f87af6154ca	Công việc mới được giao	Bạn được giao: Biên tập B1 Thành Duy thức luận	f	2026-02-03 04:21:08.103+00	\N
10eeeab2-b0ac-4f7e-9720-177f9400ecf0	11817e25-7e55-4b0d-82ef-9ff26de11efa	task_assigned	task-1770093058832-pauzos1	d0002af7-0b97-410c-aead-62401b88ebc3	Công việc mới được giao	Bạn được giao: Biên tập B1 thô Đại Tuệ Phổ Giác thiền sư ngữ lục	f	2026-02-03 04:31:41.244+00	\N
f576304e-4e16-4b3f-b275-5f686f326a5f	e177e33b-2720-4a23-ac89-a8a4c93857b3	task_assigned	task-1770093058832-pauzos1	c448c2cb-2334-4166-8c96-df95b9062290	Công việc mới được giao	Bạn được giao: Biên tập B1 thô Đại Tuệ Phổ Giác thiền sư ngữ lục	f	2026-02-03 04:31:41.418+00	\N
dbb3adc8-917e-4178-afd2-db782a4b713f	732a44be-0c38-4334-8897-63e49094c6e5	task_assigned	task-1770093058832-pauzos1	52b45432-bdf2-4f1a-af5f-331ab147f611	Công việc mới được giao	Bạn được giao: Biên tập B1 thô Đại Tuệ Phổ Giác thiền sư ngữ lục	f	2026-02-03 04:31:41.594+00	\N
f4929ca7-c99d-4bdf-9fbf-322750a11cfe	50ee08d4-15aa-406a-98c5-d2b26ce1a83b	task_assigned	task-1770093413097-qt9ornw	b7ecdb9c-e317-4b29-9f3b-f6c99bdd5a9e	Công việc mới được giao	Bạn được giao: Biên tập B1 Lục Tổ đàn kinh	f	2026-02-03 04:39:59.045+00	\N
b8f743be-dde4-422a-8199-946db6e36984	9f59f810-2c2a-4242-b56c-77d4bdf73391	task_assigned	task-1770093413097-qt9ornw	3c94df9e-d900-4ccf-8cdd-db22ba37718c	Công việc mới được giao	Bạn được giao: Biên tập B1 Lục Tổ đàn kinh	f	2026-02-03 04:39:59.183+00	\N
a9379836-f483-4027-b13f-a03e4240459b	732a44be-0c38-4334-8897-63e49094c6e5	task_assigned	task-1770093413097-qt9ornw	3bad8702-203e-45dd-9740-f17cfd80711e	Công việc mới được giao	Bạn được giao: Biên tập B1 Lục Tổ đàn kinh	f	2026-02-03 04:39:59.32+00	\N
96c98086-6797-4623-94a3-cdb52fdc079a	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	task_assigned	task-1770025265225-4p44sml	d07ff5b9-9c99-44e2-939d-94fe04f9c8cc	Công việc mới được giao	Bạn được giao: Test thông báo	f	2026-02-03 07:54:00.963+00	\N
787597d8-7f22-4ba5-bd50-fd9e60b24c71	732a44be-0c38-4334-8897-63e49094c6e5	task_assigned	task-1770025265225-4p44sml	a4091b1c-e6e7-4f77-b6ab-04f58e22af23	Công việc mới được giao	Bạn được giao: Test thông báo	f	2026-02-03 07:54:01.131+00	\N
e5308157-1601-415f-8022-879bdc3315c4	0607714e-e265-4ed1-a36f-39cedd66f10f	task_assigned	task-1770106613228-echz1v7	a9309c4c-5bce-4c36-84e1-1447a724708f	Công việc mới được giao	Bạn được giao: Biên tập B1 Đại Đường Tây Vực ký	f	2026-02-03 08:16:53.394+00	\N
30326f87-a37f-48dc-8cdc-2414fddd9391	02cfd1a3-7a97-4187-914c-55fee83f380e	task_assigned	task-1770106613228-echz1v7	b9ff0d15-904e-41ec-98bc-806e24bf7afd	Công việc mới được giao	Bạn được giao: Biên tập B1 Đại Đường Tây Vực ký	f	2026-02-03 08:16:53.555+00	\N
5339b64c-68bc-4087-8d2e-2d04c8b1f2e5	732a44be-0c38-4334-8897-63e49094c6e5	task_assigned	task-1770106613228-echz1v7	7c40ff93-b693-4d8b-bd5e-16306fb8cd41	Công việc mới được giao	Bạn được giao: Biên tập B1 Đại Đường Tây Vực ký	f	2026-02-03 08:16:53.716+00	\N
7858aec4-8be8-457b-a2d5-ddc4ab1c6045	02cfd1a3-7a97-4187-914c-55fee83f380e	task_assigned	task-1770107115223-ivlwesu	1c81a35c-e4ab-4494-824c-dfc25927d114	Công việc mới được giao	Bạn được giao: Biên tập bông thô Phật quốc ký	f	2026-02-03 08:25:15.659+00	\N
be318fad-8f14-48a1-9409-4e96230883c7	fa3da8df-1bc3-43fb-be3f-25bbfdf3113b	task_assigned	task-1770107115223-ivlwesu	b890362f-3f82-4d2d-8658-f256665e3015	Công việc mới được giao	Bạn được giao: Biên tập bông thô Phật quốc ký	f	2026-02-03 08:25:15.835+00	\N
7d5071b1-d92f-45ea-bfea-9895018bb133	732a44be-0c38-4334-8897-63e49094c6e5	task_assigned	task-1770107115223-ivlwesu	5dcd73cc-8c64-4dc5-ab9f-17e732797ea5	Công việc mới được giao	Bạn được giao: Biên tập bông thô Phật quốc ký	f	2026-02-03 08:25:16.012+00	\N
0d786b3e-1c06-4d72-b9f8-3ba034968ef7	e177e33b-2720-4a23-ac89-a8a4c93857b3	task_assigned	task-1770107984593-w0ia255	24babcd9-cf95-497d-878c-6e8f10336489	Công việc mới được giao	Bạn được giao: BT bông 3 + 4 tinh Triệu luận khổ 19x27cm	f	2026-02-03 08:39:45.54+00	\N
e2abed27-d5fa-4d98-9ebc-11bbeadf6c97	11817e25-7e55-4b0d-82ef-9ff26de11efa	task_assigned	task-1770107984593-w0ia255	497cbfbe-b552-452e-88c5-d0e7b29a8bb4	Công việc mới được giao	Bạn được giao: BT bông 3 + 4 tinh Triệu luận khổ 19x27cm	f	2026-02-03 08:39:45.701+00	\N
8772b8af-23a4-4f25-b548-390b7dcb552b	732a44be-0c38-4334-8897-63e49094c6e5	task_assigned	task-1770107984593-w0ia255	97f66d10-4b76-480b-967e-52f0f526d74d	Công việc mới được giao	Bạn được giao: BT bông 3 + 4 tinh Triệu luận khổ 19x27cm	f	2026-02-03 08:39:45.864+00	\N
422d9101-5fed-4148-9b18-b5193989fb01	e177e33b-2720-4a23-ac89-a8a4c93857b3	task_assigned	task-1770108155026-gn5e2ar	92c29508-2fae-45eb-8856-0e6b97d8c39b	Công việc mới được giao	Bạn được giao: BT bông 3 tinh Biện trung biên luận khổ 19x27cm	f	2026-02-03 08:42:35.164+00	\N
7cdf6bfc-fb96-45d4-84e9-31d7dadb860e	11817e25-7e55-4b0d-82ef-9ff26de11efa	task_assigned	task-1770108155026-gn5e2ar	907f66e9-4b15-401a-a809-dacd7407785e	Công việc mới được giao	Bạn được giao: BT bông 3 tinh Biện trung biên luận khổ 19x27cm	f	2026-02-03 08:42:35.3+00	\N
b1dc495e-044d-47d2-95e9-09fb761e8d5e	732a44be-0c38-4334-8897-63e49094c6e5	task_assigned	task-1770108155026-gn5e2ar	d1185d81-47f6-44f8-b9cd-8bdb45282174	Công việc mới được giao	Bạn được giao: BT bông 3 tinh Biện trung biên luận khổ 19x27cm	f	2026-02-03 08:42:35.436+00	\N
447581b5-49e2-461f-ba2d-df38385b2c0f	02cfd1a3-7a97-4187-914c-55fee83f380e	task_assigned	task-1770108296334-wszsl91	c5f469d8-eab5-476b-8bef-f953f956932a	Công việc mới được giao	Bạn được giao: BT bông thô Nam Hải ký quy nội pháp truyện	f	2026-02-03 08:44:56.502+00	\N
496dd57d-415a-4c70-a06e-1152b10149e6	6cd0ecee-eb79-463b-84a8-9932c54c7cc2	task_assigned	task-1770108296334-wszsl91	6edbe089-670d-495d-9d92-f9ce118c0880	Công việc mới được giao	Bạn được giao: BT bông thô Nam Hải ký quy nội pháp truyện	f	2026-02-03 08:44:56.671+00	\N
724de370-9049-49d6-a4bf-3c78ba3ef868	e177e33b-2720-4a23-ac89-a8a4c93857b3	task_assigned	task-1770107398548-5p1cgro	897f94d0-ede7-4d4c-86f4-7b491f31a299	Công việc mới được giao	Bạn được giao: BT Bông 2 tinh Biện trung biên luận khổ 19x27cm	f	2026-02-03 09:04:14.898+00	\N
4979802c-57bf-4ea6-b97b-36d47fcf79b0	11817e25-7e55-4b0d-82ef-9ff26de11efa	task_assigned	task-1770107398548-5p1cgro	b8136734-1162-4c69-a167-b992acb6a9f4	Công việc mới được giao	Bạn được giao: BT Bông 2 tinh Biện trung biên luận khổ 19x27cm	f	2026-02-03 09:04:15.034+00	\N
ec50eac6-a0a4-4f38-8c54-b961fa27a75c	732a44be-0c38-4334-8897-63e49094c6e5	task_assigned	task-1770107398548-5p1cgro	a6cd4aa4-0964-4927-877f-bda82ca85e67	Công việc mới được giao	Bạn được giao: BT Bông 2 tinh Biện trung biên luận khổ 19x27cm	f	2026-02-03 09:04:15.166+00	\N
94ae8117-58b9-4501-abc1-4709a1f0d534	ccedb4bb-b523-4a4e-a628-ccdcdb1cdef2	task_assigned	task-1770116220103-mo0p10t	7c79a7ca-2447-4889-abf9-a55ea1462a1a	Công việc mới được giao	Bạn được giao: Biên tập bông chuyển in Quan Âm tế độ diễn nghĩa kinh	f	2026-02-03 10:57:00.243+00	\N
121d7eba-5ed1-4af6-9190-5b55dbf2e0f3	6cd0ecee-eb79-463b-84a8-9932c54c7cc2	task_assigned	task-1770116220103-mo0p10t	bec22bef-8013-4bb6-86cf-866becb07055	Công việc mới được giao	Bạn được giao: Biên tập bông chuyển in Quan Âm tế độ diễn nghĩa kinh	f	2026-02-03 10:57:00.384+00	\N
24d4e98e-ecc5-41f8-b177-d89973ef97fb	732a44be-0c38-4334-8897-63e49094c6e5	task_assigned	task-1770116220103-mo0p10t	38658ebf-e9fd-41b0-a306-31f88a6f53ed	Công việc mới được giao	Bạn được giao: Biên tập bông chuyển in Quan Âm tế độ diễn nghĩa kinh	f	2026-02-03 10:57:00.519+00	\N
848c3025-e103-4be2-90f4-c3d0b0618c75	19c6c15c-c249-4410-9c37-2f19ca885bee	task_assigned	task-1770116361929-fw0sq35	99d1cccd-08c4-449a-8d52-a4e500647bbd	Công việc mới được giao	Bạn được giao: Biên tập B2 thô Thánh đăng lục	f	2026-02-03 10:59:22.09+00	\N
ae9a49d8-c2e9-447b-9737-2dc4b23fbdd4	a45f4e87-1449-4cd3-a32c-9b16b315b1f7	task_assigned	task-1770116361929-fw0sq35	01559ba9-a1c0-4801-aeeb-9a13a86c7ed4	Công việc mới được giao	Bạn được giao: Biên tập B2 thô Thánh đăng lục	f	2026-02-03 10:59:22.251+00	\N
3797bb2f-6c9d-481c-84d4-b0c564a6ef73	732a44be-0c38-4334-8897-63e49094c6e5	task_assigned	task-1770116361929-fw0sq35	1487ba0a-32ca-442c-89b5-77e56999a952	Công việc mới được giao	Bạn được giao: Biên tập B2 thô Thánh đăng lục	f	2026-02-03 10:59:22.413+00	\N
01aa31ae-8c93-4d7d-8cab-8711507a4284	11817e25-7e55-4b0d-82ef-9ff26de11efa	task_overdue	task-1770107984593-w0ia255	497cbfbe-b552-452e-88c5-d0e7b29a8bb4	Công việc đã quá hạn	Đã quá hạn (2025-12-20): BT bông 3 + 4 tinh Triệu luận khổ 19x27cm	f	2026-02-05 03:50:18.029+00	\N
c6d85e95-a0ba-4b1c-b640-669ad96b6ffa	52fa58ae-5f0a-4687-9d47-b0e5d3a210d3	task_overdue	task-1769829631251-rx6sotb	ed0fcf29-990f-47dd-a437-7e782e4ca3a0	Công việc đã quá hạn	Đã quá hạn (2025-10-29): Đọc thẩm định bản dịch NTCDA - tài liệu Trung dung - Đại học tiết yếu 	f	2026-02-05 03:50:19.813+00	\N
8dfcec0a-4ae0-4939-a8bd-1e4202233142	a45f4e87-1449-4cd3-a32c-9b16b315b1f7	task_overdue	task-1769829346523-mj93dpe	3114ad54-96ff-4477-9b2a-737e299b0939	Công việc đã quá hạn	Đã quá hạn (2025-09-30): Hỗ trợ xây dựng thuyết minh Thư tịch Phật giáo Việt Nam thư mục quan yếu (Hợp phần Phật điển Việt Nam)	f	2026-02-05 03:50:20.188+00	\N
55e9e443-a43a-43d0-8ae9-59a4a9af7cba	e177e33b-2720-4a23-ac89-a8a4c93857b3	task_overdue	task-1770107984593-w0ia255	24babcd9-cf95-497d-878c-6e8f10336489	Công việc đã quá hạn	Đã quá hạn (2025-12-20): BT bông 3 + 4 tinh Triệu luận khổ 19x27cm	f	2026-02-05 03:50:20.794+00	\N
3196756d-fe3f-46ea-911a-46fd4b46bec8	02cfd1a3-7a97-4187-914c-55fee83f380e	task_overdue	task-1770108296334-wszsl91	c5f469d8-eab5-476b-8bef-f953f956932a	Công việc đã quá hạn	Đã quá hạn (2026-01-25): BT bông thô Nam Hải ký quy nội pháp truyện	f	2026-02-05 03:50:21.223+00	\N
bf8d9e15-fc7e-407d-9f39-98f9ab19971f	02cfd1a3-7a97-4187-914c-55fee83f380e	task_overdue	task-1770107115223-ivlwesu	1c81a35c-e4ab-4494-824c-dfc25927d114	Công việc đã quá hạn	Đã quá hạn (2026-01-31): Biên tập bông thô Phật quốc ký	f	2026-02-05 03:50:21.446+00	\N
bd0f64ed-bbc9-4dea-85a8-dc929ab34c80	02cfd1a3-7a97-4187-914c-55fee83f380e	task_overdue	task-1770106613228-echz1v7	b9ff0d15-904e-41ec-98bc-806e24bf7afd	Công việc đã quá hạn	Đã quá hạn (2026-01-31): Biên tập B1 Đại Đường Tây Vực ký	f	2026-02-05 03:50:21.565+00	\N
15473969-e97e-4468-b534-e051e79d0804	0607714e-e265-4ed1-a36f-39cedd66f10f	task_overdue	task-1770106613228-echz1v7	a9309c4c-5bce-4c36-84e1-1447a724708f	Công việc đã quá hạn	Đã quá hạn (2026-01-31): Biên tập B1 Đại Đường Tây Vực ký	f	2026-02-05 03:50:22.087+00	\N
c6a07323-03a0-492e-a6af-b6ba5fbb152a	0607714e-e265-4ed1-a36f-39cedd66f10f	task_overdue	task-1769830334378-679953r	86074d8c-31ff-4a1f-a10e-0eb1161862dc	Công việc đã quá hạn	Đã quá hạn (2026-01-31): Hỗ trợ Dịch giả đọc đối chiếu Vân đài loại ngữ	f	2026-02-05 03:50:22.176+00	\N
0969eefa-d20a-4450-985d-88dbc20eb698	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	task_overdue	task-1770025265225-4p44sml	d07ff5b9-9c99-44e2-939d-94fe04f9c8cc	Công việc đã quá hạn	Đã quá hạn (2026-02-02): Test thông báo	f	2026-02-05 03:50:22.362+00	\N
70bedb7c-3290-43d4-bdc8-ce797335d95d	fa3da8df-1bc3-43fb-be3f-25bbfdf3113b	task_overdue	task-1770107115223-ivlwesu	b890362f-3f82-4d2d-8658-f256665e3015	Công việc đã quá hạn	Đã quá hạn (2026-01-31): Biên tập bông thô Phật quốc ký	f	2026-02-05 03:50:22.872+00	\N
5027a3e8-0565-42be-8fbd-2ef7336dff30	fa3da8df-1bc3-43fb-be3f-25bbfdf3113b	task_overdue	task-1770092467619-0etmrjo	fe9a2aeb-f830-44ff-832f-0d45912d8138	Công việc đã quá hạn	Đã quá hạn (2024-11-15): Biên tập B1 Thành Duy thức luận	f	2026-02-05 03:50:22.972+00	\N
dbae33cc-3341-4487-aa88-f5e2dcd709b1	94025b61-6607-4f2f-b2b4-f4567f14f0b8	task_overdue	task-1769830334378-679953r	266a79c6-9e25-4c3e-b5c6-acb0263db34e	Công việc đã quá hạn	Đã quá hạn (2026-01-31): Hỗ trợ Dịch giả đọc đối chiếu Vân đài loại ngữ	f	2026-02-05 03:50:23.336+00	\N
048dd361-047d-4f38-b32f-56ac4e1c7e15	e0f74135-4578-4c1c-9944-55f17046607b	task_assigned	task-1769917584523-1rj9w3a	d81df32f-de62-439f-95ad-cc8aa103bfb6	Công việc mới được giao	Bạn được giao: Hoàn thành HS Quyết toán HĐ dịch thuật - tài liệu Dị bộ tông luân luận (GĐ2)	f	2026-02-09 02:06:09.747+00	\N
c83a19db-4d1e-4f17-9715-779e96381085	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	task_assigned	task-1769917584523-1rj9w3a	e3848da3-c618-494e-80d2-9009c98638ec	Công việc mới được giao	Bạn được giao: Hoàn thành HS Quyết toán HĐ dịch thuật - tài liệu Dị bộ tông luân luận (GĐ2)	f	2026-02-09 02:06:09.9+00	\N
a52d3db5-235d-408b-8693-500411371c15	5a3dc6e5-c7d4-467b-aa3f-673312685b82	task_assigned	task-1769917584523-1rj9w3a	84f1309e-a6db-468c-a7a8-d45de41a0e21	Công việc mới được giao	Bạn được giao: Hoàn thành HS Quyết toán HĐ dịch thuật - tài liệu Dị bộ tông luân luận (GĐ2)	f	2026-02-09 02:06:10.054+00	\N
4d8b3f9a-78b3-4214-8219-99ae78f2960b	e0f74135-4578-4c1c-9944-55f17046607b	task_overdue	task-1769917584523-1rj9w3a	d81df32f-de62-439f-95ad-cc8aa103bfb6	Công việc đã quá hạn	Đã quá hạn (2025-07-15): Hoàn thành HS Quyết toán HĐ dịch thuật - tài liệu Dị bộ tông luân luận (GĐ2)	f	2026-02-09 02:08:38.156+00	\N
5586e28d-7d06-4206-ab75-0e2c1159fce2	5a3dc6e5-c7d4-467b-aa3f-673312685b82	task_overdue	task-1769917584523-1rj9w3a	84f1309e-a6db-468c-a7a8-d45de41a0e21	Công việc đã quá hạn	Đã quá hạn (2025-07-15): Hoàn thành HS Quyết toán HĐ dịch thuật - tài liệu Dị bộ tông luân luận (GĐ2)	f	2026-02-09 02:08:38.595+00	\N
2950c912-5344-4277-9b44-dce56e67862a	e0f74135-4578-4c1c-9944-55f17046607b	task_assigned	task-1769919533177-lpq21pi	7ce210fa-8090-4e16-bb0d-87de8ef72d18	Công việc mới được giao	Bạn được giao: Chuẩn bị Phiếu đề nghị (bổ sung 02 thành viên) + Phụ lục Hợp đồng dịch thuật tài liệu Tỳ kheo Ni truyện (GĐ 2)	f	2026-02-09 02:48:44.884+00	\N
064cb9ce-d6c4-4211-954e-4b31f3dfb3fc	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	task_assigned	task-1769919533177-lpq21pi	d6309689-ed70-480f-a571-72d15ca2c065	Công việc mới được giao	Bạn được giao: Chuẩn bị Phiếu đề nghị (bổ sung 02 thành viên) + Phụ lục Hợp đồng dịch thuật tài liệu Tỳ kheo Ni truyện (GĐ 2)	f	2026-02-09 02:48:45.051+00	\N
\.


--
-- TOC entry 3674 (class 0 OID 90144)
-- Dependencies: 246
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.payments (id, contract_id, payment_type, voucher_no, payment_date, amount, note, created_at, updated_at) FROM stdin;
56927a28-629c-4d18-b39b-e4a6fd061673	dccc3a19-400e-4be2-af63-b6bfd3b195eb	advance	\N	2021-12-20	24550000.00	\N	2026-02-10 03:51:16.195087+00	2026-02-10 03:51:16.195087+00
86f597b7-2ab1-4361-9275-80f79a2b7ec0	dccc3a19-400e-4be2-af63-b6bfd3b195eb	advance	\N	2022-10-28	9820000.00	\N	2026-02-10 03:52:05.997637+00	2026-02-10 03:52:05.997637+00
4272d31f-2a2a-48ce-8e44-94bc660ebf7c	dccc3a19-400e-4be2-af63-b6bfd3b195eb	settlement	\N	2025-06-20	29730000.00	\N	2026-02-10 04:02:19.575093+00	2026-02-10 09:37:35.7638+00
\.


--
-- TOC entry 3673 (class 0 OID 81943)
-- Dependencies: 245
-- Data for Name: proofreading_contract_members; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.proofreading_contract_members (id, proofreading_contract_id, user_id, created_at, updated_at) FROM stdin;
25e4b13b-b306-4425-ae85-5bc3ad0153c5	f9e4a990-ddcf-4a0c-9e2f-3c985d976e31	f1970916-c6fd-4be6-b11d-e3e1f3b91156	2026-02-04 11:28:02.44887+00	2026-02-04 11:28:02.44887+00
5c83adda-1b19-45d8-b111-d7725ed1f7fc	272bad4e-6f56-49be-a5a2-b2d46b7679aa	dd30777e-7b73-4cb0-a0b7-c235d1fd6323	2026-02-05 09:24:46.891208+00	2026-02-05 09:24:46.891208+00
0773b524-9b23-413d-a528-ba50b1de8da8	70ed6c85-9fcb-44f2-9fa0-01203d56c130	f927980c-d843-44df-b38d-b1488caf6968	2026-02-05 10:43:20.197092+00	2026-02-05 10:43:20.197092+00
\.


--
-- TOC entry 3669 (class 0 OID 65562)
-- Dependencies: 241
-- Data for Name: proofreading_contracts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.proofreading_contracts (id, contract_number, work_id, translation_contract_id, page_count, rate_ratio, contract_value, start_date, end_date, actual_completion_date, note, component_id) FROM stdin;
f9e4a990-ddcf-4a0c-9e2f-3c985d976e31	52/HĐ-VPKĐ	342b21b4-615b-4904-ba88-e423f3157de3	d08e3dfc-dc51-4fe4-9512-1336cc7d23b0	277	0.3	30930000	2024-01-02	2025-01-01	2024-12-10	Dịch giả tự hiệu đính	32037af6-b306-4ea7-af9d-ae766e67dde6
272bad4e-6f56-49be-a5a2-b2d46b7679aa	53/HĐ-VPKĐ	123eaa2b-84df-4da4-b244-fff1a49243a2	a0da34f9-98ed-414a-9468-dac36d46aad6	200	0.3	24000000	2024-01-02	2025-01-01	2024-12-10	Dịch giả tự hiệu đính	32037af6-b306-4ea7-af9d-ae766e67dde6
70ed6c85-9fcb-44f2-9fa0-01203d56c130	30/HĐ-VPKĐ	6dfd18f2-5bb9-4afb-aa8b-34b9798064e4	dccc3a19-400e-4be2-af63-b6bfd3b195eb	147	0.3	19230000	2025-09-04	2025-12-03	2025-09-30	\N	32037af6-b306-4ea7-af9d-ae766e67dde6
\.


--
-- TOC entry 3665 (class 0 OID 57493)
-- Dependencies: 237
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
b7a18021-605d-44bb-93e8-f127dcadae57	partner	Cộng tác viên	Cộng tác viên	2026-02-04 10:45:04.841492+00	2026-02-04 10:45:04.841492+00
38e363c5-5d8a-4df9-91eb-15184824b03c	technical	Kỹ thuật viên	Kỹ thuật viên CNTT	2026-02-12 03:39:19.451192+00	2026-02-12 03:39:19.451192+00
\.


--
-- TOC entry 3661 (class 0 OID 49238)
-- Dependencies: 233
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.session (sid, sess, expire) FROM stdin;
ykvmL22nBa828bCiSnFTAMvkofVeQV39	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-18T09:57:59.014Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-18 09:58:00
0vkiM3uEu31KyQ9BQXS3o4mtKM1SPAde	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-18T10:06:44.118Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-18 10:06:45
cu2ucxHxazt8zGi9I2sKnPlt0CXTQMPe	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-13T09:36:00.578Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-13 09:36:01
whFAP8_dd_2hwIb0_BBQozyoR8RcVQ2p	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-19T02:49:39.684Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-19 02:49:40
Qvm0tA4wSVNTQv3C8T4n40oYU14rc8FP	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-19T02:54:05.601Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-19 02:54:06
efsaDFxCJZ5XJgV43UVjCgtSiYDN65Ia	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-19T02:44:55.282Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-19 02:44:56
Esxsx3VtBw2lqyHMDW7IiCR_eQCYo1qx	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-13T09:54:51.550Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-13 09:54:52
xYKqirfz-z_Y_-4YBelBXkv4eN0G2DQD	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-17T16:58:37.350Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"e0f74135-4578-4c1c-9944-55f17046607b"}}	2026-02-17 17:13:33
wqEbCl1pbzQil5ubaw6U2JnJzYQ13V3q	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-13T09:58:37.170Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-13 09:58:38
thcilxF8t_LK9oOX6j8psfEkgnJyZve5	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-13T10:01:25.381Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-13 10:01:26
HdbQBOtZgAe2rulbVPXKRgk0kwSYBWMq	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-19T04:41:56.245Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-19 04:54:37
INpAKB2mxvIZFWHZ2IlKvyuKQmSKHdpo	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-13T09:27:00.661Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-13 09:27:01
dnBcIva9pWB_QT24EavdFi0Qu0n5xZdS	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-13T09:29:23.573Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"e0f74135-4578-4c1c-9944-55f17046607b"}}	2026-02-13 09:29:24
4hlkmMc4wobPqcdPN0TfVhfig-94QPiw	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-13T10:02:03.922Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-13 10:02:04
yNLXEKRx4bsmAwAjzPeLeE3NH9WvRjdR	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-13T10:12:46.748Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-13 10:12:47
jsKFm3GlX2YWHgNAzvwos06BOY82g44f	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-16T09:23:44.507Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-16 09:23:46
R9glCpgd3A07Ef1ITA-rL5LrQRBgJRDV	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-19T03:34:40.753Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"e0f74135-4578-4c1c-9944-55f17046607b"}}	2026-02-19 03:57:03
hLjlxsubcOXNqOP5TFj35-r61XSlweln	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-19T04:54:50.490Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"79a84794-8a33-4b27-ab86-e2ce152e46da"}}	2026-02-19 04:57:15
EFOYpMf9i3yKUgTot0nj9sWHBV6Un4vP	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-19T04:55:13.784Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-19 04:57:15
82nGxhlr7O5qx_OeiDV3yjxa1wkb6mfU	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-18T09:18:56.769Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"}}	2026-02-18 09:18:57
CNMvMP9iLwohNOMlYGe6-cf144Ci4skr	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-18T09:19:00.954Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"88d7b1cf-5818-4202-aa28-a36912e3c3ed"}}	2026-02-18 09:19:01
\.


--
-- TOC entry 3662 (class 0 OID 57344)
-- Dependencies: 234
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
b1987a5d-f4d9-4180-9186-ea876fa30355	task-1769776824967-rb9mw3u	99434b30-4982-48e9-8c81-b3466309537e	ktv_chinh	1	2026-01-07	2026-01-08	2026-01-08 00:00:00+00	completed	100	\N	2026-02-01 04:21:32.741766+00	2026-02-01 04:21:32.741766+00
fe9a2aeb-f830-44ff-832f-0d45912d8138	task-1770092467619-0etmrjo	fa3da8df-1bc3-43fb-be3f-25bbfdf3113b	btv2	1	2024-06-30	2024-11-15	\N	not_started	0	\N	2026-02-03 04:21:08.162496+00	2026-02-03 04:21:08.162496+00
628b90c0-efb0-4c21-b6ad-b34f0ea93061	task-1770092467619-0etmrjo	02cfd1a3-7a97-4187-914c-55fee83f380e	btv1	1	\N	\N	\N	not_started	0	\N	2026-02-03 04:21:08.313273+00	2026-02-03 04:21:08.313273+00
aae311b9-5b86-4f2f-8576-9f87af6154ca	task-1770092467619-0etmrjo	732a44be-0c38-4334-8897-63e49094c6e5	doc_duyet	1	\N	\N	\N	not_started	0	\N	2026-02-03 04:21:08.450851+00	2026-02-03 04:21:08.450851+00
d0002af7-0b97-410c-aead-62401b88ebc3	task-1770093058832-pauzos1	11817e25-7e55-4b0d-82ef-9ff26de11efa	btv2	1	2025-09-03	\N	\N	in_progress	0	\N	2026-02-03 04:31:41.585774+00	2026-02-03 04:31:41.585774+00
c448c2cb-2334-4166-8c96-df95b9062290	task-1770093058832-pauzos1	e177e33b-2720-4a23-ac89-a8a4c93857b3	btv1	1	2025-03-10	2025-08-15	2026-02-03 00:00:00+00	completed	100	\N	2026-02-03 04:31:41.760368+00	2026-02-03 04:31:41.760368+00
52b45432-bdf2-4f1a-af5f-331ab147f611	task-1770093058832-pauzos1	732a44be-0c38-4334-8897-63e49094c6e5	doc_duyet	1	\N	\N	\N	not_started	0	\N	2026-02-03 04:31:41.934859+00	2026-02-03 04:31:41.934859+00
b7ecdb9c-e317-4b29-9f3b-f6c99bdd5a9e	task-1770093413097-qt9ornw	50ee08d4-15aa-406a-98c5-d2b26ce1a83b	btv2	1	\N	\N	\N	not_started	0	\N	2026-02-03 04:39:59.403253+00	2026-02-03 04:39:59.403253+00
f3e21b59-9854-41cf-b8f7-556d34882d90	task-1769778057465-3hgvw9g	99434b30-4982-48e9-8c81-b3466309537e	ktv_chinh	1	2026-01-08	2026-01-08	2026-01-08 00:00:00+00	completed	100	\N	2026-01-30 13:12:05.207551+00	2026-01-30 13:12:05.207551+00
3c94df9e-d900-4ccf-8cdd-db22ba37718c	task-1770093413097-qt9ornw	9f59f810-2c2a-4242-b56c-77d4bdf73391	btv1	1	\N	\N	\N	not_started	0	\N	2026-02-03 04:39:59.540253+00	2026-02-03 04:39:59.540253+00
2f657443-aa24-4000-abf5-cdf778b3c972	task-1769780386538-0jvd1hm	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	nhan_su_1	1	2025-05-20	2025-05-31	\N	not_started	0	\N	2026-01-30 13:41:02.423731+00	2026-01-30 13:41:02.423731+00
a2a30cea-56bc-4ad9-b6c2-2d75cb98fc96	task-1769780386538-0jvd1hm	732a44be-0c38-4334-8897-63e49094c6e5	kiem_soat	1	\N	\N	\N	not_started	0	\N	2026-01-30 13:41:02.48064+00	2026-01-30 13:41:02.48064+00
3bad8702-203e-45dd-9740-f17cfd80711e	task-1770093413097-qt9ornw	732a44be-0c38-4334-8897-63e49094c6e5	doc_duyet	1	\N	\N	\N	not_started	0	\N	2026-02-03 04:39:59.677663+00	2026-02-03 04:39:59.677663+00
d07ff5b9-9c99-44e2-939d-94fe04f9c8cc	task-1770025265225-4p44sml	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	nhan_su_1	1	2026-02-02	2026-02-02	\N	not_started	0	\N	2026-02-03 07:54:01.406702+00	2026-02-03 07:54:01.406702+00
a4091b1c-e6e7-4f77-b6ab-04f58e22af23	task-1770025265225-4p44sml	732a44be-0c38-4334-8897-63e49094c6e5	kiem_soat	1	\N	\N	\N	not_started	0	\N	2026-02-03 07:54:01.574391+00	2026-02-03 07:54:01.574391+00
a9309c4c-5bce-4c36-84e1-1447a724708f	task-1770106613228-echz1v7	0607714e-e265-4ed1-a36f-39cedd66f10f	btv2	1	2025-08-28	2026-01-31	\N	in_progress	0	\N	2026-02-03 08:16:53.84977+00	2026-02-03 08:16:53.84977+00
b9ff0d15-904e-41ec-98bc-806e24bf7afd	task-1770106613228-echz1v7	02cfd1a3-7a97-4187-914c-55fee83f380e	btv1	1	2025-08-28	2026-01-31	\N	in_progress	0	\N	2026-02-03 08:16:54.01186+00	2026-02-03 08:16:54.01186+00
7c40ff93-b693-4d8b-bd5e-16306fb8cd41	task-1770106613228-echz1v7	732a44be-0c38-4334-8897-63e49094c6e5	doc_duyet	1	\N	\N	\N	not_started	0	\N	2026-02-03 08:16:54.172017+00	2026-02-03 08:16:54.172017+00
1c81a35c-e4ab-4494-824c-dfc25927d114	task-1770107115223-ivlwesu	02cfd1a3-7a97-4187-914c-55fee83f380e	btv2	1	2025-09-20	2026-01-31	\N	in_progress	0	\N	2026-02-03 08:25:15.869908+00	2026-02-03 08:25:15.869908+00
b890362f-3f82-4d2d-8658-f256665e3015	task-1770107115223-ivlwesu	fa3da8df-1bc3-43fb-be3f-25bbfdf3113b	btv1	1	2025-09-20	2026-01-31	\N	not_started	0	\N	2026-02-03 08:25:16.303989+00	2026-02-03 08:25:16.303989+00
5dcd73cc-8c64-4dc5-ab9f-17e732797ea5	task-1770107115223-ivlwesu	732a44be-0c38-4334-8897-63e49094c6e5	doc_duyet	1	\N	\N	\N	not_started	0	\N	2026-02-03 08:25:16.434944+00	2026-02-03 08:25:16.434944+00
ed0fcf29-990f-47dd-a437-7e782e4ca3a0	task-1769829631251-rx6sotb	52fa58ae-5f0a-4687-9d47-b0e5d3a210d3	nhan_su_1	1	2025-09-29	2025-10-29	\N	not_started	0	\N	2026-01-31 03:20:24.024789+00	2026-01-31 03:20:24.024789+00
24babcd9-cf95-497d-878c-6e8f10336489	task-1770107984593-w0ia255	e177e33b-2720-4a23-ac89-a8a4c93857b3	btv2	4	2025-12-01	2025-12-20	\N	completed	0	\N	2026-02-03 08:39:46.006547+00	2026-02-03 08:39:46.006547+00
497cbfbe-b552-452e-88c5-d0e7b29a8bb4	task-1770107984593-w0ia255	11817e25-7e55-4b0d-82ef-9ff26de11efa	btv1	4	2025-12-01	2025-12-20	\N	completed	0	\N	2026-02-03 08:39:46.168408+00	2026-02-03 08:39:46.168408+00
97f66d10-4b76-480b-967e-52f0f526d74d	task-1770107984593-w0ia255	732a44be-0c38-4334-8897-63e49094c6e5	doc_duyet	4	2025-12-20	\N	\N	completed	0	\N	2026-02-03 08:39:46.330795+00	2026-02-03 08:39:46.330795+00
92c29508-2fae-45eb-8856-0e6b97d8c39b	task-1770108155026-gn5e2ar	e177e33b-2720-4a23-ac89-a8a4c93857b3	btv2	3	2025-12-26	\N	\N	in_progress	0	\N	2026-02-03 08:42:35.637517+00	2026-02-03 08:42:35.637517+00
907f66e9-4b15-401a-a809-dacd7407785e	task-1770108155026-gn5e2ar	11817e25-7e55-4b0d-82ef-9ff26de11efa	btv1	3	2025-12-26	\N	\N	in_progress	0	\N	2026-02-03 08:42:35.774489+00	2026-02-03 08:42:35.774489+00
d1185d81-47f6-44f8-b9cd-8bdb45282174	task-1770108155026-gn5e2ar	732a44be-0c38-4334-8897-63e49094c6e5	doc_duyet	3	\N	\N	\N	not_started	0	\N	2026-02-03 08:42:35.910434+00	2026-02-03 08:42:35.910434+00
c5f469d8-eab5-476b-8bef-f953f956932a	task-1770108296334-wszsl91	02cfd1a3-7a97-4187-914c-55fee83f380e	btv2	1	2026-01-10	2026-01-25	\N	not_started	0	\N	2026-02-03 08:44:56.964192+00	2026-02-03 08:44:56.964192+00
6edbe089-670d-495d-9d92-f9ce118c0880	task-1770108296334-wszsl91	6cd0ecee-eb79-463b-84a8-9932c54c7cc2	btv1	1	2026-01-26	2026-03-31	\N	not_started	0	\N	2026-02-03 08:44:57.132856+00	2026-02-03 08:44:57.132856+00
897f94d0-ede7-4d4c-86f4-7b491f31a299	task-1770107398548-5p1cgro	e177e33b-2720-4a23-ac89-a8a4c93857b3	btv2	4	2025-11-04	2025-12-26	2025-12-18 00:00:00+00	completed	100	\N	2026-02-03 09:04:15.385602+00	2026-02-03 09:04:15.385602+00
b8136734-1162-4c69-a167-b992acb6a9f4	task-1770107398548-5p1cgro	11817e25-7e55-4b0d-82ef-9ff26de11efa	btv1	4	2025-11-04	2025-12-26	2025-12-18 00:00:00+00	completed	100	\N	2026-02-03 09:04:15.521294+00	2026-02-03 09:04:15.521294+00
a6cd4aa4-0964-4927-877f-bda82ca85e67	task-1770107398548-5p1cgro	732a44be-0c38-4334-8897-63e49094c6e5	doc_duyet	4	2025-12-18	2025-12-26	2025-12-26 00:00:00+00	completed	100	\N	2026-02-03 09:04:15.654276+00	2026-02-03 09:04:15.654276+00
7c79a7ca-2447-4889-abf9-a55ea1462a1a	task-1770116220103-mo0p10t	ccedb4bb-b523-4a4e-a628-ccdcdb1cdef2	btv2	3	2025-09-01	2026-01-20	2026-01-20 00:00:00+00	completed	100	\N	2026-02-03 10:57:00.782166+00	2026-02-03 10:57:00.782166+00
bec22bef-8013-4bb6-86cf-866becb07055	task-1770116220103-mo0p10t	6cd0ecee-eb79-463b-84a8-9932c54c7cc2	btv1	3	2025-09-01	2026-01-20	2026-01-20 00:00:00+00	completed	100	\N	2026-02-03 10:57:00.9242+00	2026-02-03 10:57:00.9242+00
38658ebf-e9fd-41b0-a306-31f88a6f53ed	task-1770116220103-mo0p10t	732a44be-0c38-4334-8897-63e49094c6e5	doc_duyet	3	2026-01-26	\N	\N	in_progress	0	\N	2026-02-03 10:57:01.059537+00	2026-02-03 10:57:01.059537+00
99d1cccd-08c4-449a-8d52-a4e500647bbd	task-1770116361929-fw0sq35	19c6c15c-c249-4410-9c37-2f19ca885bee	btv2	4	2025-06-30	2025-11-26	2025-11-26 00:00:00+00	completed	100	\N	2026-02-03 10:59:22.625495+00	2026-02-03 10:59:22.625495+00
01559ba9-a1c0-4801-aeeb-9a13a86c7ed4	task-1770116361929-fw0sq35	a45f4e87-1449-4cd3-a32c-9b16b315b1f7	btv1	4	2025-11-27	\N	\N	in_progress	0	\N	2026-02-03 10:59:22.785964+00	2026-02-03 10:59:22.785964+00
1487ba0a-32ca-442c-89b5-77e56999a952	task-1770116361929-fw0sq35	732a44be-0c38-4334-8897-63e49094c6e5	doc_duyet	4	\N	\N	\N	not_started	0	\N	2026-02-03 10:59:22.949698+00	2026-02-03 10:59:22.949698+00
d81df32f-de62-439f-95ad-cc8aa103bfb6	task-1769917584523-1rj9w3a	e0f74135-4578-4c1c-9944-55f17046607b	nhan_su_1	1	2025-06-04	2025-07-15	\N	not_started	0	\N	2026-02-09 02:06:10.057306+00	2026-02-09 02:06:10.057306+00
e3848da3-c618-494e-80d2-9009c98638ec	task-1769917584523-1rj9w3a	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	kiem_soat	1	\N	\N	\N	not_started	0	\N	2026-02-09 02:06:10.211317+00	2026-02-09 02:06:10.211317+00
84f1309e-a6db-468c-a7a8-d45de41a0e21	task-1769917584523-1rj9w3a	5a3dc6e5-c7d4-467b-aa3f-673312685b82	nhan_su_2	1	2025-06-04	2025-07-15	\N	not_started	0	\N	2026-02-09 02:06:10.364884+00	2026-02-09 02:06:10.364884+00
7ce210fa-8090-4e16-bb0d-87de8ef72d18	task-1769919533177-lpq21pi	e0f74135-4578-4c1c-9944-55f17046607b	nhan_su_1	1	2025-12-04	2026-01-20	2026-01-23 00:00:00+00	not_started	0	\N	2026-02-09 02:48:45.208898+00	2026-02-09 02:48:45.208898+00
d6309689-ed70-480f-a571-72d15ca2c065	task-1769919533177-lpq21pi	f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	kiem_soat	1	\N	\N	\N	not_started	0	\N	2026-02-09 02:48:45.377259+00	2026-02-09 02:48:45.377259+00
\.


--
-- TOC entry 3660 (class 0 OID 49176)
-- Dependencies: 232
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.tasks (id, title, description, "group", status, priority, progress, notes, workflow, source_sheet_id, source_sheet_name, contract_id, created_at, updated_at, task_type, related_work_id, related_contract_id, vote) FROM stdin;
task-1770092467619-0etmrjo	Biên tập B1 Thành Duy thức luận	\N	Biên tập	Pending	High	0	Tạm dừng, chờ quyết định của Hội đồng và Trưởng ban thư ký	"{\\"rounds\\":[{\\"roundNumber\\":1,\\"roundType\\":\\"Bông 1 (thô)\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"completedDate\\":null,\\"stages\\":[{\\"type\\":\\"btv2\\",\\"assignee\\":\\"Võ Thị Tú Oanh\\",\\"status\\":\\"not_started\\",\\"startDate\\":\\"2024-06-30\\",\\"dueDate\\":\\"2024-11-15\\",\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0},{\\"type\\":\\"btv1\\",\\"assignee\\":\\"Nguyễn Cẩm Thi\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"dueDate\\":null,\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0},{\\"type\\":\\"doc_duyet\\",\\"assignee\\":\\"Vũ Thị Hương\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"dueDate\\":null,\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0}]}],\\"currentRound\\":1,\\"totalRounds\\":1}"	\N	\N	\N	2026-02-03 04:21:07.619+00	2026-02-03 04:21:07.619+00	PROOFREADING	2007c5c4-b5c5-4d2f-8b27-960e30bdc472	\N	\N
task-1769829631251-rx6sotb	Đọc thẩm định bản dịch NTCDA - tài liệu Trung dung - Đại học tiết yếu 	\N	CV chung	In Progress	High	0	\N	\N	\N	\N	\N	2026-01-31 03:20:31.251+00	2026-01-31 03:20:31.251+00	GENERAL	\N	\N	\N
task-1770093058832-pauzos1	Biên tập B1 thô Đại Tuệ Phổ Giác thiền sư ngữ lục	\N	Biên tập	In Progress	High	33	BTV1 và BTV2 cùng rà soát bông thô	"{\\"rounds\\":[{\\"roundNumber\\":1,\\"roundType\\":\\"Bông 1 (thô)\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"completedDate\\":null,\\"stages\\":[{\\"type\\":\\"btv2\\",\\"assignee\\":\\"Cung Thị Kim Thành\\",\\"status\\":\\"in_progress\\",\\"startDate\\":\\"2025-09-03\\",\\"dueDate\\":null,\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0},{\\"type\\":\\"btv1\\",\\"assignee\\":\\"Nghiêm Thị Mai\\",\\"status\\":\\"completed\\",\\"startDate\\":\\"2025-03-10\\",\\"dueDate\\":\\"2025-08-15\\",\\"completedDate\\":\\"2026-02-03\\",\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":100},{\\"type\\":\\"doc_duyet\\",\\"assignee\\":\\"Vũ Thị Hương\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"dueDate\\":null,\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0}]}],\\"currentRound\\":1,\\"totalRounds\\":1}"	\N	\N	\N	2026-02-03 04:30:58.832+00	2026-02-03 04:31:41.458892+00	PROOFREADING	6e5710f4-12dc-4732-bf61-d14152b31388	\N	\N
task-1769830674576-78moydp	Đọc rà soát bản thảo chuyển in + Xây dựng Quy trình rà soát bản thảo chuyển in	\N	CV chung	Completed	Medium	100	\N	\N	\N	\N	\N	2026-01-31 03:37:54.576+00	2026-01-31 03:37:54.576+00	GENERAL	\N	\N	\N
task-1770093413097-qt9ornw	Biên tập B1 Lục Tổ đàn kinh	\N	Biên tập	Pending	Low	0	Tạm dừng, chờ hiệu đính	"{\\"rounds\\":[{\\"roundNumber\\":1,\\"roundType\\":\\"Tiền biên tập\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"completedDate\\":null,\\"stages\\":[{\\"type\\":\\"btv2\\",\\"assignee\\":\\"Nguyễn Thị Vân Giang\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"dueDate\\":null,\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0},{\\"type\\":\\"btv1\\",\\"assignee\\":\\"Trần Minh Ánh\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"dueDate\\":null,\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0},{\\"type\\":\\"doc_duyet\\",\\"assignee\\":\\"Vũ Thị Hương\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"dueDate\\":null,\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0}]}],\\"currentRound\\":1,\\"totalRounds\\":1}"	\N	\N	\N	2026-02-03 04:36:53.097+00	2026-02-03 04:39:59.31219+00	PROOFREADING	0e498c92-5661-4e64-9d19-78fd997b01ee	\N	\N
task-1769829273381-go74zqy	Xây dựng Sơ thảo Đề án định mức biên tập	\N	CV chung	In Progress	Medium	0	Tạm dừng	\N	\N	\N	\N	2026-01-31 03:14:33.381+00	2026-01-31 03:38:09.575253+00	GENERAL	\N	\N	\N
task-1770025265225-4p44sml	Test thông báo	\N	Công việc chung	Not Started	Medium	0	Test thông báo	\N	\N	\N	\N	2026-02-02 09:41:05.225+00	2026-02-03 07:54:01.289305+00	GENERAL	\N	\N	khong_hoan_thanh
task-1769829346523-mj93dpe	Hỗ trợ xây dựng thuyết minh Thư tịch Phật giáo Việt Nam thư mục quan yếu (Hợp phần Phật điển Việt Nam)	\N	CV chung	In Progress	Medium	0	Tạm dừng	\N	\N	\N	\N	2026-01-31 03:15:46.523+00	2026-01-31 03:38:33.171003+00	GENERAL	\N	\N	\N
task-1769829472741-5iu316h	Phối hợp xây dựng Kế hoạch và Dự toán Kinh phí in ấn xuất bản	\N	CV chung	Completed	Medium	100	\N	\N	\N	\N	\N	2026-01-31 03:17:52.741+00	2026-01-31 03:38:47.657324+00	GENERAL	\N	\N	\N
task-1769778057465-3hgvw9g	Sửa bông 4 Tịnh Độ tam kinh 19x27	\N	Thiết kế	Completed	Medium	100	\N	\N	\N	\N	\N	2026-01-30 13:00:57.465+00	2026-01-30 13:12:05.096041+00	DESIGN	123eaa2b-84df-4da4-b244-fff1a49243a2	\N	\N
task-1769830334378-679953r	Hỗ trợ Dịch giả đọc đối chiếu Vân đài loại ngữ	\N	CV chung	In Progress	Medium	0	\N	\N	\N	\N	\N	2026-01-31 03:32:14.378+00	2026-01-31 03:39:03.73045+00	GENERAL	\N	\N	\N
task-1769780386538-0jvd1hm	Điều chỉnh và hoàn thành Thuyết minh và Dự toán Đề án Diệu Liên GĐ2	\N	CNTT	In Progress	High	0	\N	\N	\N	\N	\N	2026-01-30 13:39:46.538+00	2026-01-30 13:41:02.31011+00	IT	\N	\N	\N
task-1770106613228-echz1v7	Biên tập B1 Đại Đường Tây Vực ký	\N	Biên tập	In Progress	High	0	Chờ dịch giả phản hồi	"{\\"rounds\\":[{\\"roundNumber\\":1,\\"roundType\\":\\"Bông 1 (thô)\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"completedDate\\":null,\\"stages\\":[{\\"type\\":\\"btv2\\",\\"assignee\\":\\"Nguyễn Thị Thuỷ Tiên\\",\\"status\\":\\"in_progress\\",\\"startDate\\":\\"2025-08-28\\",\\"dueDate\\":\\"2026-01-31\\",\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0},{\\"type\\":\\"btv1\\",\\"assignee\\":\\"Nguyễn Cẩm Thi\\",\\"status\\":\\"in_progress\\",\\"startDate\\":\\"2025-08-28\\",\\"dueDate\\":\\"2026-01-31\\",\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0},{\\"type\\":\\"doc_duyet\\",\\"assignee\\":\\"Vũ Thị Hương\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"dueDate\\":null,\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0}]}],\\"currentRound\\":1,\\"totalRounds\\":1}"	\N	\N	\N	2026-02-03 08:16:53.228+00	2026-02-03 08:16:53.228+00	PROOFREADING	44a33467-286b-424f-95e9-3a1fb33e2df5	\N	\N
task-1769776824967-rb9mw3u	Sửa bông 7 Na Tiên tỳ kheo kinh 19x27	\N	Thiết kế	Completed	High	100	\N	\N	\N	\N	\N	2026-01-30 12:40:24.967+00	2026-02-01 04:21:32.656468+00	DESIGN	342b21b4-615b-4904-ba88-e423f3157de3	\N	\N
task-1770107115223-ivlwesu	Biên tập bông thô Phật quốc ký	\N	Biên tập	In Progress	High	0	\N	"{\\"rounds\\":[{\\"roundNumber\\":1,\\"roundType\\":\\"Tiền biên tập\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"completedDate\\":null,\\"stages\\":[{\\"type\\":\\"btv2\\",\\"assignee\\":\\"Nguyễn Cẩm Thi\\",\\"status\\":\\"in_progress\\",\\"startDate\\":\\"2025-09-20\\",\\"dueDate\\":\\"2026-01-31\\",\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0},{\\"type\\":\\"btv1\\",\\"assignee\\":\\"Võ Thị Tú Oanh\\",\\"status\\":\\"not_started\\",\\"startDate\\":\\"2025-09-20\\",\\"dueDate\\":\\"2026-01-31\\",\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0},{\\"type\\":\\"doc_duyet\\",\\"assignee\\":\\"Vũ Thị Hương\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"dueDate\\":null,\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0}]}],\\"currentRound\\":1,\\"totalRounds\\":1}"	\N	\N	\N	2026-02-03 08:25:15.223+00	2026-02-03 08:25:15.223+00	PROOFREADING	6dfd18f2-5bb9-4afb-aa8b-34b9798064e4	\N	\N
task-1769919533177-lpq21pi	Chuẩn bị Phiếu đề nghị (bổ sung 02 thành viên) + Phụ lục Hợp đồng dịch thuật tài liệu Tỳ kheo Ni truyện (GĐ 2)	\N	Thư ký hợp phần	Completed	Medium	100	- 16/12/2025: VP đang chỉnh sửa\n- 29/12/2025: gửi 02 phiếu xin chữ ký DG\n- 12/1/2026: DG gửi lại 02 phiếu, đợi xin chữ ký thầy Quảng Đại"	\N	\N	\N	\N	2026-02-01 04:18:53.177+00	2026-02-09 02:48:45.093885+00	GENERAL	a1c0c896-0c43-471e-83c1-d010ac0d1a1b	\N	tot
task-1769917584523-1rj9w3a	Hoàn thành HS Quyết toán HĐ dịch thuật - tài liệu Dị bộ tông luân luận (GĐ2)	\N	Thư ký hợp phần	Pending	Medium	0	Chưa quyết toán, đợi xem xét	\N	\N	\N	\N	2026-02-01 03:46:24.523+00	2026-02-09 02:06:09.955215+00	GENERAL	45ac2ea6-afd2-4f49-963d-44865d9e41d5	\N	\N
task-1770107398548-5p1cgro	BT Bông 2 tinh Biện trung biên luận khổ 19x27cm	\N	Biên tập	Completed	High	100	BTV đang đọc lại bông chế bản gửi lại, dự kiến nộp lại Trưởng ban đọc duyệt ngày 13/01/2026	"{\\"rounds\\":[{\\"roundNumber\\":1,\\"roundType\\":\\"Bông 2 (tinh)\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"completedDate\\":null,\\"stages\\":[{\\"type\\":\\"btv2\\",\\"assignee\\":\\"Nghiêm Thị Mai\\",\\"status\\":\\"completed\\",\\"startDate\\":\\"2025-11-04\\",\\"dueDate\\":\\"2025-12-26\\",\\"completedDate\\":\\"2025-12-18\\",\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":100},{\\"type\\":\\"btv1\\",\\"assignee\\":\\"Cung Thị Kim Thành\\",\\"status\\":\\"completed\\",\\"startDate\\":\\"2025-11-04\\",\\"dueDate\\":\\"2025-12-26\\",\\"completedDate\\":\\"2025-12-18\\",\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":100},{\\"type\\":\\"doc_duyet\\",\\"assignee\\":\\"Vũ Thị Hương\\",\\"status\\":\\"completed\\",\\"startDate\\":\\"2025-12-18\\",\\"dueDate\\":\\"2025-12-26\\",\\"completedDate\\":\\"2025-12-26\\",\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":100}]}],\\"currentRound\\":1,\\"totalRounds\\":1}"	\N	\N	\N	2026-02-03 08:29:58.548+00	2026-02-03 09:04:15.294406+00	PROOFREADING	de60a453-2afc-4c30-bc71-7fede28e2406	\N	\N
task-1770107984593-w0ia255	BT bông 3 + 4 tinh Triệu luận khổ 19x27cm	\N	Biên tập	In Progress	High	100	TBTK trả bông đọc duyệt ngày 26/12/202, BTV đang sửa bông 4	"{\\"rounds\\":[{\\"roundNumber\\":1,\\"roundType\\":\\"Bông 4 (tinh)\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"completedDate\\":null,\\"stages\\":[{\\"type\\":\\"btv2\\",\\"assignee\\":\\"Nghiêm Thị Mai\\",\\"status\\":\\"completed\\",\\"startDate\\":\\"2025-12-01\\",\\"dueDate\\":\\"2025-12-20\\",\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0},{\\"type\\":\\"btv1\\",\\"assignee\\":\\"Cung Thị Kim Thành\\",\\"status\\":\\"completed\\",\\"startDate\\":\\"2025-12-01\\",\\"dueDate\\":\\"2025-12-20\\",\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0},{\\"type\\":\\"doc_duyet\\",\\"assignee\\":\\"Vũ Thị Hương\\",\\"status\\":\\"completed\\",\\"startDate\\":\\"2025-12-20\\",\\"dueDate\\":null,\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0}]}],\\"currentRound\\":1,\\"totalRounds\\":1}"	\N	\N	\N	2026-02-03 08:39:44.593+00	2026-02-03 08:39:44.593+00	PROOFREADING	6d758280-76b5-495c-9cbe-316e673c5889	\N	\N
task-1770108155026-gn5e2ar	BT bông 3 tinh Biện trung biên luận khổ 19x27cm	\N	Biên tập	In Progress	Medium	0	\N	"{\\"rounds\\":[{\\"roundNumber\\":1,\\"roundType\\":\\"Bông 3 (tinh)\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"completedDate\\":null,\\"stages\\":[{\\"type\\":\\"btv2\\",\\"assignee\\":\\"Nghiêm Thị Mai\\",\\"status\\":\\"in_progress\\",\\"startDate\\":\\"2025-12-26\\",\\"dueDate\\":null,\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0},{\\"type\\":\\"btv1\\",\\"assignee\\":\\"Cung Thị Kim Thành\\",\\"status\\":\\"in_progress\\",\\"startDate\\":\\"2025-12-26\\",\\"dueDate\\":null,\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0},{\\"type\\":\\"doc_duyet\\",\\"assignee\\":\\"Vũ Thị Hương\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"dueDate\\":null,\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0}]}],\\"currentRound\\":1,\\"totalRounds\\":1}"	\N	\N	\N	2026-02-03 08:42:35.026+00	2026-02-03 08:42:35.026+00	PROOFREADING	de60a453-2afc-4c30-bc71-7fede28e2406	\N	\N
task-1770108296334-wszsl91	BT bông thô Nam Hải ký quy nội pháp truyện	\N	Biên tập	In Progress	High	0	\N	"{\\"rounds\\":[{\\"roundNumber\\":1,\\"roundType\\":\\"Bông 1 (thô)\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"completedDate\\":null,\\"stages\\":[{\\"type\\":\\"btv2\\",\\"assignee\\":\\"Nguyễn Cẩm Thi\\",\\"status\\":\\"not_started\\",\\"startDate\\":\\"2026-01-10\\",\\"dueDate\\":\\"2026-01-25\\",\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0},{\\"type\\":\\"btv1\\",\\"assignee\\":\\"Ngô Ánh Dung\\",\\"status\\":\\"not_started\\",\\"startDate\\":\\"2026-01-26\\",\\"dueDate\\":\\"2026-03-31\\",\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0},{\\"type\\":\\"doc_duyet\\",\\"assignee\\":null,\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"dueDate\\":null,\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0}]}],\\"currentRound\\":1,\\"totalRounds\\":1}"	\N	\N	\N	2026-02-03 08:44:56.334+00	2026-02-03 08:44:56.334+00	PROOFREADING	b0b8a7c9-d8aa-419d-94c1-61adcdcb343d	\N	\N
task-1770116220103-mo0p10t	Biên tập bông chuyển in Quan Âm tế độ diễn nghĩa kinh	\N	Biên tập	In Progress	High	67	chờ đọc duyệt	"{\\"rounds\\":[{\\"roundNumber\\":1,\\"roundType\\":\\"Bông chuyển in\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"completedDate\\":null,\\"stages\\":[{\\"type\\":\\"btv2\\",\\"assignee\\":\\"Lê Thị Minh Hoài\\",\\"status\\":\\"completed\\",\\"startDate\\":\\"2025-09-01\\",\\"dueDate\\":\\"2026-01-20\\",\\"completedDate\\":\\"2026-01-20\\",\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":100},{\\"type\\":\\"btv1\\",\\"assignee\\":\\"Ngô Ánh Dung\\",\\"status\\":\\"completed\\",\\"startDate\\":\\"2025-09-01\\",\\"dueDate\\":\\"2026-01-20\\",\\"completedDate\\":\\"2026-01-20\\",\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":100},{\\"type\\":\\"doc_duyet\\",\\"assignee\\":\\"Vũ Thị Hương\\",\\"status\\":\\"in_progress\\",\\"startDate\\":\\"2026-01-26\\",\\"dueDate\\":null,\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0}]}],\\"currentRound\\":1,\\"totalRounds\\":1}"	\N	\N	\N	2026-02-03 10:57:00.103+00	2026-02-03 10:57:00.103+00	PROOFREADING	7c1a761a-dc0e-488b-b22c-1ad6a74069a4	\N	\N
task-1770116361929-fw0sq35	Biên tập B2 thô Thánh đăng lục	\N	Biên tập	Not Started	High	33	BTV chỉnh sửa theo góp ý của DG và biên tập bông 2 thô	"{\\"rounds\\":[{\\"roundNumber\\":1,\\"roundType\\":\\"Bông 2 (thô)\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"completedDate\\":null,\\"stages\\":[{\\"type\\":\\"btv2\\",\\"assignee\\":\\"Lê Đình Sơn\\",\\"status\\":\\"completed\\",\\"startDate\\":\\"2025-06-30\\",\\"dueDate\\":\\"2025-11-26\\",\\"completedDate\\":\\"2025-11-26\\",\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":100},{\\"type\\":\\"btv1\\",\\"assignee\\":\\"Nghiêm Thuỳ Dung\\",\\"status\\":\\"in_progress\\",\\"startDate\\":\\"2025-11-27\\",\\"dueDate\\":null,\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0},{\\"type\\":\\"doc_duyet\\",\\"assignee\\":\\"Vũ Thị Hương\\",\\"status\\":\\"not_started\\",\\"startDate\\":null,\\"dueDate\\":null,\\"completedDate\\":null,\\"cancelReason\\":null,\\"notes\\":null,\\"progress\\":0}]}],\\"currentRound\\":1,\\"totalRounds\\":1}"	\N	\N	\N	2026-02-03 10:59:21.929+00	2026-02-03 10:59:21.929+00	PROOFREADING	c5bedfe2-92bb-4f35-aa8f-7375a5327832	\N	\N
\.


--
-- TOC entry 3672 (class 0 OID 81920)
-- Dependencies: 244
-- Data for Name: translation_contract_members; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.translation_contract_members (id, translation_contract_id, user_id, created_at, updated_at) FROM stdin;
797f4605-93b5-4256-ad26-59ca12f43c61	d08e3dfc-dc51-4fe4-9512-1336cc7d23b0	f1970916-c6fd-4be6-b11d-e3e1f3b91156	2026-02-04 11:36:56.791939+00	2026-02-04 11:36:56.791939+00
c278cdd7-3d66-4e48-9c0b-1c15bce6da06	4039dc43-0280-497a-9bf1-f602ad43dabc	b35a03e8-04a5-4f2d-b689-3cdd4a40d232	2026-02-05 04:14:25.727634+00	2026-02-05 04:14:25.727634+00
06c0499f-5344-45eb-8159-cfc18abc3eef	39c158b2-1698-4755-a94f-9e71c4224c2e	65f68571-7e3a-4c4e-b67f-ce02e1899d83	2026-02-05 04:21:32.310553+00	2026-02-05 04:21:32.310553+00
c273f59f-57f9-46d8-ba1c-a493ea6a2779	ecc16e7b-a661-443e-b973-440253db0cac	dd30777e-7b73-4cb0-a0b7-c235d1fd6323	2026-02-05 04:23:38.890221+00	2026-02-05 04:23:38.890221+00
c570627a-9091-4215-8b38-c93b94442a29	9510f63b-3713-4cf4-a3c9-bd217b980a42	0644a38e-bb56-4bdc-a6d3-453a564094eb	2026-02-05 04:25:14.375135+00	2026-02-05 04:25:14.375135+00
909f9004-5320-4d33-ae7c-0efdb9bc7a69	0ef57c9b-725d-4b4b-a854-a8e9493c5a97	0644a38e-bb56-4bdc-a6d3-453a564094eb	2026-02-05 04:29:21.112829+00	2026-02-05 04:29:21.112829+00
8e2fa6dd-621e-4e28-9661-4fd4692781c7	c460dd4c-ab2c-4a2e-ab5d-74119a41d2a5	0644a38e-bb56-4bdc-a6d3-453a564094eb	2026-02-05 04:30:37.080881+00	2026-02-05 04:30:37.080881+00
e586a506-a061-4376-8c8c-a4c04422b571	244c9fa3-71eb-496a-8a84-17b6a24e65d2	f927980c-d843-44df-b38d-b1488caf6968	2026-02-05 04:36:20.813096+00	2026-02-05 04:36:20.813096+00
a32369e3-46e3-4c45-a197-e3872c33fdbc	9be7b29c-b4e5-46be-a04c-be61eed5c79e	4afc91b9-c796-4018-b57f-636a75e9aa4e	2026-02-05 04:51:02.106604+00	2026-02-05 04:51:02.106604+00
73152775-0eec-42c6-9641-9795ac017a87	577f5811-8522-40cd-8cd1-b502d84f8584	f927980c-d843-44df-b38d-b1488caf6968	2026-02-05 04:52:41.588955+00	2026-02-05 04:52:41.588955+00
ff599693-eed6-4dfc-a62f-0bff00e83e45	5c954d12-8183-4fff-be22-057734bc92fc	dd30777e-7b73-4cb0-a0b7-c235d1fd6323	2026-02-05 05:05:32.768131+00	2026-02-05 05:05:32.768131+00
e23529d3-f55c-49ff-a048-f33a5af4c172	c7f645b7-fdd6-4545-95b7-0392b58009fb	dd30777e-7b73-4cb0-a0b7-c235d1fd6323	2026-02-05 05:21:46.531701+00	2026-02-05 05:21:46.531701+00
19f7df0c-b4e9-4870-860f-dde805cbfa25	65feca98-495c-4d6b-8fc1-9425d8e4d172	f7982952-b8fa-4c61-842c-a0e53e76e4ed	2026-02-05 07:10:12.310119+00	2026-02-05 07:10:12.310119+00
a722c99f-0c33-47ee-8417-f89b2d00560e	f2704657-cc8b-4bee-bc3d-215ce2334171	f927980c-d843-44df-b38d-b1488caf6968	2026-02-05 07:17:20.028998+00	2026-02-05 07:17:20.028998+00
bba01d65-2f16-4f68-b4d5-c850cd37eff5	beac6033-bb73-410b-a055-ab9d6d683452	3464b45c-9629-40ed-af35-10f01ed2eb5e	2026-02-05 07:54:06.898953+00	2026-02-05 07:54:06.898953+00
0a53a62d-52ab-40c0-b6df-148dad6ef80f	3869959f-5f59-4a9d-8c7e-c5b86821c2d0	67d0398f-83c3-43ac-8628-8b072daf1fb7	2026-02-05 07:56:33.187953+00	2026-02-05 07:56:33.187953+00
9584c654-f73f-4415-827a-37e860d6760a	9204ffd1-e6f4-4f51-bf7b-cf695b4e65b6	0644a38e-bb56-4bdc-a6d3-453a564094eb	2026-02-05 07:57:50.09664+00	2026-02-05 07:57:50.09664+00
13b18370-9091-4865-8c59-83819a1d5b9c	781c1d73-59a6-4e3f-bc6d-416e11b43415	0644a38e-bb56-4bdc-a6d3-453a564094eb	2026-02-05 07:58:52.198613+00	2026-02-05 07:58:52.198613+00
b87a7e77-2e99-4e6d-a2f2-83bd5525d3a2	f7d2d025-08b0-44d5-a06c-91a71a301c8c	0644a38e-bb56-4bdc-a6d3-453a564094eb	2026-02-05 08:00:01.955312+00	2026-02-05 08:00:01.955312+00
90f6b934-5d4b-42f7-8401-72db6c85c1f4	3c095a74-85ed-48e5-9505-f3cba3854f00	1d1c4471-df68-4fda-8119-9c031ba500ef	2026-02-05 08:01:30.978197+00	2026-02-05 08:01:30.978197+00
4c97e0df-6123-43f7-ba19-ed463170a125	87c383a8-d60f-4c1b-a5ac-566b4a1ee12f	8885de6b-349d-4e85-871c-d2b56bc9bcda	2026-02-05 08:02:52.034022+00	2026-02-05 08:02:52.034022+00
660b5657-9d5d-41f0-9882-0280b4fb2a7e	1ebfdd7c-1ea6-4e3e-90ea-e58f6a6707a1	dd30777e-7b73-4cb0-a0b7-c235d1fd6323	2026-02-05 08:17:25.435696+00	2026-02-05 08:17:25.435696+00
794ed400-ef8f-4d84-a949-0becdaee4978	0c542b2f-a256-47d8-b266-3559929239ae	dd30777e-7b73-4cb0-a0b7-c235d1fd6323	2026-02-05 08:18:30.592807+00	2026-02-05 08:18:30.592807+00
c1bae7aa-f6df-4102-9960-56cb71b7effa	3b180da4-b4b5-46f4-816b-7efddc441645	dd30777e-7b73-4cb0-a0b7-c235d1fd6323	2026-02-05 08:20:23.201777+00	2026-02-05 08:20:23.201777+00
bbf5ea2a-d1b8-45da-948a-dc741064b1b7	f9481ef1-8385-4891-ae19-72a83f82539e	0644a38e-bb56-4bdc-a6d3-453a564094eb	2026-02-05 08:21:28.395801+00	2026-02-05 08:21:28.395801+00
021e1960-b5d2-47b9-8c1d-9d88f589ae5e	85773096-9f59-4e92-82c2-d77438239970	f927980c-d843-44df-b38d-b1488caf6968	2026-02-05 08:22:34.540113+00	2026-02-05 08:22:34.540113+00
c50bd919-b617-467e-b105-d8185a544380	2c50e31d-d98e-4025-af1d-23df08f02b05	02467400-45a9-4bb2-b19c-7e66aed2e682	2026-02-05 08:23:53.400432+00	2026-02-05 08:23:53.400432+00
df65b398-bad2-4b95-a0b1-f8760aad3758	1ce3d7b7-6e00-4122-8b0e-749e7b6a2152	ec70ed67-59ca-46b3-bacd-ea4974425bf4	2026-02-05 08:25:28.986472+00	2026-02-05 08:25:28.986472+00
cd4212c6-5e0a-4323-8b54-e17bf54a5442	c285c892-9950-4815-b45a-f8550d19ae25	febc990d-294e-4056-87f5-2eafea0995d3	2026-02-05 08:26:36.085494+00	2026-02-05 08:26:36.085494+00
df14cb39-d763-4fe8-beed-751ba458b121	029a1e79-3093-4f67-bf6b-c51c441b9033	febc990d-294e-4056-87f5-2eafea0995d3	2026-02-05 08:28:02.497036+00	2026-02-05 08:28:02.497036+00
b0cde9fa-0025-4860-9cbb-9ca9b02256df	8f9a9cd2-5e8d-44c0-8a06-f020acee3666	bc63fe0a-d62f-49d4-8366-a0aea936fc38	2026-02-05 08:29:13.940378+00	2026-02-05 08:29:13.940378+00
51906c31-038b-4393-8877-c094a02125d5	6569ac54-078c-408d-b173-ac7861d9e55b	3464b45c-9629-40ed-af35-10f01ed2eb5e	2026-02-05 08:30:08.140712+00	2026-02-05 08:30:08.140712+00
f02a37c9-fbc0-4f3a-9289-0b3770468b9b	5943c44c-9b2e-44b5-95fc-619a7c17e48f	1d1c4471-df68-4fda-8119-9c031ba500ef	2026-02-05 08:31:46.134252+00	2026-02-05 08:31:46.134252+00
0f159c4d-aab8-4843-96c3-112e69cb5aeb	bc1f932d-00b4-485a-9919-73a8d5c38e05	1d1c4471-df68-4fda-8119-9c031ba500ef	2026-02-05 08:32:52.850426+00	2026-02-05 08:32:52.850426+00
4173667e-1a2d-46b2-8e35-4f827939bf63	ae7f078d-7028-4f2b-91d9-e0ed1ca5ce64	b35a03e8-04a5-4f2d-b689-3cdd4a40d232	2026-02-05 08:50:09.723279+00	2026-02-05 08:50:09.723279+00
301f5892-4d61-4e8a-8b90-0798199e06e8	ae7f078d-7028-4f2b-91d9-e0ed1ca5ce64	f0474fdc-ab61-4cdd-8cfd-81281b17f46f	2026-02-05 08:50:10.50121+00	2026-02-05 08:50:10.50121+00
75e21b25-768d-42a7-83b5-a9337a409673	b9b03868-4584-44ff-aae3-4570aceef38f	f927980c-d843-44df-b38d-b1488caf6968	2026-02-05 08:56:36.117851+00	2026-02-05 08:56:36.117851+00
b1cbf086-007c-4e68-9bc2-d0737eb84b1a	a2b29543-8748-4ef0-a5eb-91f94797eead	a2601051-f239-4148-9ac3-5a3b7c954638	2026-02-05 09:01:11.847494+00	2026-02-05 09:01:11.847494+00
c09ba5be-6be9-4674-b4cd-980446cd1bed	a0da34f9-98ed-414a-9468-dac36d46aad6	dd30777e-7b73-4cb0-a0b7-c235d1fd6323	2026-02-05 09:06:04.693097+00	2026-02-05 09:06:04.693097+00
718ef533-26b8-466f-87a1-56ae206241a2	02a5d832-15fa-47b9-a176-3f3b6d4ed9e0	cadce8c9-c6fd-4592-983c-6b35503f2bcd	2026-02-05 10:38:12.195033+00	2026-02-05 10:38:12.195033+00
258a5644-5fc4-4a36-b864-1079f6314a81	dccc3a19-400e-4be2-af63-b6bfd3b195eb	52fa58ae-5f0a-4687-9d47-b0e5d3a210d3	2026-02-10 09:42:46.659979+00	2026-02-10 09:42:46.659979+00
\.


--
-- TOC entry 3668 (class 0 OID 65547)
-- Dependencies: 240
-- Data for Name: translation_contracts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.translation_contracts (id, contract_number, work_id, unit_price, contract_value, start_date, end_date, extension_start_date, extension_end_date, actual_completion_date, actual_word_count, actual_page_count, completion_rate, settlement_value, note, component_id, overview_value, translation_value, progress_check_date, expert_review_date, project_acceptance_date, status, cancelled_at, proofreading_in_progress, editing_in_progress, print_transfer_date, published_date, proofreading_completed, editing_completed, advance_include_overview, advance_1_percent, advance_2_percent, is_settled) FROM stdin;
b9b03868-4584-44ff-aae3-4570aceef38f	63/HĐ-VPKĐ	02b07552-6f95-4e3f-b866-54d6a2501baa	350000	1868000000	2021-12-01	2024-11-30	2024-12-01	2025-11-30	\N	\N	\N	\N	\N	\N	32037af6-b306-4ea7-af9d-ae766e67dde6	20000000.00	1848000000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
a2b29543-8748-4ef0-a5eb-91f94797eead	64/HĐ-VPKĐ	7970f848-da41-4230-9d18-6648e2aee73e	300000	32600000	2021-12-01	2024-11-30	2024-12-01	2025-11-30	\N	\N	\N	\N	\N	- TĐCCG: (1) Thông qua. (2) Dịch giả chỉnh sửa bản dịch theo ý kiến nhận xét và góp ý của Hội đồng	32037af6-b306-4ea7-af9d-ae766e67dde6	20000000.00	12600000.00	2022-09-06	2024-11-27	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
a0da34f9-98ed-414a-9468-dac36d46aad6	65/HĐ-VPKĐ	123eaa2b-84df-4da4-b244-fff1a49243a2	300000	80000000	2021-12-01	2022-11-30	2022-12-01	2023-09-30	2023-09-10	70000	200	1	80000000	\N	32037af6-b306-4ea7-af9d-ae766e67dde6	20000000.00	60000000.00	\N	2022-09-06	2023-06-09	Completed	\N	f	f	\N	\N	f	f	f	\N	\N	f
02a5d832-15fa-47b9-a176-3f3b6d4ed9e0	13/HĐ-VPKĐ	d90d9ca7-15ac-40e2-9359-08f340ac31a2	300000	38900000	2025-06-19	2026-12-18	\N	\N	\N	\N	\N	\N	\N	\N	32037af6-b306-4ea7-af9d-ae766e67dde6	20000000.00	18900000.00	\N	2026-01-16	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
dccc3a19-400e-4be2-af63-b6bfd3b195eb	69/HĐ-VPKĐ	6dfd18f2-5bb9-4afb-aa8b-34b9798064e4	300000	49100000	2021-12-01	2024-11-30	2024-12-01	2025-05-31	2025-05-30	51425	147	1.5155	64100000	\N	32037af6-b306-4ea7-af9d-ae766e67dde6	20000000.00	29100000.00	2022-09-06	2024-09-12	2025-04-25	Completed	\N	f	f	\N	\N	t	f	f	\N	\N	f
d08e3dfc-dc51-4fe4-9512-1336cc7d23b0	67/HĐ-VPKĐ	342b21b4-615b-4904-ba88-e423f3157de3	300000	101900000	2023-11-29	2023-11-28	\N	\N	2023-11-08	96964	277	1.0147	103100000	\N	32037af6-b306-4ea7-af9d-ae766e67dde6	20000000.00	81900000.00	\N	2023-10-08	2023-10-23	Active	\N	f	f	\N	\N	t	f	f	\N	\N	f
4039dc43-0280-497a-9bf1-f602ad43dabc	58/HĐ-VPKĐ	f0c8aa8c-637d-4ab9-a61e-5c9df45408c4	350000	885500000	2024-11-12	2025-11-11	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	885500000.00	\N	2025-12-26	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
39c158b2-1698-4755-a94f-9e71c4224c2e	35/HĐ-VPKĐ	a22f3752-58b9-4d17-8866-9063060cb114	350000	245000000	2024-08-12	2025-08-11	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	245000000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
ecc16e7b-a661-443e-b973-440253db0cac	13/HĐ-VPKĐ	689fedd6-c42d-41f4-bab0-73941f638ca7	350000	31150000	2024-05-29	2025-05-28	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	31150000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
9510f63b-3713-4cf4-a3c9-bd217b980a42	04/HĐ-VPKĐ	b143da1a-c25d-4c6a-afe7-dd01afc38d41	350000	31500000	2025-05-13	2026-05-12	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	31500000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
0ef57c9b-725d-4b4b-a854-a8e9493c5a97	05/HĐ-VPKĐ	99bc0633-acb3-456a-8bdc-7ac5e4e152cf	350000	40250000	2025-05-13	2026-05-12	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	40250000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
c460dd4c-ab2c-4a2e-ab5d-74119a41d2a5	06/HĐ-VPKĐ	9a549e68-5cad-41d7-acd5-d8b371267e92	350000	124250000	2025-05-13	2026-11-12	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	124250000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
244c9fa3-71eb-496a-8a84-17b6a24e65d2	61/HĐ-VPKĐ	f821b268-443a-424d-93b7-038805b1189a	350000	700000	2024-11-26	2025-11-25	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	700000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
9be7b29c-b4e5-46be-a04c-be61eed5c79e	71/HĐ-VPKĐ	e31e3b45-4775-4907-9916-a9877e930b9c	350000	72100000	2024-12-03	2026-06-02	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	72100000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
577f5811-8522-40cd-8cd1-b502d84f8584	62/HĐ-VPKĐ	57ebe0f6-d63a-42fa-a99e-1d8a4f1a334b	350000	11900000	2024-11-26	2025-11-25	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	11900000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
5c954d12-8183-4fff-be22-057734bc92fc	14/HĐ-VPKĐ	3caa6fa3-ea89-4022-8aad-1b5d3d07ea9c	350000	3850000	2024-05-29	2025-05-28	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	3850000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
c7f645b7-fdd6-4545-95b7-0392b58009fb	11/HĐ-VPKĐ	cb54495b-107e-4ef0-b503-0c90f0cb575c	350000	14000000	2024-05-29	2025-05-28	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	14000000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
65feca98-495c-4d6b-8fc1-9425d8e4d172	56/HĐ-VPKĐ	f83fb7e6-2180-496d-b9bf-8d9f703c7526	350000	10500000	2024-11-01	2025-10-31	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	10500000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
f2704657-cc8b-4bee-bc3d-215ce2334171	02/HĐ-VPKĐ	a9d979ac-15a9-4f52-ac22-1c4df3bf54fb	350000	6300000	2025-04-15	2026-04-14	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	6300000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
beac6033-bb73-410b-a055-ab9d6d683452	76/HĐ-VPKĐ	677a2765-9ce8-41eb-bf0f-f4d69350581e	350000	5250000	2024-12-11	2025-12-10	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	5250000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
3869959f-5f59-4a9d-8c7e-c5b86821c2d0	57/HĐ-VPKĐ	8f5d7d33-9372-47c4-9d08-103be014bcf0	350000	97650000	2024-11-11	2025-11-10	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	97650000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
9204ffd1-e6f4-4f51-bf7b-cf695b4e65b6	07/HĐ-VPKĐ	f7237849-2e03-4317-9cc6-a0a442f22dba	350000	157500000	2025-05-13	2027-05-12	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	157500000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
781c1d73-59a6-4e3f-bc6d-416e11b43415	08/HĐ-VPKĐ	91338029-0105-4b75-8c3b-697f7f72ab6a	350000	11550000	2025-05-13	2026-05-12	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	11550000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
f7d2d025-08b0-44d5-a06c-91a71a301c8c	09/HĐ-VPKĐ	a050fa4f-746f-412a-bdc2-e17c131aac54	350000	45500000	2025-05-13	2026-11-12	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	45500000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
3c095a74-85ed-48e5-9505-f3cba3854f00	77/HĐ-VPKĐ	58dc3723-eb55-44b3-9d7b-d698aee2a6ae	350000	5600000	2024-12-11	2025-12-10	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	5600000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
87c383a8-d60f-4c1b-a5ac-566b4a1ee12f	08/HĐ-VPKĐ	2b1de017-b57c-4751-9ac3-9f85854d0ffc	350000	19950000	2024-05-29	2025-05-28	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	19950000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
1ebfdd7c-1ea6-4e3e-90ea-e58f6a6707a1	09/HĐ-VPKĐ	6b44ba4a-7bbd-4666-bde4-837a1ccb322f	350000	4200000	2024-05-29	2025-05-28	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	4200000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
0c542b2f-a256-47d8-b266-3559929239ae	10/HĐ-VPKĐ	478fc7e8-de08-43a1-bc75-53ff916d4244	350000	18200000	2024-05-29	2025-05-28	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	18200000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
3b180da4-b4b5-46f4-816b-7efddc441645	12/HĐ-VPKĐ	70f08578-0027-475f-995c-c603e3d334bb	350000	37100000	2024-05-29	2025-05-28	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	37100000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
f9481ef1-8385-4891-ae19-72a83f82539e	10/HĐ-VPKĐ	a24de126-6b94-4cc8-873b-7ac99a4842eb	350000	16450000	2025-05-13	2026-05-12	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	16450000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
85773096-9f59-4e92-82c2-d77438239970	63/HĐ-VPKĐ	0049801e-fabf-41ac-b8d7-f60157891ecd	350000	67900000	2024-11-26	2025-11-25	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	67900000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
2c50e31d-d98e-4025-af1d-23df08f02b05	60/HĐ-VPKĐ	00a25776-df86-475d-b033-6543b2bda9a2	350000	16800000	2024-11-21	2025-11-20	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	16800000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
1ce3d7b7-6e00-4122-8b0e-749e7b6a2152	73/HĐ-VPKĐ	5f5b78f6-b16a-43d4-9426-3892cd02097d	\N	\N	2024-12-11	2025-12-10	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	\N	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
c285c892-9950-4815-b45a-f8550d19ae25	66/HĐ-VPKĐ	ef5fac35-417c-4d83-80fa-d21839313b02	350000	92400000	2024-11-26	2025-11-25	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	92400000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
029a1e79-3093-4f67-bf6b-c51c441b9033	65/HĐ-VPKĐ	032551d1-38e8-4dc3-a513-86ab180f7045	350000	14000000	2024-11-26	2025-11-25	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	14000000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
8f9a9cd2-5e8d-44c0-8a06-f020acee3666	70/HĐ-VPKĐ	61c61452-34f0-475a-8af5-c4cb48dbdeb6	350000	113400000	2024-12-03	2025-12-02	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	113400000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
6569ac54-078c-408d-b173-ac7861d9e55b	78/HĐ-VPKĐ	c1d76abd-f66e-43d8-b32c-c9435cfdea7e	350000	11550000	2024-12-11	2025-12-10	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	11550000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
5943c44c-9b2e-44b5-95fc-619a7c17e48f	75/HĐ-VPKĐ	4e5b1a82-50e0-4e41-a4fd-283147a9c622	350000	42350000	2024-12-11	2025-12-10	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	42350000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
bc1f932d-00b4-485a-9919-73a8d5c38e05	74/HĐ-VPKĐ	059e45ab-67e2-4d4f-b806-93d0a8489823	350000	43400000	2024-12-11	2025-12-10	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	43400000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
ae7f078d-7028-4f2b-91d9-e0ed1ca5ce64	57/HĐ-VPKĐ	e539474b-faec-4e63-83bb-d5ec1c2a9da9	350000	371700000	2025-12-09	2027-06-08	\N	\N	\N	\N	\N	\N	\N	\N	58786d42-3079-4d1e-b2f7-b160208c2293	\N	371700000.00	\N	\N	\N	Active	\N	f	f	\N	\N	f	f	f	\N	\N	f
\.


--
-- TOC entry 3664 (class 0 OID 57470)
-- Dependencies: 236
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
-- TOC entry 3666 (class 0 OID 57507)
-- Dependencies: 238
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_roles (id, user_id, role_id, created_at, updated_at, component_id) FROM stdin;
39870ad3-d5d7-4cef-9cd2-06e5024654ba	11817e25-7e55-4b0d-82ef-9ff26de11efa	c702c5e5-49f5-4570-af59-e0a9e5471794	2026-01-29 10:59:40.152895+00	2026-01-29 10:59:40.152895+00	\N
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
7c9ce0bd-9ab9-4fe6-9511-3df429a8adfa	f1970916-c6fd-4be6-b11d-e3e1f3b91156	b7a18021-605d-44bb-93e8-f127dcadae57	2026-02-04 11:45:51.371748+00	2026-02-04 11:45:51.371748+00	\N
31dd9ffb-cbbc-4bdf-9c2a-dd918776a6b1	b35a03e8-04a5-4f2d-b689-3cdd4a40d232	b7a18021-605d-44bb-93e8-f127dcadae57	2026-02-05 04:08:56.080941+00	2026-02-05 04:08:56.080941+00	\N
fa97401d-c672-4b5d-9809-414f44511908	65f68571-7e3a-4c4e-b67f-ce02e1899d83	b7a18021-605d-44bb-93e8-f127dcadae57	2026-02-05 04:20:14.474855+00	2026-02-05 04:20:14.474855+00	\N
80882ec4-5375-442b-aae2-4fdda0da1f1e	dd30777e-7b73-4cb0-a0b7-c235d1fd6323	b7a18021-605d-44bb-93e8-f127dcadae57	2026-02-05 04:22:37.840849+00	2026-02-05 04:22:37.840849+00	\N
77a9510a-3368-48ca-a29f-da24fa6d99d6	0644a38e-bb56-4bdc-a6d3-453a564094eb	b7a18021-605d-44bb-93e8-f127dcadae57	2026-02-05 04:24:28.484956+00	2026-02-05 04:24:28.484956+00	\N
924c09c0-f240-4f49-9e99-873ad61f9a5b	f927980c-d843-44df-b38d-b1488caf6968	b7a18021-605d-44bb-93e8-f127dcadae57	2026-02-05 04:35:49.830642+00	2026-02-05 04:35:49.830642+00	\N
51bf965b-5a05-4bdc-bc65-06b984f46a7a	4afc91b9-c796-4018-b57f-636a75e9aa4e	b7a18021-605d-44bb-93e8-f127dcadae57	2026-02-05 04:50:35.230573+00	2026-02-05 04:50:35.230573+00	\N
88466762-87f9-427c-a20f-ba686a9bb8f2	f7982952-b8fa-4c61-842c-a0e53e76e4ed	b7a18021-605d-44bb-93e8-f127dcadae57	2026-02-05 07:08:01.93729+00	2026-02-05 07:08:01.93729+00	\N
9668347c-dcb0-437b-9955-fe2a3dbf5619	3464b45c-9629-40ed-af35-10f01ed2eb5e	b7a18021-605d-44bb-93e8-f127dcadae57	2026-02-05 07:53:20.67447+00	2026-02-05 07:53:20.67447+00	\N
38178994-f38f-482e-8c11-20bd9ef3723b	67d0398f-83c3-43ac-8628-8b072daf1fb7	b7a18021-605d-44bb-93e8-f127dcadae57	2026-02-05 07:55:49.913414+00	2026-02-05 07:55:49.913414+00	\N
2b20fc06-f440-489c-b700-ee818149aaf7	1d1c4471-df68-4fda-8119-9c031ba500ef	b7a18021-605d-44bb-93e8-f127dcadae57	2026-02-05 08:00:47.591644+00	2026-02-05 08:00:47.591644+00	\N
6a733e60-99d4-4c2c-8a39-a86563a5aebe	8885de6b-349d-4e85-871c-d2b56bc9bcda	b7a18021-605d-44bb-93e8-f127dcadae57	2026-02-05 08:02:15.850094+00	2026-02-05 08:02:15.850094+00	\N
1a8da6f7-c441-4cbf-aede-f39a408374ab	02467400-45a9-4bb2-b19c-7e66aed2e682	b7a18021-605d-44bb-93e8-f127dcadae57	2026-02-05 08:22:59.006295+00	2026-02-05 08:22:59.006295+00	\N
f24d5fb1-33f4-41dc-9931-292fbe7f814f	ec70ed67-59ca-46b3-bacd-ea4974425bf4	b7a18021-605d-44bb-93e8-f127dcadae57	2026-02-05 08:25:03.849154+00	2026-02-05 08:25:03.849154+00	\N
c49d71cc-e474-402f-8f0f-08c06bc50973	febc990d-294e-4056-87f5-2eafea0995d3	b7a18021-605d-44bb-93e8-f127dcadae57	2026-02-05 08:26:09.055532+00	2026-02-05 08:26:09.055532+00	\N
08948e61-fd6b-440f-a4b2-5b70cff7dc71	bc63fe0a-d62f-49d4-8366-a0aea936fc38	b7a18021-605d-44bb-93e8-f127dcadae57	2026-02-05 08:28:40.509122+00	2026-02-05 08:28:40.509122+00	\N
3328fa6b-89e6-4929-a7c4-3e2f1f4b0f1b	f0474fdc-ab61-4cdd-8cfd-81281b17f46f	b7a18021-605d-44bb-93e8-f127dcadae57	2026-02-05 08:46:36.464095+00	2026-02-05 08:46:36.464095+00	\N
7e3b2a91-a2f6-4e2a-805a-4f98b0f74099	a2601051-f239-4148-9ac3-5a3b7c954638	b7a18021-605d-44bb-93e8-f127dcadae57	2026-02-05 08:58:44.180164+00	2026-02-05 08:58:44.180164+00	\N
e3f68d99-b100-4d9e-8e88-d82e0b755554	cadce8c9-c6fd-4592-983c-6b35503f2bcd	b7a18021-605d-44bb-93e8-f127dcadae57	2026-02-05 10:35:55.912124+00	2026-02-05 10:35:55.912124+00	\N
09767715-c059-449c-a8d0-aba8b4bb3d66	52fa58ae-5f0a-4687-9d47-b0e5d3a210d3	903a9649-1514-4393-acd3-991a33608dad	2026-02-05 10:41:38.23515+00	2026-02-05 10:41:38.23515+00	\N
043f3cb6-5805-4f47-bc92-17db7933d85e	52fa58ae-5f0a-4687-9d47-b0e5d3a210d3	0b4374d3-c74d-40a1-91e9-ac54d9d07033	2026-02-05 10:41:38.23515+00	2026-02-05 10:41:38.23515+00	\N
a236beaf-f1a1-438a-a700-661577c17b72	52fa58ae-5f0a-4687-9d47-b0e5d3a210d3	b7a18021-605d-44bb-93e8-f127dcadae57	2026-02-05 10:41:38.23515+00	2026-02-05 10:41:38.23515+00	\N
572e68f5-e13f-452a-95a7-dd1fda8fbc64	99434b30-4982-48e9-8c81-b3466309537e	10114bd1-51e1-4719-9149-309c86e2a079	2026-02-12 04:41:23.641982+00	2026-02-12 04:41:23.641982+00	\N
409ac434-9015-4e70-939f-2415efd37a97	79a84794-8a33-4b27-ab86-e2ce152e46da	10114bd1-51e1-4719-9149-309c86e2a079	2026-02-12 04:54:35.685505+00	2026-02-12 04:54:35.685505+00	\N
9220d125-6b43-4aa4-b772-bab016684a76	79a84794-8a33-4b27-ab86-e2ce152e46da	83004138-2d9d-4ced-9510-cc77eac41299	2026-02-12 04:54:35.685505+00	2026-02-12 04:54:35.685505+00	\N
65442e8d-e2ad-4642-a461-035357e186ad	79a84794-8a33-4b27-ab86-e2ce152e46da	38e363c5-5d8a-4df9-91eb-15184824b03c	2026-02-12 04:54:35.685505+00	2026-02-12 04:54:35.685505+00	\N
\.


--
-- TOC entry 3659 (class 0 OID 49152)
-- Dependencies: 231
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
f1970916-c6fd-4be6-b11d-e3e1f3b91156	partner_25943e71-c094-45f7-836d-3e09c8ffebf4@system.local	\N	Nguyễn Minh Tiến	Tiến	Nguyễn Minh	\N	t	2026-02-04 11:17:21.313886+00	2026-02-04 11:45:51.275752+00
b35a03e8-04a5-4f2d-b689-3cdd4a40d232	partner_1770264535022@system.local	\N	Phan Văn Việt (TT. Thích Nguyên Hùng)	\N	\N	\N	t	2026-02-05 04:08:55.689154+00	2026-02-05 04:08:55.689154+00
f927980c-d843-44df-b38d-b1488caf6968	partner_1770266148820@system.local	\N	Phan Trương Quốc Trung (ĐĐ. Thích Quang Định)	\N	\N	\N	t	2026-02-05 04:35:49.474426+00	2026-02-05 04:35:49.474426+00
3464b45c-9629-40ed-af35-10f01ed2eb5e	partner_1770277999455@system.local	\N	Đinh Thị Xuân Hồng (SC. Thích Nữ Diệu Quý)	\N	\N	\N	t	2026-02-05 07:53:20.25598+00	2026-02-05 07:53:20.25598+00
67d0398f-83c3-43ac-8628-8b072daf1fb7	partner_1770278148755@system.local	\N	TS. Phạm Thị Huệ (SC. Thích Nữ Thiền Uyên)	\N	\N	\N	t	2026-02-05 07:55:49.525539+00	2026-02-05 07:55:49.525539+00
1d1c4471-df68-4fda-8119-9c031ba500ef	partner_1770278446488@system.local	\N	ThS. Nguyễn Quang Dĩnh (TT. Thích Đồng Thọ)	\N	\N	\N	t	2026-02-05 08:00:47.240187+00	2026-02-05 08:00:47.240187+00
8885de6b-349d-4e85-871c-d2b56bc9bcda	partner_1770278534786@system.local	\N	TS. Nguyễn Tứ Tuyệt (ĐĐ. Thích Hạnh Dung)	\N	\N	\N	t	2026-02-05 08:02:15.522874+00	2026-02-05 08:02:15.522874+00
cadce8c9-c6fd-4592-983c-6b35503f2bcd	partner_1770287754660@system.local	\N	ThS. Nguyễn Thị Miều (NS. Thích Nữ Hương Trí)	\N	\N	\N	t	2026-02-05 10:35:55.526895+00	2026-02-05 10:35:55.526895+00
99434b30-4982-48e9-8c81-b3466309537e	ngochant.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Ngọc Hà	Hà	Nguyễn Ngọc	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-02-12 04:41:23.540436+00
6845e494-d1b9-40ae-b36f-2cdb09291747	linhntt.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Thị Thuỳ Linh	Linh	Nguyễn Thị Thuỳ	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:41:15.38138+00
b5b30517-5c9c-4036-afd9-4e2948651238	hoangvq.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Vũ Quốc Hoàng	Hoàng	Vũ Quốc	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-02-02 07:32:52.475749+00
c28a1e2b-b90e-44cb-95c7-4369e21d15c3	tankhai283@gmail.com	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Trần Tấn Khải	Khải	Trần Tấn	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:45:27.281026+00
65f68571-7e3a-4c4e-b67f-ce02e1899d83	partner_1770265213392@system.local	\N	Nguyễn Văn Đợi (TT. Thích Đồng Ngộ)	\N	\N	\N	t	2026-02-05 04:20:14.078795+00	2026-02-05 04:20:14.078795+00
dd30777e-7b73-4cb0-a0b7-c235d1fd6323	partner_1770265356842@system.local	\N	TS. Nguyễn Xuân Hoành (TT. Thích Quảng Đại)	\N	\N	\N	t	2026-02-05 04:22:37.483551+00	2026-02-05 04:22:37.483551+00
6267364c-d995-471f-bd07-ef118ad65d71	quyentt.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Trần Tất Quyến	Quyến	Trần Tất	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:45:42.739888+00
4afc91b9-c796-4018-b57f-636a75e9aa4e	partner_1770267034131@system.local	\N	TS. Đinh Tiên Phong	\N	\N	\N	t	2026-02-05 04:50:34.839416+00	2026-02-05 04:50:34.839416+00
fa3da8df-1bc3-43fb-be3f-25bbfdf3113b	votuoanh.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Võ Thị Tú Oanh	Oanh	Võ Thị Tú	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:45:59.55794+00
02467400-45a9-4bb2-b19c-7e66aed2e682	partner_1770279777972@system.local	\N	ThS. Phạm Thị Minh Thuận	\N	\N	\N	t	2026-02-05 08:22:58.696987+00	2026-02-05 08:22:58.696987+00
f0474fdc-ab61-4cdd-8cfd-81281b17f46f	partner_1770281195271@system.local	\N	ThS. Nguyễn Thị Thiện (SC. Thích Nhật Hằng)	\N	\N	\N	t	2026-02-05 08:46:36.066644+00	2026-02-05 08:46:36.066644+00
732a44be-0c38-4334-8897-63e49094c6e5	vuhuongvtnt@gmail.com	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Vũ Thị Hương	Hương	Vũ Thị	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:47:09.2201+00
94025b61-6607-4f2f-b2b4-f4567f14f0b8	thaodp.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Đào Phương Thảo	Thảo	Đào Phương	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:47:53.346903+00
79a84794-8a33-4b27-ab86-e2ce152e46da	hieuhn@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Hoàng Ngọc Hiếu	Hiếu	Hoàng Ngọc	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-02-12 04:54:35.595029+00
e0f74135-4578-4c1c-9944-55f17046607b	nguyendh.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Dương Hương Nguyên	Nguyên	Dương Hương	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-02-02 07:30:17.280661+00
11817e25-7e55-4b0d-82ef-9ff26de11efa	thanhctk.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Cung Thị Kim Thành	Thành	Cung Thị Kim	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-29 10:44:23.872824+00
19c6c15c-c249-4410-9c37-2f19ca885bee	sonld@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Lê Đình Sơn	Sơn	Lê Đình	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-02-02 07:30:55.163315+00
46be9276-294e-49a5-8d43-6d45b7b3fa3a	nhungkp.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Kiều Phương Nhung	Nhung	Kiều Phương	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:37:36.64554+00
ccedb4bb-b523-4a4e-a628-ccdcdb1cdef2	hoailtm@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Lê Thị Minh Hoài	Hoài	Lê Thị Minh	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:38:07.751716+00
02cfd1a3-7a97-4187-914c-55fee83f380e	thinc@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Cẩm Thi	Thi	Nguyễn Cẩm	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:39:37.566863+00
e177e33b-2720-4a23-ac89-a8a4c93857b3	maint.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nghiêm Thị Mai	Mai	Nghiêm Thị	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-02-02 07:31:26.630021+00
3c17630a-da96-42da-8147-6a8544202429	trangnl.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Linh Trang	Trang	Nguyễn Linh	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-02-02 07:31:35.225433+00
0607714e-e265-4ed1-a36f-39cedd66f10f	tienntt.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Thị Thuỷ Tiên	Tiên	Nguyễn Thị Thuỷ	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-02-02 07:31:53.686953+00
0eef4c99-11d9-420c-a012-b9defe3d5bb6	ngatt.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Trần Thanh Ngà	Ngà	Trần Thanh	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-02-02 07:32:26.505195+00
219965d8-1855-461e-81ba-5264e8405e3a	haiyenle.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Lê Thị Hải Yến	Yến	Lê Thị Hải	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-01-30 02:37:52.742916+00
f8b8d9ad-fac3-4bfc-8f09-88de3e255e00	vinhnv.vtnt@vnu.edu.vn	$2b$10$G50Nq.M0929JTemSIUBfCuIiZeHl3Jd/y0dZA8YjM9VwysX/V5EHK	Nguyễn Viết Vinh	Vinh	Nguyễn Viết	Ban Thư ký	t	2026-01-28 11:19:12.44656+00	2026-02-02 07:32:09.601464+00
0644a38e-bb56-4bdc-a6d3-453a564094eb	partner_1770265467386@system.local	\N	Nguyễn Văn Thủ (TT. Thích Nguyên Đức)	\N	\N	\N	t	2026-02-05 04:24:28.067855+00	2026-02-05 04:24:28.067855+00
f7982952-b8fa-4c61-842c-a0e53e76e4ed	partner_1770275280931@system.local	\N	TS. Lê Ngọc Sơn (ĐĐ. Thích Quảng Lâm)	\N	\N	\N	t	2026-02-05 07:08:01.638244+00	2026-02-05 07:08:01.638244+00
ec70ed67-59ca-46b3-bacd-ea4974425bf4	partner_1770279902773@system.local	\N	Trương Thành Thiệt	\N	\N	\N	t	2026-02-05 08:25:03.519458+00	2026-02-05 08:25:03.519458+00
febc990d-294e-4056-87f5-2eafea0995d3	partner_1770279968019@system.local	\N	Đỗ Minh Châu (SC. Thích Nữ Viên Lộc)	\N	\N	\N	t	2026-02-05 08:26:08.756192+00	2026-02-05 08:26:08.756192+00
bc63fe0a-d62f-49d4-8366-a0aea936fc38	partner_1770280119348@system.local	\N	Đoàn Thị Kim Thúy (SC. Thích Nữ Nguyên Thanh)	\N	\N	\N	t	2026-02-05 08:28:40.115369+00	2026-02-05 08:28:40.115369+00
a2601051-f239-4148-9ac3-5a3b7c954638	partner_1770281923006@system.local	\N	TS. Nguyễn Đình Thuận (ĐĐ. Thích Vạn Lợi)	\N	\N	\N	t	2026-02-05 08:58:43.786055+00	2026-02-05 08:58:43.786055+00
\.


--
-- TOC entry 3667 (class 0 OID 65536)
-- Dependencies: 239
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
a22f3752-58b9-4d17-8866-9063060cb114	1	Đơn bản Trường A hàm - Giai đoạn 1 (T0002-T0015)	\N	T0002 - T0015	163250	466	1.5	244875	700	\N	2026-02-03 05:02:22.577521+00	58786d42-3079-4d1e-b2f7-b160208c2293
aaf6da5e-11dd-4223-beae-f89129ad3e76	1	Đơn bản Trường A hàm - Giai đoạn 2 (T0016-T0024)	\N	T0016-T0024	185600	530	1.5	278400	795	\N	2026-02-03 05:02:22.682538+00	58786d42-3079-4d1e-b2f7-b160208c2293
6d5a09eb-9411-4d8f-b05d-2c4896283c65	1	Đơn bản Trường A hàm - Giai đoạn 3 (T0025)	\N	T0025	89700	256	1.5	134550	384	Bài tổng quan hoàn thành sau cùng	2026-02-03 05:02:22.733949+00	58786d42-3079-4d1e-b2f7-b160208c2293
879247c9-8082-43c0-ac6b-365e110b3ff7	1	A Di Đà Cổ Âm Thanh Vương đà la ni kinh	阿彌陀鼓音聲王陀羅尼經	T0370	1674	5	1.5	2511	7	\N	2026-02-03 05:02:22.785892+00	58786d42-3079-4d1e-b2f7-b160208c2293
00d5be71-070b-45bf-95cb-081b13d949d4	1	Phật thuyết Di Lặc lai thời kinh	佛說彌勒來時經	T0457	1278	4	1.5	1917	5	\N	2026-02-03 05:02:22.836581+00	58786d42-3079-4d1e-b2f7-b160208c2293
689fedd6-c42d-41f4-bab0-73941f638ca7	1	Phật thuyết Vô Lượng Thọ kinh	佛說無量壽經	T0360	20806	59	1.5	31209	89	\N	2026-02-03 05:02:22.888033+00	58786d42-3079-4d1e-b2f7-b160208c2293
b143da1a-c25d-4c6a-afe7-dd01afc38d41	1	A Súc Phật quốc kinh	阿閦佛國經	T0313	21042	60	1.5	31563	90	\N	2026-02-03 05:02:22.940134+00	58786d42-3079-4d1e-b2f7-b160208c2293
99bc0633-acb3-456a-8bdc-7ac5e4e152cf	1	Đại Thánh Văn Thù Sư Lợi Bồ tát Phật sát công đức trang nghiêm kinh	大聖文殊師利菩薩佛剎功德莊嚴經	T0319	26791	77	1.5	40187	115	\N	2026-02-03 05:02:22.991458+00	58786d42-3079-4d1e-b2f7-b160208c2293
9a549e68-5cad-41d7-acd5-d8b371267e92	1	Phật thuyết quán Phật tam muội hải kinh	佛說觀佛三昧海經	T0643	82764	236	1.5	124146	355	\N	2026-02-03 05:02:23.042662+00	58786d42-3079-4d1e-b2f7-b160208c2293
f821b268-443a-424d-93b7-038805b1189a	1	Hậu xuất A Di Đà Phật kệ	後出阿彌陀佛偈	T0373	364	1	1.5	546	2	\N	2026-02-03 05:02:23.094608+00	58786d42-3079-4d1e-b2f7-b160208c2293
b1b070d3-7506-465d-8f0a-0ab62dfd48f4	1	Phật thuyết Di Lặc đại thành Phật kinh	佛說彌勒大成佛經	T0456	9125	26	1.5	13688	39	\N	2026-02-03 05:02:23.146019+00	58786d42-3079-4d1e-b2f7-b160208c2293
43da0a0f-1385-431c-a3ba-24acd883751a	1	Nhất Thiết Trí Quang Minh tiên nhân từ tâm nhân duyên bất thực nhục kinh	一切智光明仙人慈心因緣不食肉經	T0183	2288	7	1.5	3432	10	\N	2026-02-03 05:02:23.197695+00	58786d42-3079-4d1e-b2f7-b160208c2293
0fee4dc0-4b67-49c6-a494-0c8e3588246b	1	Di Lặc Bồ tát sở vấn bản nguyện kinh	彌勒菩薩所問本願經	T0349	4198	12	1.5	6297	18	\N	2026-02-03 05:02:23.24947+00	58786d42-3079-4d1e-b2f7-b160208c2293
327c1c40-2875-4aa5-a078-f09456f8e8d9	1	Phật thuyết như huyễn tam ma địa vô lượng ấn pháp môn kinh	佛說如幻三摩地無量印法門經	T0372	10390	30	1.5	15585	45	\N	2026-02-03 05:02:23.301087+00	58786d42-3079-4d1e-b2f7-b160208c2293
e31e3b45-4775-4907-9916-a9877e930b9c	1	Thuyết vô cấu xưng kinh	說無垢稱經	T0476	48063	137	1.5	72095	206	\N	2026-02-03 05:02:23.352511+00	58786d42-3079-4d1e-b2f7-b160208c2293
57ebe0f6-d63a-42fa-a99e-1d8a4f1a334b	1	Phật thuyết Ban chu tam muội kinh	佛說般舟三昧經	T0417	7890	23	1.5	11835	34	\N	2026-02-03 05:02:23.403766+00	58786d42-3079-4d1e-b2f7-b160208c2293
3caa6fa3-ea89-4022-8aad-1b5d3d07ea9c	1	Phật thuyết A Di Đà kinh	佛說阿彌陀經	T0366	2500	7	1.5	3750	11	\N	2026-02-03 05:02:23.455148+00	58786d42-3079-4d1e-b2f7-b160208c2293
cb54495b-107e-4ef0-b503-0c90f0cb575c	1	Phật thuyết Quán Vô Lượng Thọ Phật kinh	佛說觀無量壽佛經	T0365	9400	27	1.5	14100	40	\N	2026-02-03 05:02:23.506066+00	58786d42-3079-4d1e-b2f7-b160208c2293
f83fb7e6-2180-496d-b9bf-8d9f703c7526	1	Dược Sư Lưu Ly Quang Như Lai bản nguyện công đức kinh	藥師琉璃光如來本願功德經	T0450	7000	20	1.5	10500	30	\N	2026-02-03 05:02:23.55768+00	58786d42-3079-4d1e-b2f7-b160208c2293
25ff082b-787b-405a-908d-bfab32435bd6	1	Phật thuyết Di Lặc hạ sinh kinh	佛說彌勒下生經	T0453	4100	12	1.5	6150	18	\N	2026-02-03 05:02:23.608654+00	58786d42-3079-4d1e-b2f7-b160208c2293
a9d979ac-15a9-4f52-ac22-1c4df3bf54fb	1	Phật thuyết Quán Di Lặc Bồ tát thượng sinh Đâu Suất thiên kinh	佛說觀彌勒菩薩上生兜率天經	T0452	4100	12	1.5	6150	18	\N	2026-02-03 05:02:23.660875+00	58786d42-3079-4d1e-b2f7-b160208c2293
677a2765-9ce8-41eb-bf0f-f4d69350581e	1	Tịnh độ cảnh quán yếu môn	淨土境觀要門	T1971	3497	10	1.5	5246	15	\N	2026-02-03 05:02:23.711667+00	58786d42-3079-4d1e-b2f7-b160208c2293
8f5d7d33-9372-47c4-9d08-103be014bcf0	1	Vạn thiện đồng quy tập	萬善同歸集	T2017	65000	186	1.5	97500	279	\N	2026-02-03 05:02:23.762595+00	58786d42-3079-4d1e-b2f7-b160208c2293
f7237849-2e03-4317-9cc6-a0a442f22dba	1	Bi hoa kinh	悲華經	T0157	105087	300	1.5	157631	450	\N	2026-02-03 05:02:23.813831+00	58786d42-3079-4d1e-b2f7-b160208c2293
91338029-0105-4b75-8c3b-697f7f72ab6a	1	Trung Phong Tam thời hệ niệm Phật sự	中峰三時繫念佛事	X1464	7787	22	1.5	11681	33	\N	2026-02-03 05:02:23.865095+00	58786d42-3079-4d1e-b2f7-b160208c2293
a050fa4f-746f-412a-bdc2-e17c131aac54	1	Triệt ngộ Thiền sư ngữ lục	徹悟禪師語錄	X1182	30425	87	1.5	45638	130	\N	2026-02-03 05:02:23.916595+00	58786d42-3079-4d1e-b2f7-b160208c2293
58dc3723-eb55-44b3-9d7b-d698aee2a6ae	1	Vô Lượng Thọ kinh Ưu bà đề xá nguyện sinh kệ	無量壽經優波提舍願生偈	T1524	3723	11	1.5	5585	16	\N	2026-02-03 05:02:23.96806+00	58786d42-3079-4d1e-b2f7-b160208c2293
2b1de017-b57c-4751-9ac3-9f85854d0ffc	1	Phật thuyết A Di Đà kinh nghĩa sớ	佛說阿彌陀經義疏	T1761	13330	38	1.5	19995	57	\N	2026-02-03 05:02:24.020126+00	58786d42-3079-4d1e-b2f7-b160208c2293
dec6e9c2-bb50-4887-9e09-d54c1d7f22d7	1	Di Lặc thượng sinh kinh liệu giản kí	彌勒上生經料簡記	T1774.1	28580	82	1.5	42870	122	\N	2026-02-03 05:02:24.071425+00	58786d42-3079-4d1e-b2f7-b160208c2293
71817cd9-bd27-4c09-8154-a8db4252a006	1	Di Lặc hạ sinh kinh sớ	彌勒下生經疏	T1774.2	7850	22	1.5	11775	34	\N	2026-02-03 05:02:24.12272+00	58786d42-3079-4d1e-b2f7-b160208c2293
f4077d77-12b5-4a59-9dbd-e81b3118e887	1	Phật thuyết Di Lặc thành Phật kinh sớ	佛說彌勒成佛經疏	T1774.3	4380	13	1.5	6570	19	\N	2026-02-03 05:02:24.174133+00	58786d42-3079-4d1e-b2f7-b160208c2293
9d547fdc-42de-4b77-a8ec-df334d446789	1	A Di Đà kinh ước luận	阿彌陀經約論	X0433	2711	8	1.5	4067	12	\N	2026-02-03 05:02:24.225231+00	58786d42-3079-4d1e-b2f7-b160208c2293
6b44ba4a-7bbd-4666-bde4-837a1ccb322f	1	Tây phương nguyện văn giải	西方願文解	X1160	2706	8	1.5	4059	12	\N	2026-02-03 05:02:24.276663+00	58786d42-3079-4d1e-b2f7-b160208c2293
478fc7e8-de08-43a1-bc75-53ff916d4244	1	Phật thuyết Quán Vô Lượng Thọ Phật kinh lược luận	佛說觀無量壽佛經略論	B0157	12040	34	1.5	18060	52	\N	2026-02-03 05:02:24.327641+00	58786d42-3079-4d1e-b2f7-b160208c2293
70f08578-0027-475f-995c-c603e3d334bb	1	Quán Vô Lượng Thọ kinh nghĩa sớ	觀無量壽經義疏	T1749	24737	71	1.5	37106	106	\N	2026-02-03 05:02:24.378596+00	58786d42-3079-4d1e-b2f7-b160208c2293
9d305a98-7681-43db-af2f-005e428cf0d6	1	Quán Vô Lượng Thọ Phật kinh sớ diệu tông sao	觀無量壽佛經疏玅宗鈔	X0407	80433	230	1.5	120650	345	\N	2026-02-03 05:02:24.430366+00	58786d42-3079-4d1e-b2f7-b160208c2293
a24de126-6b94-4cc8-873b-7ac99a4842eb	1	Tây phương phát nguyện văn chú	西方發願文註	X1161	11018	31	1.5	16527	47	\N	2026-02-03 05:02:24.482736+00	58786d42-3079-4d1e-b2f7-b160208c2293
0049801e-fabf-41ac-b8d7-f60157891ecd	1	Quán Di Lặc thượng sinh Đâu Suất thiên kinh tán	觀彌勒上生兜率天經贊	T1772	45380	130	1.5	68070	194	\N	2026-02-03 05:02:24.534134+00	58786d42-3079-4d1e-b2f7-b160208c2293
00a25776-df86-475d-b033-6543b2bda9a2	1	Thán dị sao	歎異抄	T2661	11151	32	1.5	16727	48	\N	2026-02-03 05:02:24.585597+00	58786d42-3079-4d1e-b2f7-b160208c2293
5f5b78f6-b16a-43d4-9426-3892cd02097d	1	Phật thuyết A Di Đà kinh sớ	佛說阿彌陀經疏	T1760	9977	29	1.5	14966	43	\N	2026-02-03 05:02:24.636115+00	58786d42-3079-4d1e-b2f7-b160208c2293
ef5fac35-417c-4d83-80fa-d21839313b02	1	Giác hổ tập	角虎集	X1177	61497	176	1.5	92246	264	\N	2026-02-03 05:02:24.687091+00	58786d42-3079-4d1e-b2f7-b160208c2293
032551d1-38e8-4dc3-a513-86ab180f7045	1	Hám Sơn đại sư Tịnh tông pháp yếu	憨山大師淨宗法要	X1456	9361	27	1.5	14042	40	\N	2026-02-03 05:02:24.737574+00	58786d42-3079-4d1e-b2f7-b160208c2293
61c61452-34f0-475a-8af5-c4cb48dbdeb6	1	Lư Sơn Liên tông bảo giám	廬山蓮宗寶鑑	T1973	75547	216	1.5	113321	324	\N	2026-02-03 05:02:24.788549+00	58786d42-3079-4d1e-b2f7-b160208c2293
c1d76abd-f66e-43d8-b32c-c9435cfdea7e	1	Hoa Nghiêm niệm Phật	華嚴念佛	X1030	7661	22	1.5	11492	33	\N	2026-02-03 05:02:24.840466+00	58786d42-3079-4d1e-b2f7-b160208c2293
4e5b1a82-50e0-4e41-a4fd-283147a9c622	1	Vân Thê Tịnh độ vựng ngữ	雲棲淨土彙語	X1170	28168	80	1.5	42252	121	\N	2026-02-03 05:02:24.891641+00	58786d42-3079-4d1e-b2f7-b160208c2293
059e45ab-67e2-4d4f-b806-93d0a8489823	1	Vô Lượng Thọ kinh Ưu Bà Đề Xá nguyện sinh kệ chú	無量壽經優婆提舍願生偈註	T1819	28976	83	1.5	43464	124	\N	2026-02-03 05:02:24.942293+00	58786d42-3079-4d1e-b2f7-b160208c2293
3dd2f449-cd5d-44f5-8c8c-08a316f0758e	2	Văn Thù Sư Lợi Phật độ nghiêm tịnh kinh	文殊師利佛土嚴淨經	T11n0318	18198	52	1.5	27297	78	\N	2026-02-03 05:06:00.367791+00	58786d42-3079-4d1e-b2f7-b160208c2293
84ef28b6-2233-4ba4-a5a6-679b73704cb7	2	Văn Thù Sư Lợi sở thuyết bất tư nghì Phật cảnh giới kinh	文殊師利所說不思議佛境界經	T12n0340	12397	35	1.5	18596	53	\N	2026-02-03 05:06:00.41434+00	58786d42-3079-4d1e-b2f7-b160208c2293
926919ad-27c5-4456-8f02-5b28e36c0bb7	2	Văn Thù Sư Lợi vấn Bồ tát thự kinh	文殊師利問菩薩署經	T14n0458	11263	32	1.5	16895	48	\N	2026-02-03 05:06:00.461443+00	58786d42-3079-4d1e-b2f7-b160208c2293
2cd2f041-15f7-4429-9724-d9c96eb3430d	2	Phật thuyết Văn Thù hối quá kinh	佛說文殊悔過經	T14n0459	10991	31	1.5	16487	47	\N	2026-02-03 05:06:00.509632+00	58786d42-3079-4d1e-b2f7-b160208c2293
b9cc7aca-2116-4218-b5a2-077735bfce17	2	Phật thuyết Văn Thù Sư Lợi tịnh luật kinh	佛說文殊師利淨律經	T14n0460	7073	20	1.5	10610	30	\N	2026-02-03 05:06:00.557861+00	58786d42-3079-4d1e-b2f7-b160208c2293
4e1389e1-642c-4e99-9922-30adfc0281ad	2	Phật thuyết Văn Thù Sư Lợi hiện bảo tạng kinh	佛說文殊師利現寶藏經	T14n0461	23418	67	1.5	35127	100	\N	2026-02-03 05:06:00.604301+00	58786d42-3079-4d1e-b2f7-b160208c2293
26e453f9-1442-4df4-a799-46c5eec62227	2	Đại phương quảng bảo khiếp kinh	大方廣寶篋經	T14n0462	23428	67	1.5	35142	100	\N	2026-02-03 05:06:00.650757+00	58786d42-3079-4d1e-b2f7-b160208c2293
81d1ee03-0da8-4e35-9bd5-ffe156153c05	2	Phật thuyết Văn Thù Sư Lợi Bát Niết bàn kinh	佛說文殊師利般涅槃經	T14n0463	2009	6	1.5	3014	9	\N	2026-02-03 05:06:00.696789+00	58786d42-3079-4d1e-b2f7-b160208c2293
225a2c43-bc77-46da-92a7-d5f8bdc26cbb	2	Văn Thù Sư Lợi vấn bồ đề kinh	文殊師利問菩提經	T14n0464	3642	10	1.5	5463	16	\N	2026-02-03 05:06:00.742757+00	58786d42-3079-4d1e-b2f7-b160208c2293
a9f61532-1cae-4cfa-9dbf-52ab895676ce	2	Già Da sơn đỉnh kinh	伽耶山頂經	T14n0465	5377	15	1.5	8066	23	\N	2026-02-03 05:06:00.789428+00	58786d42-3079-4d1e-b2f7-b160208c2293
c9dc076d-db00-46fa-b79d-3600a75ef782	2	Phật thuyết tượng đầu tinh xá kinh	佛說象頭精舍經	T14n0466	5064	14	1.5	7596	22	\N	2026-02-03 05:06:00.836346+00	58786d42-3079-4d1e-b2f7-b160208c2293
29cc0578-0050-45f1-81d5-9b3c9a4dcd34	2	Đại thừa Già Da sơn đỉnh kinh	大乘伽耶山頂經	T14n0467	4339	12	1.5	6509	19	\N	2026-02-03 05:06:00.882741+00	58786d42-3079-4d1e-b2f7-b160208c2293
4db59d81-1d27-4e80-8b77-2664960aebd6	2	Văn Thù Sư Lợi vấn kinh	文殊師利問經	T14n0468	27916	80	1.5	41874	120	\N	2026-02-03 05:06:00.928881+00	58786d42-3079-4d1e-b2f7-b160208c2293
f51ca2e0-92a0-4a11-b422-e2a345254d2c	2	Văn Thù vấn kinh tự mẫu phẩm đệ thập tứ	文殊問經字母品第十四	T14n0469	921	3	1.5	1382	4	\N	2026-02-03 05:06:00.974748+00	58786d42-3079-4d1e-b2f7-b160208c2293
7f578f9d-def0-435e-bb34-e2b209f7e927	2	Phật thuyết Văn Thù Sư Lợi tuần hành kinh	佛說文殊師利巡行經	T14n0470	3171	9	1.5	4757	14	\N	2026-02-03 05:06:01.021126+00	58786d42-3079-4d1e-b2f7-b160208c2293
76c5148e-741e-4107-89c3-fc765bde4cb2	2	Phật thuyết Văn Thù Sư Lợi hành kinh	佛說文殊師利行經	T14n0471	4108	12	1.5	6162	18	\N	2026-02-03 05:06:01.067812+00	58786d42-3079-4d1e-b2f7-b160208c2293
daeb56b6-4114-4557-94bd-3c1a3af80725	2	Phật thuyết Đại thừa thiện kiến biến hoá Văn Thù Sư Lợi vấn pháp kinh	佛說大乘善見變化文殊師利問法經	T14n0472	3184	9	1.5	4776	14	\N	2026-02-03 05:06:01.11465+00	58786d42-3079-4d1e-b2f7-b160208c2293
1b1b52ee-08ab-426e-9370-d702884a49cd	2	Phật thuyết Diệu Cát Tường Bồ tát sở vấn Đại thừa Pháp Loa kinh	佛說妙吉祥菩薩所問大乘法螺經	T14n0473	2732	8	1.5	4098	12	\N	2026-02-03 05:06:01.162168+00	58786d42-3079-4d1e-b2f7-b160208c2293
7772492d-9899-4f41-a92e-6819e04a5ab8	2	Vô Lượng Thọ Kinh nghĩa sớ	無量壽經義疏	T37n1745	47348	135	1.5	71022	203	\N	2026-02-03 05:06:01.208302+00	58786d42-3079-4d1e-b2f7-b160208c2293
5e1bb2c4-aa56-4b98-9275-e2f68ba08b0b	2	Vô Lượng Thọ Kinh nghĩa sớ	無量壽經義疏	T37n1746	16636	48	1.5	24954	71	\N	2026-02-03 05:06:01.254283+00	58786d42-3079-4d1e-b2f7-b160208c2293
b8e0dcf6-1a7c-4565-949b-b47d672d8a5e	2	Lưỡng quyển Vô Lượng Thọ Kinh tông yếu	兩卷無量壽經宗要	T37n1747	10526	30	1.5	15789	45	\N	2026-02-03 05:06:01.300863+00	58786d42-3079-4d1e-b2f7-b160208c2293
08b09af3-3932-46d2-8a04-17df72486012	2	Vô Lượng Thọ Kinh liên nghĩa thuật văn tán	無量壽經連義述文贊	T37n1748	67455	193	1.5	101183	289	\N	2026-02-03 05:06:01.346247+00	58786d42-3079-4d1e-b2f7-b160208c2293
0c644088-5011-4895-9b5e-b043757db3c0	2	Vô Lượng Thọ Kinh nghĩa ký	無量壽經義記	T85n2759	14993	43	1.5	22490	64	\N	2026-02-03 05:06:01.392219+00	58786d42-3079-4d1e-b2f7-b160208c2293
45045f3f-c044-49a3-9953-b6cb1451e8ec	2	Vô Lượng Thọ Kinh khởi tín luận	無量壽經起信論	X22n0400	33019	94	1.5	49529	142	\N	2026-02-03 05:06:01.43775+00	58786d42-3079-4d1e-b2f7-b160208c2293
c27ebc57-3368-4a84-b68b-4ec1b9c166a6	2	Xưng tán Tịnh Độ Phật nhiếp thụ Kinh	稱讚淨土佛攝受經	T12n0367	4696	13	1.5	7044	20	\N	2026-02-03 05:06:01.485862+00	58786d42-3079-4d1e-b2f7-b160208c2293
6c63584e-f192-429d-bbb6-36db6a1b8a21	2	A Di Đà Kinh sớ	阿彌陀經疏	T37n1757	31681	91	1.5	47522	136	\N	2026-02-03 05:06:01.532229+00	58786d42-3079-4d1e-b2f7-b160208c2293
d64d05ec-877b-4e7c-8fc8-e96950874dbc	2	Phật thuyết A Di Đà Kinh sớ	佛說阿彌陀經疏	T37n1759	4454	13	1.5	6681	19	\N	2026-02-03 05:06:01.578235+00	58786d42-3079-4d1e-b2f7-b160208c2293
f9b9b4b1-8726-4fe4-8c49-d9e51896c2fd	2	Thuyết A Di Đà Kinh nghĩa sớ	說阿彌陀經義疏	T37n1761	13330	38	1.5	19995	57	\N	2026-02-03 05:06:01.624789+00	58786d42-3079-4d1e-b2f7-b160208c2293
a0441d36-f1ff-4052-bd4f-272ec8fc1ba9	2	Phật thuyết A Di Đà Kinh sớ sao	佛說阿彌陀經疏鈔	X22n0424	100454	287	1.5	150681	431	\N	2026-02-03 05:06:01.671254+00	58786d42-3079-4d1e-b2f7-b160208c2293
871d9acc-eb4c-406d-b586-80a1e2695eb1	2	Phật thuyết Quán Vô Lượng Thọ Phật Kinh sớ	佛說觀無量壽佛經疏	T37n1750	15149	43	1.5	22724	65	\N	2026-02-03 05:06:01.717296+00	58786d42-3079-4d1e-b2f7-b160208c2293
41926cf7-2dca-4451-b230-d8e989a598ec	2	Quán Vô Lượng Thọ Kinh nghĩa sớ	觀無量壽經義疏	T37n1752	21230	61	1.5	31845	91	\N	2026-02-03 05:06:01.763731+00	58786d42-3079-4d1e-b2f7-b160208c2293
2139cc07-af6c-4e50-82d0-d0a3bf186dd1	2	Quán Vô Lượng Thọ Phật Kinh sớ	觀無量壽佛經疏	T37n1753	53946	154	1.5	80919	231	\N	2026-02-03 05:06:01.810877+00	58786d42-3079-4d1e-b2f7-b160208c2293
6dcd3380-3c06-44d8-92ca-4d9ab33813e4	2	Quán Vô Lượng Thọ Phật Kinh nghĩa sớ	觀無量壽佛經義疏	T37n1754	46736	134	1.5	70104	200	\N	2026-02-03 05:06:01.857268+00	58786d42-3079-4d1e-b2f7-b160208c2293
f283c1ec-b6a0-43d0-b8d9-c942c5610d6f	2	Linh Chi quán Kinh nghĩa sớ chính quán ký	靈芝觀經義疏正觀記	X22n0411	56827	162	1.5	85241	244	\N	2026-02-03 05:06:01.903259+00	58786d42-3079-4d1e-b2f7-b160208c2293
5c27a026-4376-48d7-ac6f-365137953351	2	Phật thuyết Quán Vô Lượng Thọ Phật Kinh trực chỉ sớ	佛說觀無量壽佛經直指疏	X22n0413	30417	87	1.5	45626	130	\N	2026-02-03 05:06:01.950717+00	58786d42-3079-4d1e-b2f7-b160208c2293
e539474b-faec-4e63-83bb-d5ec1c2a9da9	2	Trường A hàm kinh	長阿含經	\N	247900	708	1.5	371850	1062	\N	2026-02-03 05:09:21.786066+00	58786d42-3079-4d1e-b2f7-b160208c2293
d137386f-057d-45e6-a360-8de6e5e0b956	1	Thiền tông khoá hư ngữ lục	禪宗課虛語錄	AB.268	42000	120	\N	\N	\N	- Số trang sách gốc: 120 trang\r\n- Hán + Nôm	2026-02-03 10:49:56.02439+00	25aed873-6915-4d53-9354-5f9704364fb1
b9e807bf-ebab-47ce-acd3-23d73c164a6b	1	Tam Tổ thực lục	三祖實錄	A.786	18000	51	\N	\N	\N	- Số trang sách gốc: 51 trang\r\n- Hán	2026-02-03 10:49:56.068693+00	25aed873-6915-4d53-9354-5f9704364fb1
c5bedfe2-92bb-4f35-aa8f-7375a5327832	1	Thánh đăng lục	聖燈錄	A.2569	9000	26	\N	\N	\N	- Số trang sách gốc: 26 trang\r\n- Hán	2026-02-03 10:49:56.112235+00	25aed873-6915-4d53-9354-5f9704364fb1
4290fae9-79e5-4746-b8ff-baff91f1385c	1	Thiền uyển tập anh	禪苑集英	VHV.1267	15000	43	\N	\N	\N	- Số trang sách gốc: 43 trang\r\n- Hán	2026-02-03 10:49:56.156218+00	25aed873-6915-4d53-9354-5f9704364fb1
5cfc9d7e-9668-462c-8e79-7d5d5d42033d	1	Tam giáo chính độ thực lục	三教正度實籙	A.3025	22000	63	\N	\N	\N	- Số trang sách gốc: 63 trang\r\n- Hán	2026-02-03 10:49:56.19978+00	25aed873-6915-4d53-9354-5f9704364fb1
957e73b4-3704-4670-951c-b70a551f1412	1	Di Đà cảnh giới hạnh	彌陀境界行	AB.371	11300	32	\N	\N	\N	- Số trang sách gốc: 32 trang\r\n- Nôm	2026-02-03 10:49:56.243158+00	25aed873-6915-4d53-9354-5f9704364fb1
f4b45751-70ac-4a78-86d3-a973fc7e64fa	1	Nam Hải Quan Âm bản hạnh quốc ngữ diệu soạn	南海觀音本行國語妙譔	AB.550	11494	33	\N	\N	\N	'- Số trang sách gốc: 33 trang\r\n- Nôm	2026-02-03 10:49:56.287539+00	25aed873-6915-4d53-9354-5f9704364fb1
297a8e9d-e93f-4949-944c-0a5a5ecb3aa5	1	Thiền lâm bảo huấn	禪林寶訓	File cá nhân (Nguyễn Văn Thanh)	40000	114	\N	\N	\N	- Số trang sách gốc: 114 trang\r\n- Hán + Nôm	2026-02-03 10:49:56.331526+00	25aed873-6915-4d53-9354-5f9704364fb1
6a63a508-b2a4-4095-8dfa-3e98ac085ee4	2	Đại học chi thư tái trị yếu tập	大學之書再治要集	File cá nhân (Nguyễn Tứ Tuyệt)	30000	86	4	120000	343	- Số trang sách gốc: 86 trang	2026-02-03 10:49:56.375681+00	25aed873-6915-4d53-9354-5f9704364fb1
53a6672c-0fa9-4e6e-ae6a-96692c069263	2	Hàm Long sơn chí	含龍山志	File cá nhân (Nguyễn Hà)	100000	286	4	400000	1143	- Số trang sách gốc: 286 trang	2026-02-03 10:49:56.420321+00	25aed873-6915-4d53-9354-5f9704364fb1
7c1a761a-dc0e-488b-b22c-1ad6a74069a4	2	Quan Âm tế độ diễn nghĩa kinh	觀音濟度演義經	File cá nhân (Nguyễn Văn Sâm)	56000	160	3	168000	480	- Số trang sách gốc: 160 trang\r\n- Nôm	2026-02-03 10:49:56.464701+00	25aed873-6915-4d53-9354-5f9704364fb1
90c6fdd5-34f6-4d1f-bf11-578693aae890	2	Phật tâm luận	佛心論	File cá nhân (Nguyễn Anh Tú)	26000	74	4	104000	297	- Số trang sách gốc: 74 trang	2026-02-03 10:49:56.508483+00	25aed873-6915-4d53-9354-5f9704364fb1
a7c90066-6d83-46a4-9886-8daaba1ecf04	2	Tuệ Trung Thượng Sĩ ngữ lục	慧忠上士語録	A.1932	13000	37	4	52000	149	- Số trang sách gốc: 37 trang	2026-02-03 10:49:56.567752+00	25aed873-6915-4d53-9354-5f9704364fb1
70715a25-400a-4c82-8772-72ba060396e1	2	Diệu pháp liên hoa kinh yếu giải hoa ngôn	玅法蓮華經要解華言	AB.488	284784	814	4	1139136	3255	- Số trang sách gốc: 814 trang	2026-02-03 10:49:56.611653+00	25aed873-6915-4d53-9354-5f9704364fb1
4adc740c-2bc3-4ea6-a7da-c01e8e11b267	3	Đạo giáo nguyên lưu	道教源流	A.2675	150850	431	4	603400	1724	- Số trang sách gốc: 431 trang	2026-02-03 10:49:56.655315+00	25aed873-6915-4d53-9354-5f9704364fb1
fbd64917-a276-4710-8e43-5f15b520f458	3	Tam Tổ cúng Tổ khoa	三祖供祖科	File cá nhân (Nguyễn Hải Anh)	6715	19	4	26860	77	- Số trang sách gốc: 19 trang	2026-02-03 10:49:56.700005+00	25aed873-6915-4d53-9354-5f9704364fb1
6bc14e46-7ec1-4b46-9bbf-780e34b19d0f	3	Chư kinh diễn âm	諸經演音	File cá nhân (Mai Văn Lâm)	32982	94	3	98946	283	- Số trang sách gốc: 94 trang	2026-02-03 10:49:56.743222+00	25aed873-6915-4d53-9354-5f9704364fb1
24d9c9aa-f577-43ef-8087-5d80d901361e	3	Địa tạng kinh thích giải Hoa ngôn	地藏經釋解華言	File cá nhân (Mai Văn Lâm)	44544	127	4	178176	509	- Số trang sách gốc: 127 trang	2026-02-03 10:49:56.78783+00	25aed873-6915-4d53-9354-5f9704364fb1
29657658-a9c1-450c-a24b-a9e89ca7243f	3	Ngự chế thiền điển thống yếu kế đăng lục	御製禪典統要繼燈錄	AC.158a	54200	155	4.5	243900	697	- Số trang sách gốc: 155 trang	2026-02-03 10:49:56.831523+00	25aed873-6915-4d53-9354-5f9704364fb1
8a8adbc3-e743-4224-8d93-43860ec8939a	3	Hương Hải thiền sư ngữ lục	香海禪師語錄	VHV.2379	10080	29	4	40320	115	- Số trang sách gốc: 29 trang	2026-02-03 10:49:56.875462+00	25aed873-6915-4d53-9354-5f9704364fb1
fdc584ae-6e47-4caf-8c5d-e6daffe2561f	3	Tam bảo biện hoặc luận	三寳辯惑論	File cá nhân (Nguyễn Ngọc Phỉ)	70771	202	5	353855	1011	- Số trang sách gốc: 202 trang	2026-02-03 10:49:56.919915+00	25aed873-6915-4d53-9354-5f9704364fb1
7355b3b0-302d-4c0f-b480-6e43aa627cd2	4	Ngũ Hành Sơn lục	五行山录	File cá nhân (Ngô Đức Chí)	19926	57	4	79704	228	- Số trang sách gốc: 57 trang	2026-02-03 10:49:56.964443+00	25aed873-6915-4d53-9354-5f9704364fb1
b04cc7e3-518c-43f4-aa71-da650bdc1f32	4	Đại Điên Am Chủ chú giải Bát nhã tâm kinh	大顛庵主註解八若心經	AB.530	32680	93	4	130720	373	- Số trang sách gốc: 93 trang	2026-02-03 10:49:57.01015+00	25aed873-6915-4d53-9354-5f9704364fb1
35812c2e-3a09-4f1a-9d9e-b0951d7c53e3	4	Phật thuyết nhân quả bản hạnh	佛說因果本行	AB.177	15660	45	3.5	54810	157	- Số trang sách gốc: 45 trang	2026-02-03 10:49:57.053097+00	25aed873-6915-4d53-9354-5f9704364fb1
dc31ce98-bd6d-411e-a7d9-67e1585466a2	4	Tại gia tu trì Thích giáo nguyên lưu	在家修持釋教源流	A.3156	81000	231	4	324000	926	- Số trang sách gốc: 231 trang	2026-02-03 10:49:57.096693+00	25aed873-6915-4d53-9354-5f9704364fb1
5fb2a28c-71cc-4a27-98ba-a0864f96b0ff	4	Phật quốc ký truyện	佛國記傳	File cá nhân (Nguyễn Tuấn Cường)	26712	76	3	80136	229	- Số trang sách gốc: 76 trang	2026-02-03 10:49:57.140627+00	25aed873-6915-4d53-9354-5f9704364fb1
\.


--
-- TOC entry 3460 (class 2606 OID 65602)
-- Name: components components_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.components
    ADD CONSTRAINT components_code_key UNIQUE (code);


--
-- TOC entry 3462 (class 2606 OID 65600)
-- Name: components components_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.components
    ADD CONSTRAINT components_pkey PRIMARY KEY (id);


--
-- TOC entry 3422 (class 2606 OID 57467)
-- Name: groups groups_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_code_unique UNIQUE (code);


--
-- TOC entry 3424 (class 2606 OID 57465)
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- TOC entry 3469 (class 2606 OID 73745)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 3481 (class 2606 OID 90153)
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- TOC entry 3477 (class 2606 OID 81952)
-- Name: proofreading_contract_members proofreading_contract_members_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.proofreading_contract_members
    ADD CONSTRAINT proofreading_contract_members_pkey PRIMARY KEY (id);


--
-- TOC entry 3458 (class 2606 OID 65569)
-- Name: proofreading_contracts proofreading_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.proofreading_contracts
    ADD CONSTRAINT proofreading_contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 3434 (class 2606 OID 57504)
-- Name: roles roles_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_code_unique UNIQUE (code);


--
-- TOC entry 3436 (class 2606 OID 57502)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3412 (class 2606 OID 49244)
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- TOC entry 3418 (class 2606 OID 57357)
-- Name: task_assignments task_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 3420 (class 2606 OID 57359)
-- Name: task_assignments task_assignments_unique_assignment; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_unique_assignment UNIQUE (task_id, user_id, stage_type, round_number);


--
-- TOC entry 3409 (class 2606 OID 49185)
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- TOC entry 3473 (class 2606 OID 81929)
-- Name: translation_contract_members translation_contract_members_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.translation_contract_members
    ADD CONSTRAINT translation_contract_members_pkey PRIMARY KEY (id);


--
-- TOC entry 3453 (class 2606 OID 65554)
-- Name: translation_contracts translation_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.translation_contracts
    ADD CONSTRAINT translation_contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 3429 (class 2606 OID 57477)
-- Name: user_groups user_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_pkey PRIMARY KEY (id);


--
-- TOC entry 3431 (class 2606 OID 57479)
-- Name: user_groups user_groups_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_unique UNIQUE (user_id, group_id);


--
-- TOC entry 3441 (class 2606 OID 57514)
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3399 (class 2606 OID 49165)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3401 (class 2606 OID 49163)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3448 (class 2606 OID 65544)
-- Name: works works_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.works
    ADD CONSTRAINT works_pkey PRIMARY KEY (id);


--
-- TOC entry 3410 (class 1259 OID 49245)
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- TOC entry 3463 (class 1259 OID 65603)
-- Name: idx_components_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_components_code ON public.components USING btree (code);


--
-- TOC entry 3464 (class 1259 OID 65604)
-- Name: idx_components_display_order; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_components_display_order ON public.components USING btree (display_order);


--
-- TOC entry 3425 (class 1259 OID 57468)
-- Name: idx_groups_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_groups_code ON public.groups USING btree (code);


--
-- TOC entry 3465 (class 1259 OID 73763)
-- Name: idx_notifications_assignment_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_assignment_type ON public.notifications USING btree (user_id, task_assignment_id, type);


--
-- TOC entry 3466 (class 1259 OID 73761)
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- TOC entry 3467 (class 1259 OID 73762)
-- Name: idx_notifications_user_read; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, is_read);


--
-- TOC entry 3478 (class 1259 OID 90160)
-- Name: idx_payments_payment_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_payments_payment_date ON public.payments USING btree (payment_date) WHERE (payment_date IS NOT NULL);


--
-- TOC entry 3479 (class 1259 OID 90159)
-- Name: idx_payments_translation_contract; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_payments_translation_contract ON public.payments USING btree (contract_id) WHERE (contract_id IS NOT NULL);


--
-- TOC entry 3474 (class 1259 OID 81963)
-- Name: idx_proofreading_contract_members_proofreading_contract_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_proofreading_contract_members_proofreading_contract_id ON public.proofreading_contract_members USING btree (proofreading_contract_id);


--
-- TOC entry 3475 (class 1259 OID 81964)
-- Name: idx_proofreading_contract_members_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_proofreading_contract_members_user_id ON public.proofreading_contract_members USING btree (user_id);


--
-- TOC entry 3454 (class 1259 OID 65644)
-- Name: idx_proofreading_contracts_component_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_proofreading_contracts_component_id ON public.proofreading_contracts USING btree (component_id) WHERE (component_id IS NOT NULL);


--
-- TOC entry 3455 (class 1259 OID 65581)
-- Name: idx_proofreading_contracts_translation_contract_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_proofreading_contracts_translation_contract_id ON public.proofreading_contracts USING btree (translation_contract_id);


--
-- TOC entry 3456 (class 1259 OID 65580)
-- Name: idx_proofreading_contracts_work_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_proofreading_contracts_work_id ON public.proofreading_contracts USING btree (work_id);


--
-- TOC entry 3432 (class 1259 OID 57505)
-- Name: idx_roles_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_roles_code ON public.roles USING btree (code);


--
-- TOC entry 3413 (class 1259 OID 57372)
-- Name: idx_task_assignments_due_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_task_assignments_due_date ON public.task_assignments USING btree (due_date) WHERE (due_date IS NOT NULL);


--
-- TOC entry 3414 (class 1259 OID 57373)
-- Name: idx_task_assignments_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_task_assignments_status ON public.task_assignments USING btree (status);


--
-- TOC entry 3415 (class 1259 OID 57370)
-- Name: idx_task_assignments_task_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_task_assignments_task_id ON public.task_assignments USING btree (task_id);


--
-- TOC entry 3416 (class 1259 OID 57371)
-- Name: idx_task_assignments_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_task_assignments_user_id ON public.task_assignments USING btree (user_id);


--
-- TOC entry 3402 (class 1259 OID 49229)
-- Name: idx_tasks_contract_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tasks_contract_id ON public.tasks USING btree (contract_id) WHERE (contract_id IS NOT NULL);


--
-- TOC entry 3403 (class 1259 OID 49227)
-- Name: idx_tasks_group; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tasks_group ON public.tasks USING btree ("group");


--
-- TOC entry 3404 (class 1259 OID 65589)
-- Name: idx_tasks_related_contract; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tasks_related_contract ON public.tasks USING btree (related_contract_id) WHERE (related_contract_id IS NOT NULL);


--
-- TOC entry 3405 (class 1259 OID 65588)
-- Name: idx_tasks_related_work; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tasks_related_work ON public.tasks USING btree (related_work_id) WHERE (related_work_id IS NOT NULL);


--
-- TOC entry 3406 (class 1259 OID 49228)
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- TOC entry 3407 (class 1259 OID 65590)
-- Name: idx_tasks_task_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tasks_task_type ON public.tasks USING btree (task_type) WHERE (task_type IS NOT NULL);


--
-- TOC entry 3470 (class 1259 OID 81940)
-- Name: idx_translation_contract_members_translation_contract_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_translation_contract_members_translation_contract_id ON public.translation_contract_members USING btree (translation_contract_id);


--
-- TOC entry 3471 (class 1259 OID 81941)
-- Name: idx_translation_contract_members_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_translation_contract_members_user_id ON public.translation_contract_members USING btree (user_id);


--
-- TOC entry 3449 (class 1259 OID 65643)
-- Name: idx_translation_contracts_component_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_translation_contracts_component_id ON public.translation_contracts USING btree (component_id) WHERE (component_id IS NOT NULL);


--
-- TOC entry 3450 (class 1259 OID 65561)
-- Name: idx_translation_contracts_contract_number; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_translation_contracts_contract_number ON public.translation_contracts USING btree (contract_number) WHERE (contract_number IS NOT NULL);


--
-- TOC entry 3451 (class 1259 OID 65560)
-- Name: idx_translation_contracts_work_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_translation_contracts_work_id ON public.translation_contracts USING btree (work_id);


--
-- TOC entry 3426 (class 1259 OID 57491)
-- Name: idx_user_groups_group_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_groups_group_id ON public.user_groups USING btree (group_id);


--
-- TOC entry 3427 (class 1259 OID 57490)
-- Name: idx_user_groups_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_groups_user_id ON public.user_groups USING btree (user_id);


--
-- TOC entry 3437 (class 1259 OID 73735)
-- Name: idx_user_roles_component_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_roles_component_id ON public.user_roles USING btree (component_id) WHERE (component_id IS NOT NULL);


--
-- TOC entry 3438 (class 1259 OID 57528)
-- Name: idx_user_roles_role_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_roles_role_id ON public.user_roles USING btree (role_id);


--
-- TOC entry 3439 (class 1259 OID 57527)
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- TOC entry 3397 (class 1259 OID 49221)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 3444 (class 1259 OID 65642)
-- Name: idx_works_component_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_works_component_id ON public.works USING btree (component_id) WHERE (component_id IS NOT NULL);


--
-- TOC entry 3445 (class 1259 OID 65546)
-- Name: idx_works_document_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_works_document_code ON public.works USING btree (document_code) WHERE (document_code IS NOT NULL);


--
-- TOC entry 3446 (class 1259 OID 65545)
-- Name: idx_works_stage; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_works_stage ON public.works USING btree (stage) WHERE (stage IS NOT NULL);


--
-- TOC entry 3442 (class 1259 OID 73734)
-- Name: user_roles_user_role_component_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX user_roles_user_role_component_key ON public.user_roles USING btree (user_id, role_id, component_id) WHERE (component_id IS NOT NULL);


--
-- TOC entry 3443 (class 1259 OID 73733)
-- Name: user_roles_user_role_global_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX user_roles_user_role_global_key ON public.user_roles USING btree (user_id, role_id) WHERE (component_id IS NULL);


--
-- TOC entry 3507 (class 2620 OID 57534)
-- Name: groups groups_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3513 (class 2620 OID 90161)
-- Name: payments payments_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3512 (class 2620 OID 81971)
-- Name: proofreading_contract_members proofreading_contract_members_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER proofreading_contract_members_updated_at BEFORE UPDATE ON public.proofreading_contract_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3509 (class 2620 OID 57536)
-- Name: roles roles_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3506 (class 2620 OID 57530)
-- Name: task_assignments task_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER task_assignments_updated_at BEFORE UPDATE ON public.task_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3505 (class 2620 OID 49235)
-- Name: tasks tasks_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3511 (class 2620 OID 81970)
-- Name: translation_contract_members translation_contract_members_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER translation_contract_members_updated_at BEFORE UPDATE ON public.translation_contract_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3508 (class 2620 OID 57535)
-- Name: user_groups user_groups_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER user_groups_updated_at BEFORE UPDATE ON public.user_groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3510 (class 2620 OID 57537)
-- Name: user_roles user_roles_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3504 (class 2620 OID 49233)
-- Name: users users_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3496 (class 2606 OID 73756)
-- Name: notifications notifications_task_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_task_assignment_id_fkey FOREIGN KEY (task_assignment_id) REFERENCES public.task_assignments(id) ON DELETE CASCADE;


--
-- TOC entry 3497 (class 2606 OID 73751)
-- Name: notifications notifications_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- TOC entry 3498 (class 2606 OID 73746)
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3503 (class 2606 OID 90154)
-- Name: payments payments_translation_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_translation_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.translation_contracts(id) ON DELETE CASCADE;


--
-- TOC entry 3501 (class 2606 OID 81953)
-- Name: proofreading_contract_members proofreading_contract_members_proofreading_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.proofreading_contract_members
    ADD CONSTRAINT proofreading_contract_members_proofreading_contract_id_fkey FOREIGN KEY (proofreading_contract_id) REFERENCES public.proofreading_contracts(id) ON DELETE CASCADE;


--
-- TOC entry 3502 (class 2606 OID 81958)
-- Name: proofreading_contract_members proofreading_contract_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.proofreading_contract_members
    ADD CONSTRAINT proofreading_contract_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3493 (class 2606 OID 65637)
-- Name: proofreading_contracts proofreading_contracts_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.proofreading_contracts
    ADD CONSTRAINT proofreading_contracts_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.components(id);


--
-- TOC entry 3494 (class 2606 OID 65575)
-- Name: proofreading_contracts proofreading_contracts_translation_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.proofreading_contracts
    ADD CONSTRAINT proofreading_contracts_translation_contract_id_fkey FOREIGN KEY (translation_contract_id) REFERENCES public.translation_contracts(id);


--
-- TOC entry 3495 (class 2606 OID 65570)
-- Name: proofreading_contracts proofreading_contracts_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.proofreading_contracts
    ADD CONSTRAINT proofreading_contracts_work_id_fkey FOREIGN KEY (work_id) REFERENCES public.works(id);


--
-- TOC entry 3483 (class 2606 OID 57360)
-- Name: task_assignments task_assignments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- TOC entry 3484 (class 2606 OID 57365)
-- Name: task_assignments task_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3482 (class 2606 OID 65583)
-- Name: tasks tasks_related_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_related_work_id_fkey FOREIGN KEY (related_work_id) REFERENCES public.works(id);


--
-- TOC entry 3499 (class 2606 OID 81930)
-- Name: translation_contract_members translation_contract_members_translation_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.translation_contract_members
    ADD CONSTRAINT translation_contract_members_translation_contract_id_fkey FOREIGN KEY (translation_contract_id) REFERENCES public.translation_contracts(id) ON DELETE CASCADE;


--
-- TOC entry 3500 (class 2606 OID 81935)
-- Name: translation_contract_members translation_contract_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.translation_contract_members
    ADD CONSTRAINT translation_contract_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3491 (class 2606 OID 65632)
-- Name: translation_contracts translation_contracts_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.translation_contracts
    ADD CONSTRAINT translation_contracts_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.components(id);


--
-- TOC entry 3492 (class 2606 OID 65555)
-- Name: translation_contracts translation_contracts_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.translation_contracts
    ADD CONSTRAINT translation_contracts_work_id_fkey FOREIGN KEY (work_id) REFERENCES public.works(id);


--
-- TOC entry 3485 (class 2606 OID 57485)
-- Name: user_groups user_groups_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- TOC entry 3486 (class 2606 OID 57480)
-- Name: user_groups user_groups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3487 (class 2606 OID 73728)
-- Name: user_roles user_roles_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.components(id) ON DELETE SET NULL;


--
-- TOC entry 3488 (class 2606 OID 57522)
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 3489 (class 2606 OID 57517)
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3490 (class 2606 OID 65627)
-- Name: works works_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.works
    ADD CONSTRAINT works_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.components(id);


--
-- TOC entry 2180 (class 826 OID 16394)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- TOC entry 2179 (class 826 OID 16393)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


-- Completed on 2026-02-12 12:00:50

--
-- PostgreSQL database dump complete
--

\unrestrict yaL0CLFRWs9JUSLTJXKK8648vHiheRqcu4dPJEJeEAun5OAIlhRlaJOfw06Vv7n

