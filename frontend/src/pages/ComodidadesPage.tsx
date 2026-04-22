import { useEffect, useState } from "react";
import {
  Badge,
  ErrorMsg,
  Field,
  FormCard,
  FormHeader,
  Spinner,
  inputCls,
} from "../components/common";
import { IconEdit, IconPlus, IconSparkles, IconTrash } from "../components/icons";
import {
  comodidadeService,
  type ComodidadeCatalogo,
} from "../services/api";

type View = "list" | "new" | "edit";

type FormState = {
  nome: string;
  descricao: string;
  icone: string;
  ativo: boolean;
};

const initialForm: FormState = {
  nome: "",
  descricao: "",
  icone: "",
  ativo: true,
};

type ComodidadesPageProps = {
  title?: string;
  onlyActive?: boolean;
};

export function ComodidadesPage({
  title = "Comodidades",
  onlyActive = false,
}: ComodidadesPageProps = {}) {
  const [items, setItems] = useState<ComodidadeCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("list");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await comodidadeService.getAll();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar comodidades");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refetch();
  }, []);

  const filtered = items.filter((item) => (onlyActive ? item.ativo : true));

  const startNew = () => {
    setEditingId(null);
    setForm(initialForm);
    setView("new");
  };

  const startEdit = (item: ComodidadeCatalogo) => {
    setEditingId(item.idComodidade);
    setForm({
      nome: item.nome,
      descricao: item.descricao ?? "",
      icone: item.icone ?? "",
      ativo: item.ativo,
    });
    setView("edit");
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Deseja excluir esta comodidade?")) return;
    await comodidadeService.delete(id);
    await refetch();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        nome: form.nome,
        descricao: form.descricao,
        icone: form.icone,
        ativo: form.ativo,
      };

      if (view === "new") {
        await comodidadeService.create(payload);
      } else if (editingId) {
        await comodidadeService.update(editingId, payload);
      }

      await refetch();
      setView("list");
      setEditingId(null);
      setForm(initialForm);
    } finally {
      setSaving(false);
    }
  };

  if (view !== "list") {
    return (
      <div>
        <FormHeader
          title={view === "new" ? "Nova Comodidade" : "Editar Comodidade"}
          subtitle="Cadastre ou altere itens do catálogo"
          onBack={() => setView("list")}
        />
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormCard title="Dados da comodidade">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Field label="Nome" required>
                  <input
                    className={inputCls}
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    required
                  />
                </Field>
              </div>
              <Field label="Ícone">
                <input
                  className={inputCls}
                  value={form.icone}
                  onChange={(e) => setForm((f) => ({ ...f, icone: e.target.value }))}
                  placeholder="wifi, car, snowflake..."
                />
              </Field>
              <Field label="Ativo" required>
                <select
                  className={inputCls}
                  value={form.ativo ? "true" : "false"}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ativo: e.target.value === "true" }))
                  }
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
                    onChange={(e) =>
                      setForm((f) => ({ ...f, descricao: e.target.value }))
                    }
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
              <IconPlus />
              {saving
                ? "Salvando..."
                : view === "new"
                  ? "Cadastrar Comodidade"
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-stone-800">{title}</h3>
            <p className="text-xs text-stone-400">
              {filtered.length} item(ns) no catálogo
            </p>
          </div>
          <button
            onClick={startNew}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <IconPlus /> Nova Comodidade
          </button>
        </div>
      </div>

      {loading && <Spinner />}
      {error && <ErrorMsg msg={error} />}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.idComodidade}
              className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center text-white">
                  <IconSparkles />
                </div>
                <Badge active={item.ativo} />
              </div>
              <p className="font-semibold text-stone-800">{item.nome}</p>
              <p className="text-sm text-stone-400 mt-1 min-h-10">
                {item.descricao || "Sem descrição"}
              </p>
              <p className="text-xs text-stone-500 mt-2">
                Ícone: {item.icone || "—"}
              </p>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-stone-50">
                <button
                  onClick={() => startEdit(item)}
                  className="flex-1 text-xs font-medium text-stone-500 hover:text-amber-600 py-1.5 rounded-lg hover:bg-amber-50 transition-colors flex items-center justify-center gap-1"
                >
                  <IconEdit /> Editar
                </button>
                <button
                  onClick={() => handleDelete(item.idComodidade)}
                  className="flex-1 text-xs font-medium text-stone-500 hover:text-red-500 py-1.5 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                >
                  <IconTrash /> Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
