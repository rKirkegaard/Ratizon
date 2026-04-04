import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';

export function useLogin() {
  const { setTokens, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Login fejlede');
      return res.json();
    },
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      queryClient.invalidateQueries();
    },
  });
}

export function useRegister() {
  const { setTokens, setUser } = useAuthStore();

  return useMutation({
    mutationFn: async (data: { email: string; password: string; firstName: string; lastName: string }) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Registrering fejlede');
      return res.json();
    },
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
    },
  });
}

export function useLogout() {
  const { accessToken, logout } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      }).catch(() => {});
    },
    onSettled: () => {
      logout();
      queryClient.clear();
    },
  });
}

export function useCurrentUser() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['current-user'],
    queryFn: () => apiClient.get('/auth/me'),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
