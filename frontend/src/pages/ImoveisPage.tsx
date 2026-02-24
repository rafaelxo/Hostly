import { useMemo, useState } from "react";
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
  IconPlus,
  IconSearch,
  IconTrash,
} from "../components/icons";
import { useImoveis, useUsuarios } from "../hooks/useData";
import { imoveisService, type Imovel } from "../services/api";

type View = "list" | "new" | "edit";

type FormState = {
  idUsuario: string;
  titulo: string;
  descricao: string;
  cidade: string;
  valorDiaria: string;
  fotos: string;
  ativo: boolean;
};

const initialForm: FormState = {
  idUsuario: "",
  titulo: "",
  descricao: "",
  cidade: "",
  valorDiaria: "",
  fotos: "",
  ativo: true,
};

export function ImoveisPage() {
  const { data: imoveis, loading, error, refetch } = useImoveis();
  const { data: usuarios } = useUsuarios();
  const [view, setView] = useState<View>("list");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const filtered = useMemo(
    () =>
      (imoveis ?? []).filter(
        (i) =>
          i.titulo.toLowerCase().includes(search.toLowerCase()) ||
          i.cidade.toLowerCase().includes(search.toLowerCase()),
      ),
    [imoveis, search],
  );

  const set = (k: keyof FormState, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const startNew = () => {
    setEditingId(null);
    setForm(initialForm);
    setView("new");
  };

  const startEdit = (item: Imovel) => {
    setEditingId(item.idImovel);
    setForm({
      idUsuario: String(item.idUsuario),
      titulo: item.titulo,
      descricao: item.descricao,
      cidade: item.cidade,
      valorDiaria: String(item.valorDiaria),
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
    setSaving(true);
    try {
      const payload = {
        idUsuario: Number(form.idUsuario),
        titulo: form.titulo,
        descricao: form.descricao,
        cidade: form.cidade,
        valorDiaria: Number(form.valorDiaria),
        dataCadastro: new Date().toISOString().slice(0, 10),
        fotos: form.fotos
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean),
        ativo: form.ativo,
      };

      if (view === "new") {
        await imoveisService.create(payload);
      } else if (editingId) {
        await imoveisService.update(editingId, payload);
      }
      await refetch();
      setView("list");
      setForm(initialForm);
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
                <Field label="Fotos (URLs separadas por vírgula)">
                  <input
                    className={inputCls}
                    value={form.fotos}
                    onChange={(e) => set("fotos", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </FormCard>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setView("list")}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Cancelar
            </button>
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
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-stone-800">Imóveis</h3>
            <p className="text-xs text-stone-400">
              {filtered.length} resultado(s) na listagem
            </p>
          </div>
          <button
            onClick={startNew}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm whitespace-nowrap"
          >
            <IconPlus /> Novo Imóvel
          </button>
        </div>

        <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5">
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
      </div>

      {loading && <Spinner />}
      {error && <ErrorMsg msg={error} />}
      {filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
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
          <button
            onClick={startNew}
            className="mt-5 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            <IconPlus /> Novo Imóvel
          </button>
        </div>
      )}
    </div>
  );
}
