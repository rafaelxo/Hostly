import { useCallback, useEffect, useRef, useState } from "react";
import {
  anfitriaoService,
  comodidadeService,
  dashboardService,
  imoveisService,
  reservaService,
  usuarioService,
  type Anfitriao,
  type ComodidadeCatalogo,
  type DashboardStats,
  type Imovel,
  type Reserva,
  type Usuario,
} from "../services/api";

function useAsync<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fnRef.current();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
}

export function useImoveis() {
  return useAsync<Imovel[]>(() => imoveisService.getAll());
}

export function useAnfitrioes() {
  return useAsync<Anfitriao[]>(() => anfitriaoService.getAll());
}

export function useUsuarios() {
  return useAsync<Usuario[]>(() => usuarioService.getAll());
}

export function useReservas() {
  return useAsync<Reserva[]>(() => reservaService.getAll());
}

export function useDashboard() {
  return useAsync<DashboardStats>(() => dashboardService.getStats());
}

export function useComodidades() {
  return useAsync<ComodidadeCatalogo[]>(() => comodidadeService.getAll());
}
