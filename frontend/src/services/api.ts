const BASE_URL = "http://localhost:8080";
const TOKEN_KEY = "hostly_token";

export interface Imovel {
  idImovel: number;
  idUsuario: number;
  titulo: string;
  descricao: string;
  cidade: string;
  valorDiaria: number;
  dataCadastro: string;
  fotos: string[];
  ativo: boolean;
}

export interface Anfitriao {
  idUsuario: number;
  nome: string;
  email: string;
  tipo: "ANFITRIAO";
  ativo: boolean;
}

export type UsuarioTipo = "ADMIN" | "ANFITRIAO" | "HOSPEDE";

export interface Usuario {
  idUsuario: number;
  nome: string;
  email: string;
  tipo: UsuarioTipo;
  ativo: boolean;
}

export interface Session {
  token: string;
  usuario: Usuario;
}

export interface Reserva {
  idReserva: number;
  idImovel: number;
  idHospede: number;
  dataInicio: string;
  dataFim: string;
  valorTotal: number;
}

export interface DashboardStats {
  totalImoveis: number;
  totalAnfitrioes: number;
  totalReservas: number;
  receitaTotal: number;
}

export type CreateUsuarioInput = {
  nome: string;
  email: string;
  senha?: string;
  tipo: UsuarioTipo;
  ativo: boolean;
};

export type UpdateUsuarioInput = Partial<CreateUsuarioInput>;

export type CreateReservaInput = Omit<Reserva, "idReserva" | "valorTotal">;
export type UpdateReservaInput = Partial<CreateReservaInput>;

const MOCK_IMOVEIS: Imovel[] = [
  {
    idImovel: 1,
    idUsuario: 1,
    titulo: "Apartamento Savassi",
    descricao: "Lindo apto no coração do Savassi",
    cidade: "Belo Horizonte",
    valorDiaria: 280,
    dataCadastro: "2025-01-10",
    fotos: [],
    ativo: true,
  },
  {
    idImovel: 2,
    idUsuario: 2,
    titulo: "Casa Praia Grande",
    descricao: "Casa ampla a 200m do mar",
    cidade: "Arraial do Cabo",
    valorDiaria: 520,
    dataCadastro: "2025-02-15",
    fotos: [],
    ativo: true,
  },
  {
    idImovel: 3,
    idUsuario: 1,
    titulo: "Studio Centro",
    descricao: "Studio moderno no centro histórico",
    cidade: "São Paulo",
    valorDiaria: 190,
    dataCadastro: "2025-03-01",
    fotos: [],
    ativo: false,
  },
  {
    idImovel: 4,
    idUsuario: 3,
    titulo: "Chalé Serra",
    descricao: "Chalé aconchegante na montanha",
    cidade: "Gramado",
    valorDiaria: 450,
    dataCadastro: "2025-03-20",
    fotos: [],
    ativo: true,
  },
];

const MOCK_ANFITRIOES: Anfitriao[] = [
  {
    idUsuario: 1,
    nome: "Rafael Xavier",
    email: "rafael@hostly.com",
    tipo: "ANFITRIAO",
    ativo: true,
  },
  {
    idUsuario: 2,
    nome: "Lucas Santos",
    email: "lucas@hostly.com",
    tipo: "ANFITRIAO",
    ativo: true,
  },
  {
    idUsuario: 3,
    nome: "Leonardo Ramalho",
    email: "leo@hostly.com",
    tipo: "ANFITRIAO",
    ativo: false,
  },
];

const MOCK_USUARIOS: Usuario[] = [...MOCK_ANFITRIOES];

const MOCK_RESERVAS: Reserva[] = [
  {
    idReserva: 1,
    idImovel: 1,
    idHospede: 3,
    dataInicio: "2026-03-01",
    dataFim: "2026-03-05",
    valorTotal: 1120,
  },
  {
    idReserva: 2,
    idImovel: 2,
    idHospede: 1,
    dataInicio: "2026-03-10",
    dataFim: "2026-03-15",
    valorTotal: 2600,
  },
  {
    idReserva: 3,
    idImovel: 4,
    idHospede: 2,
    dataInicio: "2026-04-01",
    dataFim: "2026-04-03",
    valorTotal: 900,
  },
];

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const USE_MOCK = false;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const isFormData = options?.body instanceof FormData;

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
    ...options,
  });
  if (!res.ok) throw new Error(`Erro ${res.status}: ${res.statusText}`);

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export function saveSession(session: Session) {
  localStorage.setItem(TOKEN_KEY, session.token);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
}

