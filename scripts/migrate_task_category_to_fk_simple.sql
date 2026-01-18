-- ============================================================================
-- MIGRATE TASKS.CATEGORY FROM TEXT TO FOREIGN KEY - SIMPLIFIED VERSION
-- Run each section separately in Supabase SQL Editor
-- ============================================================================

-- SECTION 1: Add new column
-- Copy and run this first
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS category_id bigint REFERENCES public.task_categories(id) ON DELETE SET NULL;


-- SECTION 2: Migrate existing data
-- Copy and run this second (after Section 1 completes)
DO $$
DECLARE
    task_record RECORD;
    category_name_val TEXT;
    category_id_val BIGINT;
    user_id_val UUID;
BEGIN
    FOR task_record IN
        SELECT DISTINCT t.user_id, t.category
        FROM public.tasks t
        WHERE t.category IS NOT NULL AND t.category != ''
    LOOP
        category_name_val := task_record.category;
        user_id_val := task_record.user_id;

        SELECT id INTO category_id_val
        FROM public.task_categories
        WHERE user_id = user_id_val AND name = category_name_val
        LIMIT 1;

        IF category_id_val IS NULL THEN
            INSERT INTO public.task_categories (user_id, name)
            VALUES (user_id_val, category_name_val)
            RETURNING id INTO category_id_val;

            RAISE NOTICE 'Created task_category: % (id: %) for user: %', category_name_val, category_id_val, user_id_val;
        END IF;

        UPDATE public.tasks
        SET category_id = category_id_val
        WHERE user_id = user_id_val
          AND category = category_name_val
          AND category_id IS NULL;

        RAISE NOTICE 'Updated tasks with category "%" to category_id %', category_name_val, category_id_val;
    END LOOP;
END $$;


-- SECTION 3: Verify migration
-- Copy and run this third to check results
SELECT
    COUNT(*) FILTER (WHERE category IS NOT NULL AND category != '') as tasks_with_text_category,
    COUNT(*) FILTER (WHERE category_id IS NOT NULL) as tasks_with_fk_category,
    COUNT(*) FILTER (WHERE category IS NOT NULL AND category != '' AND category_id IS NULL) as unmigrated_tasks
FROM public.tasks;


-- SECTION 4: Add index
-- Copy and run this fourth (after verifying migration is successful)
CREATE INDEX IF NOT EXISTS idx_tasks_category_id
ON public.tasks(category_id)
WHERE category_id IS NOT NULL;


-- SECTION 5 (OPTIONAL): Drop old category column
-- ONLY run this after confirming everything works!
-- Uncomment and run when ready:
-- ALTER TABLE public.tasks DROP COLUMN category;
