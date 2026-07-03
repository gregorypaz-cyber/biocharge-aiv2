/**
 * Centralized hook for fetching entities filtered by the current user.
 * All reads are scoped to the logged-in user via created_by field.
 */
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { QUERY_KEYS } from '@/lib/query-keys';

export function useUserCheckins(limit = 60) {
  const { user } = useAuth();
  return useQuery({
    queryKey: QUERY_KEYS.checkins(user?.email, limit),
    queryFn: () => base44.entities.DailyCheckin.filter({ created_by: user.email }, '-date', limit),
    enabled: !!user?.email,
  });
}

export function useUserTrainingSessions(limit = 200) {
  const { user } = useAuth();
  return useQuery({
    queryKey: QUERY_KEYS.trainingSessions(user?.email, limit),
    queryFn: () => base44.entities.TrainingSession.filter({ created_by: user.email }, '-date', limit),
    enabled: !!user?.email,
  });
}