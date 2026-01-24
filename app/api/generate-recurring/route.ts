import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { recurringId, userId } = await request.json();

    // Create Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetUserId = userId || user.id;

    // Build query
    let query = supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('is_active', true)
      .eq('auto_generate', true);

    // If specific recurring transaction ID provided
    if (recurringId) {
      query = query.eq('id', recurringId);
    } else {
      // Find all due recurring transactions
      const today = new Date().toISOString().split('T')[0];
      query = query.lte('next_occurrence', today);
    }

    const { data: dueRecurring, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    if (!dueRecurring || dueRecurring.length === 0) {
      return NextResponse.json({
        success: true,
        created: 0,
        message: 'No due recurring transactions found'
      });
    }

    const created = [];

    for (const recurring of dueRecurring) {
      // Check if end date has passed
      if (recurring.end_date) {
        const endDate = new Date(recurring.end_date);
        const nextOccurrence = new Date(recurring.next_occurrence);
        if (nextOccurrence > endDate) {
          // Mark as inactive if past end date
          await supabase
            .from('recurring_transactions')
            .update({ is_active: false })
            .eq('id', recurring.id);
          continue;
        }
      }

      // Create transaction from template
      const { data: newTransaction, error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: recurring.user_id,
          type: recurring.type,
          amount: recurring.amount,
          date: recurring.next_occurrence,
          description: recurring.description,
          notes: recurring.notes ? `${recurring.notes}\n\n[Auto-generated from recurring template]` : '[Auto-generated from recurring template]',
          wallet_id: recurring.wallet_id,
          to_wallet_id: recurring.to_wallet_id,
          item_id: recurring.item_id,
          project_id: recurring.project_id,
          is_recurring: true,
          recurring_transaction_id: recurring.id
        })
        .select()
        .single();

      if (insertError) {
        console.error(`Error creating transaction for recurring ${recurring.id}:`, insertError);
        continue;
      }

      // Calculate next occurrence
      const currentDate = new Date(recurring.next_occurrence);
      let nextDate = new Date(currentDate);

      switch (recurring.frequency) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'quarterly':
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }

      // Update recurring transaction
      const { error: updateError } = await supabase
        .from('recurring_transactions')
        .update({
          last_generated_date: recurring.next_occurrence,
          next_occurrence: nextDate.toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', recurring.id);

      if (updateError) {
        console.error(`Error updating recurring ${recurring.id}:`, updateError);
      }

      created.push(newTransaction);
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      transactions: created
    });
  } catch (error: any) {
    console.error('Error in generate-recurring:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
