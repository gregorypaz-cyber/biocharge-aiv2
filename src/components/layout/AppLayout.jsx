import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Brain, Clock, Activity, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const navItems = [
  { path: '/today', icon: Activity, label: 'Hoje' },
  { path: '/insights', icon: Brain, label: 'Insights' },
  { path: '/checkin', icon: PlusCircle, label: 'Check-in', primary: true },
  { path: '/summary', icon: LayoutDashboard, label: 'Resumo' },
  { path: '/history', icon: Clock, label: 'Timeline' },
];

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/today" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
              <span className="text-primary font-black text-xs">B</span>
            </div>
            <span className="font-black text-foreground tracking-tight text-sm">
              BioCharge<span className="text-primary">AI</span>
            </span>
          </Link>
          <Link
            to="/settings"
            className={cn(
              'p-2 rounded-lg transition-colors',
              location.pathname === '/settings' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 pb-32 overflow-y-auto">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/90 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto flex items-center justify-around h-16 px-2">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all relative',
                  item.primary
                    ? 'bg-primary/15 border border-primary/25 px-4'
                    : isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {isActive && !item.primary && (
                  <motion.div
                    layoutId="mobileActiveTab"
                    className="absolute inset-0 bg-primary/8 rounded-xl"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <item.icon className={cn('w-5 h-5 relative', item.primary ? 'text-primary' : '')} />
                <span className={cn('text-[10px] font-semibold relative', item.primary ? 'text-primary' : '')}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}