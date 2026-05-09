import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
    } catch (err) {
      // Always show success
    } finally {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Recuperar Senha</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sent ? 'Verifique seu email' : 'Informe seu email para redefinir a senha'}
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Se o email estiver cadastrado, você receberá um link para redefinir sua senha.
            </p>
            <Link to="/login">
              <Button variant="outline" className="w-full h-11 border-border">
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao login
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className="bg-card border-border h-11" required />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 bg-primary text-primary-foreground font-semibold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar link'}
            </Button>
            <Link to="/login" className="block text-center text-sm text-primary hover:underline">Voltar ao login</Link>
          </form>
        )}
      </motion.div>
    </div>
  );
}