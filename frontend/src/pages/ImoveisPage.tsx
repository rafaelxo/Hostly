import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  ErrorMsg,
  Field,
  FormCard,
  FormHeader,
  Spinner,
  inputCls,
} from "../components/common";
import {
  IconBuilding,
  IconEdit,
  IconEye,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUpload,
} from "../components/icons";
import { COMMON_AMENITIES } from "../constants/amenities";
import { useAnfitrioes, useComodidades } from "../hooks/useData";
import { imoveisService, type Imovel } from "../services/api";
import { geocodeAddressInput } from "../services/geocoding";

const PRICE_MIN = 0;
const PRICE_MAX = 5000;
const PRICE_GAP = 100;

type View = "list" | "new" | "edit";

type FormState = {
  idUsuario: string;
  titulo: string;
  descricao: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  valorDiaria: string;
  comodidades: string[];
  fotos: string;
  ativo: boolean;
};

const initialForm: FormState = {
  idUsuario: "",
  titulo: "",
  descricao: "",
  rua: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
  valorDiaria: "",
  comodidades: [],
  fotos: "",
  ativo: true,
};

type ImoveisPageProps = {
  ownerId?: number;
  onlyActive?: boolean;
  canManage?: boolean;
  title?: string;
  onViewDetail?: (id: number) => void;
};

