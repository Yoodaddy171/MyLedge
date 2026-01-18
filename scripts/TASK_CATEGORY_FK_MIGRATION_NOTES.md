# Task Category FK Migration Notes

## Current Status
The `tasks` table currently uses a TEXT column `category` instead of a foreign key to `task_categories` table.

## Issue
- Schema has `task_categories` table but it's not used
- `tasks.category` stores raw text like "Kegiatan Pribadi", "Pekerjaan", etc.
- No referential integrity, prone to typos and inconsistency

## Solution Overview
1. Add `tasks.category_id` column (FK to task_categories)
2. Migrate existing TEXT data to task_categories
3. Update all tasks to reference category_id
4. (Optional) Drop old `category` TEXT column

## Steps to Implement

### 1. Database Migration
Run `scripts/migrate_task_category_to_fk.sql` in Supabase SQL Editor

This will:
- Add `category_id` column
- Auto-create task_categories from existing TEXT values
- Update all tasks to use category_id
- Add index on category_id

### 2. Frontend Updates Required

#### File: `app/tasks/page.tsx`

**Current code uses TEXT:**
```typescript
const [formData, setFormData] = useState({
  title: '',
  category: 'Kegiatan Pribadi',  // ← TEXT value
  priority: 'Sedang',
  status: 'todo',
  deadline: '',
  notes: ''
});
```

**Should be changed to:**
```typescript
const [formData, setFormData] = useState({
  title: '',
  category_id: null,  // ← FK to task_categories
  priority: 'medium', // ← Use enum value
  status: 'todo',
  deadline: '',
  notes: ''
});
```

**Form inputs need update:**
```typescript
// OLD (line ~488):
<select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
  <option>Kegiatan Pribadi</option>
  <option>Pekerjaan</option>
  // ...
</select>

// NEW:
<select value={formData.category_id || ''} onChange={(e) => setFormData({...formData, category_id: e.target.value ? Number(e.target.value) : null})}>
  <option value="">No Category</option>
  {taskCategories.map(cat => (
    <option key={cat.id} value={cat.id}>{cat.name}</option>
  ))}
</select>
```

**Display logic needs update:**
```typescript
// OLD:
<p className="text-xs text-slate-500">{task.category}</p>

// NEW (with join):
<p className="text-xs text-slate-500">{task.task_categories?.name || 'No Category'}</p>
```

**Query needs join:**
```typescript
// OLD:
const { data } = await supabase.from('tasks').select('*');

// NEW:
const { data } = await supabase
  .from('tasks')
  .select('*, task_categories(id, name, icon, color)');
```

**Priority values also need fixing** (separate issue):
```typescript
// Current mixed Indonesian/English:
'Sedang' → should be 'medium'
'Urgent' → already correct
'Tinggi' → should be 'high'
'Rendah' → should be 'low'
```

### 3. Testing Checklist
- [ ] Run database migration
- [ ] Verify all existing tasks have category_id populated
- [ ] Update tasks page to use category_id
- [ ] Test creating new task with category
- [ ] Test editing task category
- [ ] Test filtering by category
- [ ] Test task display shows category name correctly
- [ ] Test with tasks that have no category

### 4. Rollback Plan
If migration fails:
```sql
ALTER TABLE public.tasks DROP COLUMN category_id;
```

Then restore from backup if TEXT column was dropped.

## Priority
**MEDIUM** - Works as-is with TEXT, but should be fixed for data integrity

## Estimated Effort
- Database migration: 5 min
- Frontend updates: 30-45 min
- Testing: 15-20 min
- **Total: ~1 hour**

## Dependencies
None - can be done independently

## Notes
- Keep both `category` (TEXT) and `category_id` (FK) columns during transition
- Only drop TEXT column after confirming migration successful
- Category management UI already exists, just needs to be wired up
