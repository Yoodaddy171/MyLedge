'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import type { AppUser } from '@/lib/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();

    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          router.push('/login');
        } else if (event === 'SIGNED_IN') {
          setIsAuthenticated(true);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  async function checkAuth() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        setIsAuthenticated(false);
        router.push('/login');
      } else {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      fallback || (
        <LoadingScreen />
      )
    );
  }

  // If not authenticated, don't render children (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // Authenticated - render children
  return <>{children}</>;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest animate-pulse">
          Authenticating...
        </p>
      </div>
    </div>
  );
}

// Hook for getting current user in components
export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, loading, isAuthenticated: !!user };
}
