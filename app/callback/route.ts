import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  console.log(`[Auth Callback] Hit at /callback with code: ${code ? 'YES' : 'NO'}`);

  if (code) {
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
            try {
              console.log(`[Auth Callback] Setting ${cookiesToSet.length} cookies`);
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, {
                  ...options,
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: 'lax',
                })
              );
            } catch (error) {
              console.error("[Auth Callback] Cookie Error:", error);
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log(`[Auth Callback] User confirmed: ${user.id}. Running setup...`);
        // Run setup logic directly here instead of fetching internal API
        try {
          // Check if this is a truly new user by checking if they have ANY historical data
          // This prevents recreating data for users who intentionally deleted their data
          const { count: walletCount } = await supabase
            .from('wallets')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          const { count: categoryCount } = await supabase
            .from('categories')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          // Also check if user has any transactions - if they do, they're not a new user
          const { count: transactionCount } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          // Also check if user has any master items
          const { count: masterItemCount } = await supabase
            .from('transaction_items')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          // Only seed default data for truly NEW users who have NO data at all
          const isNewUser =
            (walletCount === 0 || walletCount === null) &&
            (categoryCount === 0 || categoryCount === null) &&
            (transactionCount === 0 || transactionCount === null) &&
            (masterItemCount === 0 || masterItemCount === null);

          if (isNewUser) {
            console.log(`[Auth Callback] New user detected, initializing default data...`);
            await supabase.from('wallets').insert({
              user_id: user.id,
              name: 'Cash Wallet',
              type: 'cash',
              initial_balance: 0,
              current_balance: 0,
              currency: 'IDR'
            });

            const defaultCategories = [
              { user_id: user.id, name: 'Food & Beverage', type: 'expense' },
              { user_id: user.id, name: 'Transportation', type: 'expense' },
              { user_id: user.id, name: 'Utilities', type: 'expense' },
              { user_id: user.id, name: 'Shopping', type: 'expense' },
              { user_id: user.id, name: 'Salary', type: 'income' },
              { user_id: user.id, name: 'Investment Return', type: 'income' },
              { user_id: user.id, name: 'Other Income', type: 'income' },
            ];
            await supabase.from('categories').insert(defaultCategories);
          } else {
            console.log(`[Auth Callback] Existing user, skipping default data initialization`);
          }
        } catch (setupErr) {
          console.error("[Auth Callback] Setup logic error:", setupErr);
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    } else {
      console.error("OAuth Exchange Error:", error.message);
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_code_missing`);
}
