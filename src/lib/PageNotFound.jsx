import { useLocation } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Zap className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-6xl font-light text-muted-foreground/30">404</h1>
        <h2 className="text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="text-sm text-muted-foreground">
          A página <span className="font-medium text-foreground">"{pageName}"</span> não existe.
        </p>
        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
        >
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  );
}