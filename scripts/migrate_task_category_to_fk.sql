-- ============================================================================
-- MIGRATE TASKS.CATEGORY FROM TEXT TO FOREIGN KEY
-- Purpose: Convert tasks.category from TEXT to FK reference to task_categories
-- ============================================================================

-- STEP 1: Add new column category_id (nullable for migration)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS category_id bigint REFERENCES public.task_categories(id) ON DELETE SET NULL;

-- STEP 2: Migrate existing data
-- For each unique category TEXT value, create task_category if not exists
-- and update tasks to reference it

DO $$
DECLARE
    task_record RECORD;
    category_name_val TEXT;
    category_id_val BIGINT;
    user_id_val UUID;
BEGIN
    -- Loop through all tasks with non-null category
    FOR task_record IN
        SELECT DISTINCT t.user_id, t.category
        FROM public.tasks t
        WHERE t.category IS NOT NULL AND t.category != ''
    LOOP
        category_name_val := task_record.category;
        user_id_val := task_record.user_id;

        -- Check if task_category already exists for this user
        SELECT id INTO category_id_val
        FROM public.task_categories
        WHERE user_id = user_id_val AND name = category_name_val
        LIMIT 1;

        -- If not exists, create it
        IF category_id_val IS NULL THEN
            INSERT INTO public.task_categories (user_id, name)
            VALUES (user_id_val, category_name_val)
            RETURNING id INTO category_id_val;

            RAISE NOTICE 'Created task_category: % (id: %) for user: %', category_name_val, category_id_val, user_id_val;
        END IF;

        -- Update all tasks with this category text to use category_id
        UPDATE public.tasks
        SET category_id = category_id_val
        WHERE user_id = user_id_val
          AND category = category_name_val
          AND category_id IS NULL;

        RAISE NOTICE 'Updated tasks with category "%" to category_id %', category_name_val, category_id_val;
    END LOOP;
END $$;

-- STEP 3: Verify migration
-- Check if any tasks still have TEXT category without category_id
SELECT COUNT(*) as unmigrated_tasks
FROM public.tasks
WHERE category IS NOT NULL AND category != '' AND category_id IS NULL;

-- If above query returns 0, migration is complete

-- STEP 4: (OPTIONAL) Drop old category column
-- ONLY run this after verifying migration is successful!
-- Uncomment below to execute:

-- ALTER TABLE public.tasks DROP COLUMN IF EXISTS category;

-- STEP 5: Add index on new FK column
CREATE INDEX IF NOT EXISTS idx_tasks_category_id
ON public.tasks(category_id)
WHERE category_id IS NOT NULL;

-- ============================================================================
-- ROLLBACK PLAN (if something goes wrong)
-- ============================================================================
-- To rollback:
-- 1. If you haven't dropped category column yet, just run:
--    ALTER TABLE public.tasks DROP COLUMN category_id;
--
-- 2. If you already dropped it, you'll need to restore from backup
-- ============================================================================
