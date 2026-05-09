import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Edit2, Trash2, Copy, ChevronRight, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { computeCheckinScores, getZoneColor } from '@/lib/biocharge-utils';
import StatusBadge from '@/components/ui-bio/StatusBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function History() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterZone, setFilterZone] = useState('all');

  const { data: checkins = [], isLoading } = useQuery({
    queryKey: ['checkins'],
    queryFn: () => base44.entities.DailyCheckin.list('-date', 100),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DailyCheckin.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checkins'] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (checkin) => {
      const { id, created_date, updated_date, created_by, ...data } = checkin;
      return base44.entities.DailyCheckin.create({
        ...data,
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: `Duplicado de ${checkin.date}`,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checkins'] }),
  });

  const computed = checkins.map(computeCheckinScores);
  const filtered = computed.filter(c => {
    const matchSearch = !search || c.date?.includes(search) || c.notes?.toLowerCase().includes(search.toLowerCase());
    const matchZone = filterZone === 'all' || c.zone === filterZone;
    return matchSearch && matchZone;
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Histórico</h1>
        <p className="text-sm text-muted-foreground mt-1">{checkins.length} registros</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por data ou notas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
        <div className="flex gap-1">
          {['all', 'green', 'yellow', 'red'].map(zone => (
            <button
              key={zone}
              onClick={() => setFilterZone(zone)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                filterZone === zone
                  ? 'bg-primary/20 text-primary'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {zone === 'all' ? 'Todos' : zone === 'green' ? '🟢' : zone === 'yellow' ? '🟡' : '🔴'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Nenhum registro encontrado</p>
        </div>
      ) : (
        <AnimatePresence>
          {filtered.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-border/80 transition-all group"
            >
              {/* Score circle */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-mono font-bold text-lg shrink-0"
                style={{ backgroundColor: `${getZoneColor(c.zone)}20`, color: getZoneColor(c.zone) }}
              >
                {c.recovery_score}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">
                    {c.date ? format(new Date(c.date), "dd 'de' MMM", { locale: ptBR }) : '—'}
                  </span>
                  {c.rest_day ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                      🛌 Descanso
                    </span>
                  ) : (
                    <StatusBadge zone={c.zone} className="text-[10px] py-0.5 px-2" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {c.rest_day
                    ? `Sono: ${c.sleep_score} · Dia de descanso`
                    : `Sono: ${c.sleep_score} · Fadiga: ${c.fatigue} · ${c.recommendation}`}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/checkin', { state: { editData: c } })}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateMutation.mutate(c)}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
                      <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(c.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}