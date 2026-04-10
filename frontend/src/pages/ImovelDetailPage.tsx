import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { ErrorMsg, Spinner } from "../components/common";
import { IconArrowLeft, IconCalendar, IconEdit } from "../components/icons";
import { geocodePropertyAddress } from "../services/geocoding";
import { imoveisService, type Imovel } from "../services/api";

const _proto = L.Icon.Default.prototype as unknown as Record<string, unknown>;
delete _proto._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const ptBrCurrency = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Props = {
  imovelId: number;
  onBack: () => void;
  onEdit?: (imovel: Imovel) => void;
  canManage?: boolean;
  onNewReserva?: (imovelId: number) => void;
};

export function ImovelDetailPage({
  imovelId,
  onBack,
  onEdit,
  canManage = false,
  onNewReserva,
}: Props) {
  const [imovel, setImovel] = useState<Imovel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const geocoded = useRef(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    imoveisService
      .getById(imovelId)
      .then((data) => {
        setImovel(data);
        setPhotoIndex(0);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Erro ao carregar imóvel"),
      )
      .finally(() => setLoading(false));
  }, [imovelId]);

  useEffect(() => {
    if (!imovel || geocoded.current) return;
    geocoded.current = true;
    const run = async () => {
      const result = await geocodePropertyAddress(imovel);
      if (result) {
        setCoords(result);
      }
    };
    void run();
  }, [imovel]);

  if (loading) return <Spinner />;
  if (error || !imovel)
    return <ErrorMsg msg={error ?? "Imóvel não encontrado"} />;

  const photos = imovel.fotos ?? [];
  const addr = imovel.endereco;
  const fullAddr = addr
    ? [
        addr.rua && addr.numero ? `${addr.rua}, ${addr.numero}` : addr.rua,
        addr.bairro,
        addr.cidade && addr.estado
          ? `${addr.cidade} — ${addr.estado}`
          : addr.cidade,
        addr.cep ? `CEP ${addr.cep}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : imovel.cidade;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-stone-200 transition-all"
        >
          <IconArrowLeft />
          Voltar
        </button>
        <div className="flex-1" />
        {canManage && onEdit && (
          <button
            onClick={() => onEdit(imovel)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
          >
            <IconEdit /> Editar imóvel
          </button>
        )}
        {onNewReserva && (
          <button
            onClick={() => onNewReserva(imovel.idImovel)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-sm"
          >
            <IconCalendar /> Reservar
          </button>
        )}
      </div>

      {/* */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        {photos.length > 0 ? (
          <div className="relative">
            <img
              src={photos[photoIndex]}
              alt={`${imovel.titulo} — foto ${photoIndex + 1}`}
              className="w-full h-72 md:h-96 object-cover"
            />
            {/* */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setPhotoIndex(
                      (i) => (i - 1 + photos.length) % photos.length,
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors text-lg"
                  aria-label="Foto anterior"
                >
                  ‹
                </button>
                <button
                  onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors text-lg"
                  aria-label="Próxima foto"
                >
                  ›
                </button>
                {/* */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {photos.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPhotoIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === photoIndex ? "bg-white" : "bg-white/50"
                      }`}
                      aria-label={`Foto ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
            {/* */}
            <span className="absolute top-3 right-3 bg-black/40 text-white text-xs font-medium px-2.5 py-1 rounded-full">
              {photoIndex + 1} / {photos.length}
            </span>
          </div>
        ) : (
          <div className="w-full h-56 bg-stone-100 flex items-center justify-center text-stone-400">
            Sem fotos cadastradas
          </div>
        )}

        {/* */}
        {photos.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto">
            {photos.map((url, idx) => (
              <button
                key={idx}
                onClick={() => setPhotoIndex(idx)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  idx === photoIndex
                    ? "border-amber-400"
                    : "border-transparent hover:border-stone-300"
                }`}
              >
                <img
                  src={url}
                  alt={`thumb ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">
              {imovel.titulo}
            </h1>
            <p className="text-sm text-stone-400 mt-1">{imovel.cidade}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-amber-600">
              {ptBrCurrency(imovel.valorDiaria)}
            </p>
            <p className="text-xs text-stone-400">por noite</p>
            <span
              className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                imovel.ativo
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-stone-100 text-stone-500"
              }`}
            >
              {imovel.ativo ? "Ativo" : "Inativo"}
            </span>
          </div>
        </div>

        {imovel.descricao && (
          <p className="mt-4 text-sm text-stone-600 leading-relaxed border-t border-stone-100 pt-4">
            {imovel.descricao}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-3">
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Endereço
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed">{fullAddr}</p>

          {coords && (
            <div
              className="rounded-xl overflow-hidden border border-stone-200 mt-2"
              style={{ height: 200 }}
            >
              <MapContainer
                center={coords}
                zoom={15}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={false}
                dragging={false}
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={coords} />
              </MapContainer>
            </div>
          )}
        </div>

        {/* */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-3">
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Comodidades
          </h2>
          {(imovel.comodidades ?? []).length === 0 ? (
            <p className="text-sm text-stone-400">
              Nenhuma comodidade cadastrada.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {imovel.comodidades.map((c) => (
                <div
                  key={c.nome}
                  className="group relative px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-medium text-amber-700 cursor-default"
                  title={c.descricao}
                >
                  {c.nome}
                  {c.descricao && (
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] bg-stone-800 text-white text-xs rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-normal text-center shadow-lg">
                      {c.descricao}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">
          Informações gerais
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[11px] text-stone-400 font-medium uppercase tracking-wider">
              ID
            </p>
            <p className="text-sm font-semibold text-stone-700 mt-0.5">
              #{imovel.idImovel}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-stone-400 font-medium uppercase tracking-wider">
              Diária
            </p>
            <p className="text-sm font-semibold text-stone-700 mt-0.5">
              {ptBrCurrency(imovel.valorDiaria)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-stone-400 font-medium uppercase tracking-wider">
              Cadastrado em
            </p>
            <p className="text-sm font-semibold text-stone-700 mt-0.5">
              {imovel.dataCadastro
                ? new Date(
                    imovel.dataCadastro + "T00:00:00",
                  ).toLocaleDateString("pt-BR")
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-stone-400 font-medium uppercase tracking-wider">
              Status
            </p>
            <p className="text-sm font-semibold text-stone-700 mt-0.5">
              {imovel.ativo ? "Publicado" : "Inativo"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
