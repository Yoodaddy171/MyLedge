import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
             // Cookies are handled by the main middleware/callback, 
             // we usually don't need to set them here for a background task, 
             // but we keep the interface.
          },
        },
      }
    );

    // 1. Check if user already has wallets
    const { count: walletCount } = await supabase
      .from('wallets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // 2. Check if user already has categories
    const { count: categoryCount } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    let setupStatus = 'skipped';

    // 3. Initialize if empty
    if ((walletCount === 0 || walletCount === null) && (categoryCount === 0 || categoryCount === null)) {
      console.log(`[Setup] Initializing data for new user: ${userId}`);

      // Create Default Wallet
      const { error: walletError } = await supabase.from('wallets').insert({
        user_id: userId,
        name: 'Cash Wallet',
        type: 'cash',
        initial_balance: 0,
        current_balance: 0,
        currency: 'IDR'
      });

      if (walletError) {
        console.error('[Setup] Wallet creation failed:', walletError);
      }

      // Create Default Categories
      const defaultCategories = [
        { user_id: userId, name: 'Food & Beverage', type: 'expense' },
        { user_id: userId, name: 'Transportation', type: 'expense' },
        { user_id: userId, name: 'Utilities', type: 'expense' },
        { user_id: userId, name: 'Shopping', type: 'expense' },
        { user_id: userId, name: 'Salary', type: 'income' },
        { user_id: userId, name: 'Investment Return', type: 'income' },
        { user_id: userId, name: 'Other Income', type: 'income' },
      ];

      const { error: catError } = await supabase.from('categories').insert(defaultCategories);

      if (catError) {
         console.error('[Setup] Category creation failed:', catError);
      }

      setupStatus = 'initialized';
    }

    return NextResponse.json({ success: true, status: setupStatus });

  } catch (error: any) {
    console.error('[Setup] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
