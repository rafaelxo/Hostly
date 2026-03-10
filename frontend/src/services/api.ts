const BASE_URL = "http://localhost:8080";
const TOKEN_KEY = "hostly_token";

export interface Imovel {
  idImovel: number;
  idUsuario: number;
  titulo: string;
  descricao: string;
  endereco: {
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    complemento?: string;
  };
  comodidades: {
    nome: string;
    descricao?: string;
  }[];
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
  status: "PENDENTE" | "CONFIRMADA" | "CANCELADA";
  formaPagamento:
    | ""
    | "PIX"
    | "CARTAO_CREDITO"
    | "CARTAO_DEBITO"
    | "BOLETO"
    | "DINHEIRO";
  statusPagamento: "NAO_INICIADO" | "PENDENTE" | "APROVADO" | "FALHOU";
  confirmadaEm?: string;
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

export type CreateReservaInput = {
  idImovel: number;
  idHospede: number;
  dataInicio: string;
  dataFim: string;
  formaPagamento?: Reserva["formaPagamento"];
};
export type UpdateReservaInput = Partial<CreateReservaInput> & {
  status?: Reserva["status"];
};

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
  if (!res.ok) {
    const errorText = await res.text();
    let message = res.statusText;

    if (errorText) {
      try {
        const parsed = JSON.parse(errorText) as { error?: string };
        if (parsed.error) {
          message = parsed.error;
        }
      } catch {
        message = errorText;
      }
    }

    throw new Error(`Erro ${res.status}: ${message}`);
  }

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
    return request<Imovel[]>("/imoveis");
  },
  async getByOwner(idUsuario: number): Promise<Imovel[]> {
    return request<Imovel[]>(`/imoveis/usuario/${idUsuario}`);
  },
  async getById(id: number): Promise<Imovel> {
    return request<Imovel>(`/imoveis/${id}`);
  },
  async create(data: Omit<Imovel, "idImovel">): Promise<Imovel> {
    return request<Imovel>("/imoveis", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async update(id: number, data: Partial<Imovel>): Promise<Imovel> {
    return request<Imovel>(`/imoveis/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async delete(id: number): Promise<void> {
    return request<void>(`/imoveis/${id}`, { method: "DELETE" });
  },
};

export const anfitriaoService = {
  async getAll(): Promise<Anfitriao[]> {
    return request<Anfitriao[]>("/usuarios/anfitrioes");
  },
  async create(data: Omit<Anfitriao, "idUsuario">): Promise<Anfitriao> {
    return request<Anfitriao>("/usuarios", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async update(id: number, data: Partial<Anfitriao>): Promise<Anfitriao> {
    return request<Anfitriao>(`/usuarios/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async delete(id: number): Promise<void> {
    return request<void>(`/usuarios/${id}`, { method: "DELETE" });
  },
};

export const usuarioService = {
  async getAll(): Promise<Usuario[]> {
    return request<Usuario[]>("/usuarios");
  },
  async create(data: CreateUsuarioInput): Promise<Usuario> {
    return request<Usuario>("/usuarios", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async update(id: number, data: UpdateUsuarioInput): Promise<Usuario> {
    return request<Usuario>(`/usuarios/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async delete(id: number): Promise<void> {
    return request<void>(`/usuarios/${id}`, { method: "DELETE" });
  },
};

export const reservaService = {
  async getAll(): Promise<Reserva[]> {
    return request<Reserva[]>("/reservas");
  },
  async getByImovel(idImovel: number): Promise<Reserva[]> {
    return request<Reserva[]>(`/reservas?idImovel=${idImovel}`);
  },
  async getByHospede(idHospede: number): Promise<Reserva[]> {
    return request<Reserva[]>(`/reservas/hospede/${idHospede}`);
  },
  async getByAnfitriao(idAnfitriao: number): Promise<Reserva[]> {
    return request<Reserva[]>(`/reservas/anfitriao/${idAnfitriao}`);
  },
  async create(data: CreateReservaInput): Promise<Reserva> {
    return request<Reserva>("/reservas", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async update(id: number, data: UpdateReservaInput): Promise<Reserva> {
    return request<Reserva>(`/reservas/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async confirm(id: number, formaPagamento: Reserva["formaPagamento"]) {
    return request<Reserva>(`/reservas/${id}/confirmar`, {
      method: "PUT",
      body: JSON.stringify({ formaPagamento }),
    });
  },
  async delete(id: number): Promise<void> {
    return request<void>(`/reservas/${id}`, { method: "DELETE" });
  },
};

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
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
      endereco: {
        rua: string;
        numero: string;
        bairro: string;
        cidade: string;
        estado: string;
        cep: string;
        complemento?: string;
      };
      comodidades: {
        nome: string;
        descricao?: string;
      }[];
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
