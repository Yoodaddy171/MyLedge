-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.assets (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  type text NOT NULL,
  symbol text NOT NULL,
  quantity numeric DEFAULT 0,
  avg_buy_price numeric DEFAULT 0,
  current_price numeric DEFAULT 0,
  last_updated timestamp with time zone DEFAULT timezone('utc'::text, now()),
  user_id uuid DEFAULT auth.uid(),
  CONSTRAINT assets_pkey PRIMARY KEY (id),
  CONSTRAINT assets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.budgets (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  category_id bigint,
  month integer NOT NULL,
  year integer NOT NULL,
  amount_limit numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  user_id uuid DEFAULT auth.uid(),
  CONSTRAINT budgets_pkey PRIMARY KEY (id),
  CONSTRAINT budgets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.categories (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  type USER-DEFINED NOT NULL,
  code_prefix text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  user_id uuid DEFAULT auth.uid(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.debts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  total_amount numeric NOT NULL,
  remaining_amount numeric NOT NULL,
  due_date date,
  is_paid boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  user_id uuid DEFAULT auth.uid(),
  CONSTRAINT debts_pkey PRIMARY KEY (id),
  CONSTRAINT debts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.job_kpis (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  task_name text NOT NULL,
  frequency text,
  kpi_target text,
  deliverables text,
  pic text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  user_id uuid DEFAULT auth.uid(),
  CONSTRAINT job_kpis_pkey PRIMARY KEY (id),
  CONSTRAINT job_kpis_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.net_worth_history (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid DEFAULT auth.uid(),
  total_assets numeric NOT NULL,
  total_debts numeric NOT NULL,
  net_worth numeric NOT NULL,
  recorded_at date DEFAULT CURRENT_DATE UNIQUE,
  CONSTRAINT net_worth_history_pkey PRIMARY KEY (id),
  CONSTRAINT net_worth_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.project_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  project_id bigint,
  item_name text NOT NULL,
  quantity numeric DEFAULT 1,
  unit_price numeric DEFAULT 0,
  actual_cost numeric DEFAULT 0,
  category text,
  notes text,
  user_id uuid DEFAULT auth.uid(),
  CONSTRAINT project_items_pkey PRIMARY KEY (id),
  CONSTRAINT project_items_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT project_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.projects (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  description text,
  total_budget numeric DEFAULT 0,
  status text DEFAULT 'active'::text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  user_id uuid DEFAULT auth.uid(),
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.submissions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid DEFAULT auth.uid(),
  entity text,
  doc_number text,
  submission_date date DEFAULT CURRENT_DATE,
  completion_date date,
  type text,
  status text DEFAULT 'Pending'::text,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT submissions_pkey PRIMARY KEY (id),
  CONSTRAINT submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.task_categories (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT task_categories_pkey PRIMARY KEY (id),
  CONSTRAINT task_categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.tasks (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  title text NOT NULL,
  category text,
  priority USER-DEFINED DEFAULT 'medium'::task_priority,
  status USER-DEFINED DEFAULT 'todo'::task_status,
  deadline timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  user_id uuid DEFAULT auth.uid(),
  is_monthly_recurring boolean DEFAULT false,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.transaction_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  category_id bigint,
  name text NOT NULL,
  code text,
  default_nominal numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  user_id uuid DEFAULT auth.uid(),
  CONSTRAINT transaction_items_pkey PRIMARY KEY (id),
  CONSTRAINT transaction_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT transaction_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.transactions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  date date NOT NULL,
  item_id bigint,
  wallet_id bigint,
  amount numeric NOT NULL,
  description text,
  type USER-DEFINED NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  user_id uuid DEFAULT auth.uid(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.transaction_items(id),
  CONSTRAINT transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id),
  CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.wallets (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  balance numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  user_id uuid DEFAULT auth.uid(),
  CONSTRAINT wallets_pkey PRIMARY KEY (id),
  CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);