export function ImoveisPage({
  ownerId,
  onlyActive = false,
  canManage = true,
  title = "Imóveis",
  onViewDetail,
}: ImoveisPageProps) {
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: anfitrioes } = useAnfitrioes();
  const [view, setView] = useState<View>("list");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [editPhotoFiles, setEditPhotoFiles] = useState<File[]>([]);
  const [newPhotoPreviewUrls, setNewPhotoPreviewUrls] = useState<string[]>([]);
  const [editPhotoPreviewUrls, setEditPhotoPreviewUrls] = useState<string[]>(
    [],
  );
  const [valorMinFiltro, setValorMinFiltro] = useState(String(PRICE_MIN));
  const [valorMaxFiltro, setValorMaxFiltro] = useState(
    String(PRICE_MAX),
  );
  const [form, setForm] = useState<FormState>(initialForm);
  const newPhotosInputRef = useRef<HTMLInputElement | null>(null);
  const editPhotosInputRef = useRef<HTMLInputElement | null>(null);
  const { data: comodidadesCatalog } = useComodidades();
  const amenityOptions =
    comodidadesCatalog?.filter((item) => item.ativo).map((item) => item.nome) ??
    COMMON_AMENITIES;

  useEffect(() => {
    const urls = newPhotoFiles.map((file) => URL.createObjectURL(file));
    setNewPhotoPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newPhotoFiles]);

  useEffect(() => {
    const urls = editPhotoFiles.map((file) => URL.createObjectURL(file));
    setEditPhotoPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [editPhotoFiles]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data =
        typeof ownerId === "number"
          ? await imoveisService.getAll({ idUsuario: ownerId })
          : await imoveisService.getAll();
      setImoveis(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const minPrice = Number(valorMinFiltro || PRICE_MIN);
    const maxPrice = Number(valorMaxFiltro || PRICE_MAX);

    return imoveis.filter((item) => {
      if (onlyActive && !item.ativo) {
        return false;
      }
      if (item.valorDiaria < minPrice || item.valorDiaria > maxPrice) {
        return false;
      }
      if (!query) {
        return true;
      }

      const hostName =
        (anfitrioes ?? []).find((user) => user.idUsuario === item.idUsuario)
          ?.nome ?? "";

      return (
        item.titulo.toLowerCase().includes(query) ||
        item.cidade.toLowerCase().includes(query) ||
        hostName.toLowerCase().includes(query) ||
        String(item.idUsuario).includes(query)
      );
    });
  }, [imoveis, onlyActive, search, valorMinFiltro, valorMaxFiltro, anfitrioes]);

  const minFiltroValue = Number(valorMinFiltro || PRICE_MIN);
  const maxFiltroValue = Number(valorMaxFiltro || PRICE_MAX);
  const minPercent =
    ((minFiltroValue - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;
  const maxPercent =
    ((maxFiltroValue - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const startNew = () => {
    setEditingId(null);
    setFormError(null);
    setNewPhotoFiles([]);
    setForm({
      ...initialForm,
      idUsuario: ownerId ? String(ownerId) : "",
    });
    setView("new");
  };

  const startEdit = (item: Imovel) => {
    setEditingId(item.idImovel);
    setFormError(null);
    setEditPhotoFiles([]);
    setForm({
      idUsuario: String(item.idUsuario),
      titulo: item.titulo,
      descricao: item.descricao,
      rua: item.endereco?.rua ?? "",
      numero: item.endereco?.numero ?? "",
      bairro: item.endereco?.bairro ?? "",
      cidade: item.cidade,
      estado: item.endereco?.estado ?? "",
      cep: item.endereco?.cep ?? "",
      valorDiaria: String(item.valorDiaria),
      comodidades: (item.comodidades ?? []).map((c) => c.nome),
      fotos: item.fotos.join(", "),
      ativo: item.ativo,
    });
    setView("edit");
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Deseja excluir este imóvel?")) return;
    await imoveisService.delete(id);
    await refetch();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const fotos = form.fotos
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    if (view === "new" && newPhotoFiles.length === 0) {
      setFormError("Informe ao menos uma foto válida do imóvel.");
      return;
    }

    if (view !== "new" && fotos.length === 0) {
      // In edit mode, existing photos can be kept without re-upload.
    }

    if (Number(form.valorDiaria) <= 0) {
      setFormError("O valor da diária deve ser maior que zero.");
      return;
    }

    setSaving(true);
    try {
      const coords = await geocodeAddressInput(
        {
          rua: form.rua,
          numero: form.numero,
          bairro: form.bairro,
          cidade: form.cidade,
          estado: form.estado,
          cep: form.cep,
        },
        form.cidade,
      );

      const payload = {
        idUsuario: Number(form.idUsuario),
        titulo: form.titulo,
        descricao: form.descricao,
        endereco: {
          rua: form.rua,
          numero: form.numero,
          bairro: form.bairro,
          cidade: form.cidade,
          estado: form.estado,
          cep: form.cep,
        },
        comodidades: form.comodidades
          .map((nome) => nome.trim())
          .filter(Boolean)
          .map((nome) => ({ nome })),
        cidade: form.cidade,
        latitude: coords?.[0] ?? 0,
        longitude: coords?.[1] ?? 0,
        valorDiaria: Number(form.valorDiaria),
        dataCadastro: new Date().toISOString().slice(0, 10),
        fotos,
        ativo: form.ativo,
      };

      if (view === "new") {
        await imoveisService.createWithFiles(payload, newPhotoFiles);
      } else if (editingId) {
        await imoveisService.updateWithFiles(
          editingId,
          payload,
          editPhotoFiles,
        );
      }
      await refetch();
      setView("list");
      setForm(initialForm);
      setValorMinFiltro(String(PRICE_MIN));
      setValorMaxFiltro(String(PRICE_MAX));
      setNewPhotoFiles([]);
      setEditPhotoFiles([]);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  if (view !== "list") {
    return (
      <div>
        <FormHeader
          title={view === "new" ? "Novo Imóvel" : "Editar Imóvel"}
          subtitle="Preencha os dados do imóvel"
          onBack={() => setView("list")}
        />
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormCard title="Informações Básicas">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Anfitrião" required>
                <select
                  className={inputCls}
                  value={form.idUsuario}
                  onChange={(e) => set("idUsuario", e.target.value)}
                  required
                  disabled={Boolean(ownerId)}
                >
                  <option value="">Selecione um usuário...</option>
                  {(anfitrioes ?? []).map((u) => (
                    <option key={u.idUsuario} value={u.idUsuario}>
                      #{u.idUsuario} - {u.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cidade" required>
                <input
                  className={inputCls}
                  value={form.cidade}
                  onChange={(e) => set("cidade", e.target.value)}
                  required
                />
              </Field>
              <Field label="Estado (UF)" required>
                <input
                  className={inputCls}
                  value={form.estado}
                  onChange={(e) => set("estado", e.target.value.toUpperCase())}
                  minLength={2}
                  maxLength={2}
                  required
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Título" required>
                  <input
                    className={inputCls}
                    value={form.titulo}
                    onChange={(e) => set("titulo", e.target.value)}
                    required
                  />
                </Field>
              </div>
              <Field label="Rua" required>
                <input
                  className={inputCls}
                  value={form.rua}
                  onChange={(e) => set("rua", e.target.value)}
                  required
                />
              </Field>
              <Field label="Número" required>
                <input
                  className={inputCls}
                  value={form.numero}
                  onChange={(e) => set("numero", e.target.value)}
                  required
                />
              </Field>
              <Field label="Bairro" required>
                <input
                  className={inputCls}
                  value={form.bairro}
                  onChange={(e) => set("bairro", e.target.value)}
                  required
                />
              </Field>
              <Field label="CEP" required>
                <input
                  className={inputCls}
                  value={form.cep}
                  onChange={(e) => set("cep", e.target.value)}
                  required
                />
              </Field>
              <Field label="Valor da diária" required>
                <input
                  className={inputCls}
                  type="number"
                  min="0"
                  value={form.valorDiaria}
                  onChange={(e) => set("valorDiaria", e.target.value)}
                  required
                />
              </Field>
              <Field label="Ativo">
                <select
                  className={inputCls}
                  value={form.ativo ? "true" : "false"}
                  onChange={(e) => set("ativo", e.target.value === "true")}
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Descrição">
                  <textarea
                    className={`${inputCls} resize-none`}
                    rows={3}
                    value={form.descricao}
                    onChange={(e) => set("descricao", e.target.value)}
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Fotos do imóvel">
                  {view === "new" ? (
                    <>
                      <input
                        ref={newPhotosInputRef}
                        className="hidden"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        multiple
                        aria-label="Anexar fotos do imóvel"
                        onChange={(e) =>
                          setNewPhotoFiles(Array.from(e.target.files ?? []))
                        }
                      />
                      <button
                        type="button"
                        className="w-full min-h-28 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 hover:border-amber-400 hover:bg-amber-50/30 transition-colors flex items-center justify-center"
                        onClick={() => newPhotosInputRef.current?.click()}
                      >
                        {newPhotoFiles.length === 0 ? (
                          <div className="flex flex-col items-center gap-1 text-stone-600">
                            <span className="text-amber-500">
                              <IconUpload />
                            </span>
                            <span className="text-sm font-semibold">
                              Selecione um arquivo
                            </span>
                          </div>
                        ) : (
                          <div className="w-full space-y-3 p-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {newPhotoPreviewUrls.map((src, index) => (
                                <img
                                  key={`${src}-${index}`}
                                  src={src}
                                  alt={`Preview ${index + 1}`}
                                  className="h-20 w-full rounded-lg object-cover border border-stone-200"
                                />
                              ))}
                            </div>
                            <p className="text-xs text-stone-500 text-center">
                              {newPhotoFiles.length} arquivo(s) selecionado(s).
                              Clique para trocar.
                            </p>
                          </div>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        ref={editPhotosInputRef}
                        className="hidden"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        multiple
                        aria-label="Anexar novas fotos do imóvel"
                        onChange={(e) =>
                          setEditPhotoFiles(Array.from(e.target.files ?? []))
                        }
                      />
                      <button
                        type="button"
                        className="w-full min-h-28 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 hover:border-amber-400 hover:bg-amber-50/30 transition-colors flex items-center justify-center"
                        onClick={() => editPhotosInputRef.current?.click()}
                      >
                        {editPhotoFiles.length === 0 ? (
                          <div className="flex flex-col items-center gap-1 text-stone-600">
                            <span className="text-amber-500">
                              <IconUpload />
                            </span>
                            <span className="text-sm font-semibold">
                              Selecione um arquivo
                            </span>
                          </div>
                        ) : (
                          <div className="w-full space-y-3 p-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {editPhotoPreviewUrls.map((src, index) => (
                                <img
                                  key={`${src}-${index}`}
                                  src={src}
                                  alt={`Preview ${index + 1}`}
                                  className="h-20 w-full rounded-lg object-cover border border-stone-200"
                                />
                              ))}
                            </div>
                            <p className="text-xs text-stone-500 text-center">
                              {editPhotoFiles.length} arquivo(s) selecionado(s).
                              Clique para trocar.
                            </p>
                          </div>
                        )}
                      </button>
                    </>
                  )}
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Comodidades">
                  <div className="flex flex-wrap gap-2">
                    {amenityOptions.map((amenity) => {
                      const selected = form.comodidades.includes(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() =>
                            set(
                              "comodidades",
                              selected
                                ? form.comodidades.filter((c) => c !== amenity)
                                : [...form.comodidades, amenity],
                            )
                          }
                          className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                            selected
                              ? "bg-amber-100 border-amber-300 text-amber-700"
                              : "bg-white border-stone-200 text-stone-600 hover:border-amber-300"
                          }`}
                        >
                          {amenity}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>
            </div>
          </FormCard>
          {formError && <ErrorMsg msg={formError} />}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setView("list")}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Cancelar
            </button>
            {canManage && (
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60 transition-colors shadow-sm"
              >
                <IconPlus />{" "}
                {saving
                  ? "Salvando..."
                  : view === "new"
                    ? "Cadastrar Imóvel"
                    : "Salvar alterações"}
              </button>
            )}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card-elevated p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-stone-800">{title}</h3>
            <p className="text-xs text-stone-400">
              {filtered.length} resultado(s) na listagem
            </p>
          </div>
          {canManage && (
            <button
              onClick={startNew}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm whitespace-nowrap"
            >
              <IconPlus /> Novo Imóvel
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 bg-[var(--hostly-surface-soft)] border border-[var(--hostly-border)] rounded-xl px-4 py-2.5">
          <span className="text-stone-400">
            <IconSearch />
          </span>
          <input
            className="flex-1 bg-transparent text-sm text-stone-600 placeholder-stone-400 outline-none"
            placeholder="Buscar por título, cidade ou anfitrião..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="mt-3 rounded-2xl border border-[var(--hostly-border)] bg-[var(--hostly-surface-soft)] p-4 space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-stone-500">
            <span>Faixa da diária</span>
            <span>
              R$ {Number(valorMinFiltro).toLocaleString("pt-BR")} - R${" "}
              {Number(valorMaxFiltro).toLocaleString("pt-BR")}
            </span>
          </div>
          <div className="relative h-10">
            <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-stone-200" />
            <div
              className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-amber-400"
              style={{
                left: `${minPercent}%`,
                right: `${100 - maxPercent}%`,
              }}
            />
            <input
              type="range"
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={50}
              value={valorMinFiltro}
              onChange={(e) => {
                const next = Math.min(
                  Number(e.target.value),
                  Number(valorMaxFiltro) - PRICE_GAP,
                );
                setValorMinFiltro(String(Math.max(PRICE_MIN, next)));
              }}
              className="hostly-range-slider absolute inset-0 z-20 w-full"
            />
            <input
              type="range"
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={50}
              value={valorMaxFiltro}
              onChange={(e) => {
                const next = Math.max(
                  Number(e.target.value),
                  Number(valorMinFiltro) + PRICE_GAP,
                );
                setValorMaxFiltro(String(Math.min(PRICE_MAX, next)));
              }}
              className="hostly-range-slider absolute inset-0 z-30 w-full"
            />
          </div>
        </div>
      </div>

      {loading && <Spinner />}
      {error && <ErrorMsg msg={error} />}
      {filtered.length > 0 && (
        <div className="card-elevated overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-6 py-3">
                  Imóvel
                </th>
                <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-4 py-3">
                  Cidade
                </th>
                <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-4 py-3">
                  Diária
                </th>
                <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filtered.map((item) => (
                <tr
                  key={item.idImovel}
                  className="hover:bg-stone-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 flex-shrink-0">
                        <IconBuilding />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-800">
                          {item.titulo}
                        </p>
                        <p className="text-xs text-stone-400">
                          #{item.idImovel}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-stone-600">
                    {item.cidade}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-stone-700">
                    R$ {item.valorDiaria.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-4">
                    <Badge active={item.ativo} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      {onViewDetail && (
                        <button
                          onClick={() => onViewDetail(item.idImovel)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                          title="Ver detalhes"
                        >
                          <IconEye />
                        </button>
                      )}
                      {canManage && (
                        <>
                          <button
                            onClick={() => startEdit(item)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                          >
                            <IconEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(item.idImovel)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <IconTrash />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-300 mb-4">
            <IconBuilding />
          </div>
          <p className="text-stone-500 font-medium">Nenhum imóvel encontrado</p>
          <p className="text-stone-400 text-sm mt-1">
            Cadastre um novo imóvel para começar.
          </p>
          {canManage && (
            <button
              onClick={startNew}
              className="mt-5 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              <IconPlus /> Novo Imóvel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
