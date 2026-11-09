import { useQuery } from '@tanstack/react-query';
import { getMapStyle } from '@/lib/mapboxStyle';
import { api } from '@/services/api';
import { useEffect, useState } from 'react';

export interface MapConfig {
  mapboxToken: string;
}

export function useMapConfig() {
  return useQuery({
    queryKey: ['map-config'],
    queryFn: async (): Promise<MapConfig> => {
      const fromEnv = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
      if (fromEnv) return { mapboxToken: fromEnv };
      const res = await api<{ success: boolean; data: { mapboxToken: string } }>('/config');
      return { mapboxToken: res.data.mapboxToken };
    },
    staleTime: Infinity,
  });
}

/** Reactive theme hook — watches html[data-theme] attribute. */
export function useMapTheme(): 'dark' | 'light' {
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

export { getMapStyle };
