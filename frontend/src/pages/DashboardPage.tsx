import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { ErrorMsg, Spinner } from "../components/common";
import {
  imoveisService,
  reservaService,
  type Imovel,
  type Reserva,
} from "../services/api";

const _proto = L.Icon.Default.prototype as unknown as Record<string, unknown>;
delete _proto._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function createPinIcon(available: boolean, selected: boolean) {
  const bg = selected ? "#f59e0b" : available ? "#10b981" : "#9ca3af";
  const size = selected ? 36 : 28;
  return new L.DivIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;background:${bg};border:2.5px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

async function geocodeQuery(q: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
      { headers: { "User-Agent": "Hostly-App/1.0" } },
    );
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (data[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {
    //
  }
  return null;
}

function MapFlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  const prev = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (target && target !== prev.current) {
      prev.current = target;
      map.flyTo(target, 13, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
}

const toLocalDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const toIsoDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const ptBrCurrency = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function PropertyDetailPanel({
  imovel,
  onClose,
  onViewDetail,
}: {
  imovel: Imovel;
  onClose: () => void;
  onViewDetail?: (id: number) => void;
}) {
  const addr = imovel.endereco;
  const fullAddr = addr
    ? `${addr.rua}, ${addr.numero} — ${addr.bairro}, ${addr.cidade}/${addr.estado}`
    : imovel.cidade;

  return (
    <div className="border-t border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base font-semibold text-stone-800">
          {imovel.titulo}
        </h4>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors text-lg leading-none"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* */}
        <div>
          {imovel.fotos?.[0] ? (
            <img
              src={imovel.fotos[0]}
              alt={imovel.titulo}
              className="w-full h-48 object-cover rounded-xl border border-stone-200"
            />
          ) : (
            <div className="w-full h-48 rounded-xl border border-dashed border-stone-300 bg-stone-50 flex items-center justify-center text-stone-400 text-sm">
              Sem foto
            </div>
          )}
        </div>

        {/* */}
        <div className="md:col-span-2 space-y-3">
          <p className="text-sm text-stone-500 leading-relaxed">
            {imovel.descricao}
          </p>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">
                Diária
              </p>
              <p className="font-semibold text-stone-800">
                {ptBrCurrency(imovel.valorDiaria)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">
                Cidade
              </p>
              <p className="text-stone-700">{imovel.cidade}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">
                Endereço
              </p>
              <p className="text-stone-700">{fullAddr}</p>
            </div>
          </div>

          {(imovel.comodidades ?? []).length > 0 && (
            <div>
              <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider mb-1.5">
                Comodidades
              </p>
              <div className="flex flex-wrap gap-1.5">
                {imovel.comodidades.map((c) => (
                  <span
                    key={c.nome}
                    className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700 font-medium"
                  >
                    {c.nome}
                  </span>
                ))}
              </div>
            </div>
          )}

          {onViewDetail && (
            <button
              onClick={() => onViewDetail(imovel.idImovel)}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-white text-sm font-semibold transition-colors"
            >
              Ver página completa →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function RegionMap({
  imoveis,
  reservas,
  onViewDetail,
}: {
  imoveis: Imovel[];
  reservas: Reserva[];
  onViewDetail?: (id: number) => void;
}) {
  const [dataInicio, setDataInicio] = useState(() => toIsoDate(new Date()));
  const [dataFim, setDataFim] = useState(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return toIsoDate(t);
  });
  const [addressInput, setAddressInput] = useState("");
  const [mapTarget, setMapTarget] = useState<[number, number] | null>(null);
  const [coords, setCoords] = useState<Record<number, [number, number]>>({});
  const geocodedIds = useRef(new Set<number>());
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(
    null,
  );

  const handleStartChange = (v: string) => {
    setDataInicio(v);
    const s = toLocalDate(v);
    const e = toLocalDate(dataFim);
    if (s && e && e <= s) {
      const next = new Date(s);
      next.setDate(next.getDate() + 1);
      setDataFim(toIsoDate(next));
    }
  };

  const handleEndChange = (v: string) => {
    const s = toLocalDate(dataInicio);
    const e = toLocalDate(v);
    if (s && e && e <= s) return;
    setDataFim(v);
  };

  const inicioSelecionado = toLocalDate(dataInicio);
  const fimSelecionado = toLocalDate(dataFim);

  const reservasPorImovel = useMemo(() => {
    const map = new Map<number, Reserva[]>();
    reservas.forEach((r) => {
      const curr = map.get(r.idImovel) ?? [];
      curr.push(r);
      map.set(r.idImovel, curr);
    });
    return map;
  }, [reservas]);

  const isDisponivel = useCallback(
    (idImovel: number) => {
      if (!inicioSelecionado || !fimSelecionado) return true;
      const rs = reservasPorImovel.get(idImovel) ?? [];
      return !rs.some((r) => {
        const s = toLocalDate(r.dataInicio);
        const e = toLocalDate(r.dataFim);
        return s && e && inicioSelecionado < e && fimSelecionado > s;
      });
    },
    [inicioSelecionado, fimSelecionado, reservasPorImovel],
  );

  const disponiveisCount = useMemo(
    () => imoveis.filter((i) => isDisponivel(i.idImovel)).length,
    [imoveis, isDisponivel],
  );

  const mediaDiaria = useMemo(() => {
    const avail = imoveis.filter((i) => isDisponivel(i.idImovel));
    return avail.length > 0
      ? avail.reduce((a, i) => a + i.valorDiaria, 0) / avail.length
      : 0;
  }, [imoveis, isDisponivel]);

  useEffect(() => {
    const ungeocoded = imoveis.filter(
      (i) => !geocodedIds.current.has(i.idImovel),
    );
    if (ungeocoded.length === 0) return;

    let cancelled = false;
    const run = async () => {
      for (const item of ungeocoded) {
        if (cancelled) break;
        geocodedIds.current.add(item.idImovel);
        const addr = item.endereco;
        const queries = addr
          ? [
              `${addr.rua} ${addr.numero}, ${addr.bairro}, ${addr.cidade}, ${addr.estado}, Brasil`,
              `${addr.cidade}, ${addr.estado}, Brasil`,
            ]
          : [`${item.cidade}, Brasil`];

        for (const q of queries) {
          const result = await geocodeQuery(q);
          if (result) {
            setCoords((prev) => ({ ...prev, [item.idImovel]: result }));
            break;
          }
        }
        await new Promise((r) => setTimeout(r, 350));
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [imoveis]);

  const handleSearch = async () => {
    const q = addressInput.trim();
    if (!q) return;
    const result = await geocodeQuery(q);
    if (result) setMapTarget(result);
  };

  const selectedProperty =
    imoveis.find((i) => i.idImovel === selectedPropertyId) ?? null;

  return (
    <section className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      {/* */}
      <div className="px-5 py-4 border-b border-stone-100 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-700">
            Mapa de imóveis
          </h3>
          <p className="text-xs text-stone-400">
            Pesquise um endereço para navegar; clique num pin para ver detalhes
            do imóvel. Verde = disponível, cinza = ocupado.
          </p>
        </div>

        {/* */}
        <div className="flex gap-2">
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSearch();
            }}
            placeholder="Buscar endereço ou cidade…"
            className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <button
            onClick={() => void handleSearch()}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            Buscar
          </button>
        </div>

        {/* */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => handleStartChange(e.target.value)}
            className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700"
          />
          <input
            type="date"
            value={dataFim}
            min={dataInicio}
            onChange={(e) => handleEndChange(e.target.value)}
            className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700"
          />
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-amber-700 font-semibold uppercase tracking-wider">
                Média diária (disponíveis)
              </p>
              <p className="text-sm font-semibold text-amber-700">
                {ptBrCurrency(mediaDiaria)}
              </p>
            </div>
            <span className="text-xs text-amber-600 font-medium bg-amber-100 px-2 py-0.5 rounded-full">
              {disponiveisCount} disponível
              {disponiveisCount !== 1 ? "is" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* */}
      <div style={{ height: 500 }}>
        <MapContainer
          center={[-15.793889, -47.882778]}
          zoom={4}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapFlyTo target={mapTarget} />

          {imoveis.map((item) => {
            const pos = coords[item.idImovel];
            if (!pos) return null;
            const available = isDisponivel(item.idImovel);
            const selected = selectedPropertyId === item.idImovel;
            return (
              <Marker
                key={item.idImovel}
                position={pos}
                icon={createPinIcon(available, selected)}
                eventHandlers={{
                  click: () =>
                    setSelectedPropertyId(selected ? null : item.idImovel),
                }}
              />
            );
          })}
        </MapContainer>
      </div>

      {/* */}
      {selectedProperty && (
        <PropertyDetailPanel
          imovel={selectedProperty}
          onClose={() => setSelectedPropertyId(null)}
          onViewDetail={onViewDetail}
        />
      )}
    </section>
  );
}

export function DashboardPage({
  onViewDetail,
}: { onViewDetail?: (id: number) => void } = {}) {
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [imoveisData, reservasData] = await Promise.all([
          imoveisService.getAll(),
          reservaService.getAll(),
        ]);
        setImoveis(imoveisData.filter((item) => item.ativo));
        setReservas(reservasData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar dashboard");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
        <h1 className="text-xl font-semibold text-stone-800">
          Visão por região e disponibilidade
        </h1>
        <p className="text-sm text-stone-400 mt-1">
          Pesquise um endereço para navegar no mapa. Os imóveis aparecem como
          pins — clique para ver detalhes e disponibilidade.
        </p>
      </div>
      <RegionMap
        imoveis={imoveis}
        reservas={reservas}
        onViewDetail={onViewDetail}
      />
    </div>
  );
}
