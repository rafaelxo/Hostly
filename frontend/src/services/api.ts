const BASE_URL = "http://localhost:8080";

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

export interface Reserva {
  idReserva: number;
  idImovel: number;
  nomeHospede: string;
  dataInicio: string;
  dataFim: string;
  valorTotal: number;
}

export interface DashboardStats {
  totalImoveis: number;
  totalAnfitrioes: number;
  reservasAtivas: number;
  receitaTotal: number;
}

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

const MOCK_RESERVAS: Reserva[] = [
  {
    idReserva: 1,
    idImovel: 1,
    nomeHospede: "Ana Lima",
    dataInicio: "2026-03-01",
    dataFim: "2026-03-05",
    valorTotal: 1120,
  },
  {
    idReserva: 2,
    idImovel: 2,
    nomeHospede: "Carlos Mota",
    dataInicio: "2026-03-10",
    dataFim: "2026-03-15",
    valorTotal: 2600,
  },
  {
    idReserva: 3,
    idImovel: 4,
    nomeHospede: "Fernanda Costa",
    dataInicio: "2026-04-01",
    dataFim: "2026-04-03",
    valorTotal: 900,
  },
];

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const USE_MOCK = false;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`Erro ${res.status}: ${res.statusText}`);
  return res.json();
}

export const imoveisService = {
  async getAll(): Promise<Imovel[]> {
    if (USE_MOCK) {
      await delay(400);
      return MOCK_IMOVEIS;
    }
    return request<Imovel[]>("/imoveis");
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
  async create(data: Omit<Reserva, "idReserva">): Promise<Reserva> {
    if (USE_MOCK) {
      await delay(300);
      return { ...data, idReserva: Date.now() };
    }
    return request<Reserva>("/reservas", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    if (USE_MOCK) {
      await delay(500);
      return {
        totalImoveis: MOCK_IMOVEIS.filter((i) => i.ativo).length,
        totalAnfitrioes: MOCK_ANFITRIOES.filter((a) => a.ativo).length,
        reservasAtivas: MOCK_RESERVAS.length,
        receitaTotal: MOCK_RESERVAS.reduce((acc, r) => acc + r.valorTotal, 0),
      };
    }
    return request<DashboardStats>("/dashboard/stats");
  },
};
