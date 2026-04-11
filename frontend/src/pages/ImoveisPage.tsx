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
import { useUsuarios } from "../hooks/useData";
import { imoveisService, type Imovel } from "../services/api";
import { geocodeAddressInput } from "../services/geocoding";

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
  const { data: usuarios } = useUsuarios();
  const [view, setView] = useState<View>("list");
  const [search, setSearch] = useState("");
  const [ordenarPor, setOrdenarPor] = useState<
    "" | "valorDiaria" | "cidade" | "dataCadastro" | "titulo"
  >("");
  const [ordem, setOrdem] = useState<"asc" | "desc">("asc");
  const [filtroValorDiaria, setFiltroValorDiaria] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [editPhotoFiles, setEditPhotoFiles] = useState<File[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const newPhotosInputRef = useRef<HTMLInputElement | null>(null);
  const editPhotosInputRef = useRef<HTMLInputElement | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data =
        typeof ownerId === "number"
          ? await imoveisService.getByOwner(ownerId)
          : await imoveisService.getAll({
              ordenarPor: ordenarPor || undefined,
              ordem,
              valorDiaria:
                filtroValorDiaria.trim() !== ""
                  ? Number(filtroValorDiaria)
                  : undefined,
            });
      setImoveis(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [ownerId, ordenarPor, ordem, filtroValorDiaria]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const filtered = useMemo(
    () =>
      imoveis.filter(
        (i) =>
          (!onlyActive || i.ativo) &&
          (i.titulo.toLowerCase().includes(search.toLowerCase()) ||
            i.cidade.toLowerCase().includes(search.toLowerCase())),
      ),
    [imoveis, onlyActive, search],
  );

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
                  <option value="">Selecione um anfitrião...</option>
                  {(usuarios ?? [])
                    .filter((u) => u.tipo === "ANFITRIAO")
                    .map((u) => (
                      <option key={u.idUsuario} value={u.idUsuario}>
                        {u.nome}
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
                        <div className="flex flex-col items-center gap-1 text-stone-600">
                          <span className="text-amber-500">
                            <IconUpload />
                          </span>
                          <span className="text-sm font-semibold">
                            Escolher arquivos
                          </span>
                        </div>
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
                        <div className="flex flex-col items-center gap-1 text-stone-600">
                          <span className="text-amber-500">
                            <IconUpload />
                          </span>
                          <span className="text-sm font-semibold">
                            Escolher arquivos
                          </span>
                        </div>
                      </button>
                    </>
                  )}
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Comodidades">
                  <div className="flex flex-wrap gap-2">
                    {COMMON_AMENITIES.map((amenity) => {
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
            placeholder="Buscar por título ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {typeof ownerId !== "number" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <select
              className={inputCls}
              value={ordenarPor}
              onChange={(e) =>
                setOrdenarPor(
                  e.target.value as
                    | ""
                    | "valorDiaria"
                    | "cidade"
                    | "dataCadastro"
                    | "titulo",
                )
              }
            >
              <option value="">Sem ordenacao</option>
              <option value="titulo">Titulo</option>
              <option value="cidade">Cidade</option>
              <option value="valorDiaria">Valor da diaria</option>
              <option value="dataCadastro">Data de cadastro</option>
            </select>

            <select
              className={inputCls}
              value={ordem}
              onChange={(e) => setOrdem(e.target.value as "asc" | "desc")}
              disabled={!ordenarPor}
            >
              <option value="asc">Ordem crescente</option>
              <option value="desc">Ordem decrescente</option>
            </select>

            <input
              className={inputCls}
              type="number"
              min="0"
              step="0.01"
              placeholder="Filtrar por diaria exata"
              value={filtroValorDiaria}
              onChange={(e) => setFiltroValorDiaria(e.target.value)}
            />
          </div>
        )}
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
