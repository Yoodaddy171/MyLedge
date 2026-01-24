'use client';

import React from 'react';
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const router = useRouter();

  // Type guard to ensure error has expected properties
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
        <div className="w-16 h-16 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="text-red-600" size={32} />
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-3">
          Something Went Wrong
        </h1>

        <p className="text-sm font-semibold text-slate-600 mb-2">
          Error Details:
        </p>

        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 text-left">
          <pre className="text-xs text-red-800 font-mono whitespace-pre-wrap break-words">
            {errorMessage}
          </pre>
        </div>

        {process.env.NODE_ENV === 'development' && errorStack && (
          <details className="text-left mb-6">
            <summary className="text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-700 mb-2">
              Stack Trace (Dev Only)
            </summary>
            <pre className="text-[10px] text-slate-500 font-mono bg-slate-50 p-4 rounded-xl overflow-x-auto border border-slate-200">
              {errorStack}
            </pre>
          </details>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={resetErrorBoundary}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-800 transition-all shadow-lg text-sm"
          >
            <RefreshCw size={16} />
            Try Again
          </button>

          <button
            onClick={() => router.push('/')}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-900 font-semibold py-3 rounded-xl hover:bg-slate-200 transition-all border border-slate-200 text-sm"
          >
            <Home size={16} />
            Go Home
          </button>
        </div>

        <p className="text-xs font-medium text-slate-500 mt-6">
          If this persists, please contact support
        </p>
      </div>
    </div>
  );
}

function logError(error: unknown, errorInfo: React.ErrorInfo) {
  // Log to console in development
  console.error('Error Boundary Caught:', error, errorInfo);

  // In production, you would send this to your error tracking service
  // Example: Sentry.captureException(error, { extra: errorInfo });
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={logError}
      onReset={() => {
        // Reset app state if needed
        window.location.href = '/';
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}

// Smaller version for specific sections
interface SectionErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function SectionErrorBoundary({
  children,
  fallback
}: SectionErrorBoundaryProps) {
  const defaultFallback = (
    <div className="bg-red-50 border border-red-100 rounded-xl p-5 text-center">
      <AlertCircle className="text-red-600 mx-auto mb-3" size={24} />
      <p className="text-sm font-semibold text-red-700">
        Failed to load this section
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 text-xs font-semibold text-red-600 hover:text-red-800"
      >
        Refresh Page
      </button>
    </div>
  );

  return (
    <ReactErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        fallback || defaultFallback
      )}
      onError={(error) => console.error('Section Error:', error)}
    >
      {children}
    </ReactErrorBoundary>
  );
}
