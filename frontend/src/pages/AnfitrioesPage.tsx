import { useState } from "react";
import {
  Badge,
  ErrorMsg,
  Field,
  FormCard,
  FormHeader,
  Spinner,
  inputCls,
} from "../components/common";
import { IconEdit, IconPlus, IconTrash } from "../components/icons";
import { useUsuarios } from "../hooks/useData";
import {
  usuarioService,
  type Usuario,
  type UsuarioTipo,
} from "../services/api";

type View = "list" | "new" | "edit";

const initialForm = {
  nome: "",
  email: "",
  senha: "",
  tipo: "ANFITRIAO" as UsuarioTipo,
  ativo: true,
};

type AnfitrioesPageProps = {
  title?: string;
  onlyActive?: boolean;
  canManage?: boolean;
};

export function AnfitrioesPage({
  title = "Usuários",
  onlyActive = false,
  canManage = true,
}: AnfitrioesPageProps) {
  const { data: usuarios, loading, error, refetch } = useUsuarios();
  const [view, setView] = useState<View>("list");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(initialForm);

  const usuariosFiltrados = (usuarios ?? []).filter((item) =>
    onlyActive ? item.ativo : true,
  );

  const set = (k: keyof typeof initialForm, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const startNew = () => {
    setEditingId(null);
    setForm(initialForm);
    setView("new");
  };

  const startEdit = (item: Usuario) => {
    setEditingId(item.idUsuario);
    setForm({
      nome: item.nome,
      email: item.email,
      senha: "",
      tipo: item.tipo,
      ativo: item.ativo,
    });
    setView("edit");
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Deseja excluir este usuário?")) return;
    await usuarioService.delete(id);
    await refetch();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        nome: form.nome,
        email: form.email,
        tipo: form.tipo,
        ativo: form.ativo,
        ...(form.senha ? { senha: form.senha } : {}),
      };

      if (view === "new") {
        await usuarioService.create(payload);
      } else if (editingId) {
        await usuarioService.update(editingId, payload);
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
          title={view === "new" ? "Novo Usuário" : "Editar Usuário"}
          subtitle="Cadastre ou altere os dados do usuário"
          onBack={() => setView("list")}
        />
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormCard title="Dados Pessoais">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Field label="Nome completo" required>
                  <input
                    className={inputCls}
                    value={form.nome}
                    onChange={(e) => set("nome", e.target.value)}
                    required
                  />
                </Field>
              </div>
              <Field label="E-mail" required>
                <input
                  className={inputCls}
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  required
                />
              </Field>
              <Field
                label={view === "new" ? "Senha" : "Nova senha (opcional)"}
                required={view === "new"}
              >
                <input
                  className={inputCls}
                  type="password"
                  value={form.senha}
                  onChange={(e) => set("senha", e.target.value)}
                  required={view === "new"}
                  minLength={view === "new" ? 6 : undefined}
                />
              </Field>
              <Field label="Perfil" required>
                <select
                  className={inputCls}
                  value={form.tipo}
                  onChange={(e) => set("tipo", e.target.value as UsuarioTipo)}
                  required
                >
                  <option value="ANFITRIAO">Anfitrião</option>
                  <option value="HOSPEDE">Hóspede</option>
                  <option value="ADMIN">Admin</option>
                </select>
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
                  ? "Cadastrar Usuário"
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
              {usuariosFiltrados.length} perfil(is) na listagem
            </p>
          </div>
          {canManage && (
            <button
              onClick={startNew}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <IconPlus /> Novo Usuário
            </button>
          )}
        </div>
      </div>
      {loading && <Spinner />}
      {error && <ErrorMsg msg={error} />}
      {usuarios && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {usuariosFiltrados.map((a) => (
            <div
              key={a.idUsuario}
              className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center text-white font-bold text-sm">
                  {a.nome
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <Badge active={a.ativo} />
              </div>
              <p className="font-semibold text-stone-800">{a.nome}</p>
              <p className="text-sm text-stone-400 mt-0.5">{a.email}</p>
              <p className="text-xs text-stone-500 mt-1">Perfil: {a.tipo}</p>
              {canManage && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-stone-50">
                  <button
                    onClick={() => startEdit(a)}
                    className="flex-1 text-xs font-medium text-stone-500 hover:text-amber-600 py-1.5 rounded-lg hover:bg-amber-50 transition-colors flex items-center justify-center gap-1"
                  >
                    <IconEdit /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(a.idUsuario)}
                    className="flex-1 text-xs font-medium text-stone-500 hover:text-red-500 py-1.5 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                  >
                    <IconTrash /> Excluir
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
