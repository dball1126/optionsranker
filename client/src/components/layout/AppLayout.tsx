import { useEffect, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNavigation } from '../mobile/MobileNavigation';
import { useAuthStore } from '@/stores/authStore';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
      {/* Mobile Navigation */}
      <MobileNavigation />
      
      {/* Desktop Layout */}
      <div className="hidden lg:flex h-screen bg-slate-950 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
      
      {/* Mobile Layout */}
      <div className="lg:hidden min-h-screen bg-gray-50 pt-14 pb-16">
        <main className="p-4">
          {children}
        </main>
      </div>
    </>
  );
}
