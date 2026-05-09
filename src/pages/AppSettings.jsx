import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { User, LogOut, Moon, Bell, Shield, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppSettings() {
  const { user } = useAuth();

  const handleLogout = () => {
    base44.auth.logout('/login');
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie sua conta e preferências</p>
      </div>

      {/* Profile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{user?.full_name || 'Usuário'}</h3>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </motion.div>

      {/* Menu Items */}
      <div className="space-y-2">
        {[
          { icon: Moon, label: 'Aparência', desc: 'Dark mode ativo' },
          { icon: Bell, label: 'Notificações', desc: 'Lembretes de check-in' },
          { icon: Shield, label: 'Privacidade', desc: 'Seus dados são seguros' },
          { icon: Heart, label: 'Sobre', desc: 'BioCharge AI v1.0' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors cursor-pointer"
          >
            <div className="p-2 rounded-xl bg-secondary">
              <item.icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium">{item.label}</span>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <Button onClick={handleLogout} variant="outline" className="w-full border-destructive/30 text-destructive hover:bg-destructive/10">
        <LogOut className="w-4 h-4 mr-2" /> Sair da conta
      </Button>
    </div>
  );
}