export function hasSessionToken() {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

export const imoveisService = {
  async getAll(): Promise<Imovel[]> {
    if (USE_MOCK) {
      await delay(400);
      return MOCK_IMOVEIS;
    }
    return request<Imovel[]>("/imoveis");
  },
  async getByOwner(idUsuario: number): Promise<Imovel[]> {
    return request<Imovel[]>(`/imoveis/usuario/${idUsuario}`);
  },
  async getById(id: number): Promise<Imovel> {
    if (USE_MOCK) {
      await delay(200);
      return MOCK_IMOVEIS.find((i) => i.idImovel === id)!;
    }
    return request<Imovel>(`/imoveis/${id}`);
  },
  async create(data: Omit<Imovel, "idImovel">): Promise<Imovel> {
    if (USE_MOCK) {
      await delay(300);
      return { ...data, idImovel: Date.now() };
    }
    return request<Imovel>("/imoveis", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async update(id: number, data: Partial<Imovel>): Promise<Imovel> {
    if (USE_MOCK) {
      await delay(300);
      return { ...MOCK_IMOVEIS.find((i) => i.idImovel === id)!, ...data };
    }
    return request<Imovel>(`/imoveis/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async delete(id: number): Promise<void> {
    if (USE_MOCK) {
      await delay(200);
      return;
    }
    return request<void>(`/imoveis/${id}`, { method: "DELETE" });
  },
};

export const anfitriaoService = {
  async getAll(): Promise<Anfitriao[]> {
    if (USE_MOCK) {
      await delay(400);
      return MOCK_ANFITRIOES;
    }
    return request<Anfitriao[]>("/usuarios/anfitrioes");
  },
  async create(data: Omit<Anfitriao, "idUsuario">): Promise<Anfitriao> {
    if (USE_MOCK) {
      await delay(300);
      return { ...data, idUsuario: Date.now() };
    }
    return request<Anfitriao>("/usuarios", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async update(id: number, data: Partial<Anfitriao>): Promise<Anfitriao> {
    if (USE_MOCK) {
      await delay(300);
      return { ...MOCK_ANFITRIOES.find((a) => a.idUsuario === id)!, ...data };
    }
    return request<Anfitriao>(`/usuarios/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async delete(id: number): Promise<void> {
    if (USE_MOCK) {
      await delay(200);
      return;
    }
    return request<void>(`/usuarios/${id}`, { method: "DELETE" });
  },
};

export const usuarioService = {
  async getAll(): Promise<Usuario[]> {
    if (USE_MOCK) {
      await delay(400);
      return MOCK_USUARIOS;
    }
    return request<Usuario[]>("/usuarios");
  },
  async create(data: CreateUsuarioInput): Promise<Usuario> {
    if (USE_MOCK) {
      await delay(300);
      return { ...data, idUsuario: Date.now() } as Usuario;
    }
    return request<Usuario>("/usuarios", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async update(id: number, data: UpdateUsuarioInput): Promise<Usuario> {
    if (USE_MOCK) {
      await delay(300);
      return { ...MOCK_USUARIOS.find((u) => u.idUsuario === id)!, ...data };
    }
    return request<Usuario>(`/usuarios/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async delete(id: number): Promise<void> {
    if (USE_MOCK) {
      await delay(200);
      return;
    }
    return request<void>(`/usuarios/${id}`, { method: "DELETE" });
  },
};

export const reservaService = {
  async getAll(): Promise<Reserva[]> {
    if (USE_MOCK) {
      await delay(400);
      return MOCK_RESERVAS;
    }
    return request<Reserva[]>("/reservas");
  },
  async getByImovel(idImovel: number): Promise<Reserva[]> {
    if (USE_MOCK) {
      await delay(300);
      return MOCK_RESERVAS.filter((r) => r.idImovel === idImovel);
    }
    return request<Reserva[]>(`/reservas?idImovel=${idImovel}`);
  },
  async getByHospede(idHospede: number): Promise<Reserva[]> {
    return request<Reserva[]>(`/reservas/hospede/${idHospede}`);
  },
  async getByAnfitriao(idAnfitriao: number): Promise<Reserva[]> {
    return request<Reserva[]>(`/reservas/anfitriao/${idAnfitriao}`);
  },
  async create(data: CreateReservaInput): Promise<Reserva> {
    if (USE_MOCK) {
      await delay(300);
      const imovel = MOCK_IMOVEIS.find((i) => i.idImovel === data.idImovel);
      const dias = Math.ceil(
        (new Date(data.dataFim).getTime() -
          new Date(data.dataInicio).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const valorTotal = (imovel?.valorDiaria || 0) * dias;
      return { ...data, idReserva: Date.now(), valorTotal };
    }
    return request<Reserva>("/reservas", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async update(id: number, data: UpdateReservaInput): Promise<Reserva> {
    if (USE_MOCK) {
      await delay(300);
      return {
        ...MOCK_RESERVAS.find((r) => r.idReserva === id)!,
        ...data,
      } as Reserva;
    }
    return request<Reserva>(`/reservas/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async delete(id: number): Promise<void> {
    if (USE_MOCK) {
      await delay(200);
      return;
    }
    return request<void>(`/reservas/${id}`, { method: "DELETE" });
  },
};

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    if (USE_MOCK) {
      await delay(500);
      return {
        totalImoveis: MOCK_IMOVEIS.filter((i) => i.ativo).length,
        totalAnfitrioes: MOCK_ANFITRIOES.filter((a) => a.ativo).length,
        totalReservas: MOCK_RESERVAS.length,
        receitaTotal: 4620,
      };
    }
    return request<DashboardStats>("/dashboard/stats");
  },
};

export const authService = {
  async login(email: string, senha: string): Promise<Session> {
    const session = await request<Session>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha }),
    });
    saveSession(session);
    return session;
  },
  async register(input: {
    nome: string;
    email: string;
    senha: string;
    comoAnfitriao: boolean;
    imovelInicial?: {
      titulo: string;
      descricao: string;
      cidade: string;
      valorDiaria: number;
      dataCadastro: string;
      fotos: string[];
      ativo: boolean;
    };
  }): Promise<Session> {
    const session = await request<Session>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    saveSession(session);
    return session;
  },
  async me(): Promise<Usuario> {
    return request<Usuario>("/auth/me");
  },
  logout() {
    clearSession();
  },
};
