import { useEffect, useState } from "react";
import {
  ErrorMsg,
  Field,
  FormCard,
  FormHeader,
  Spinner,
  inputCls,
} from "../components/common";
import { IconEdit, IconPlus, IconTrash } from "../components/icons";
import { useImoveis, useUsuarios } from "../hooks/useData";
import { reservaService } from "../services/api";

type View = "list" | "new" | "edit";

type FormState = {
  idImovel: string;
  idHospede: string;
  dataInicio: string;
  dataFim: string;
};

const initialForm: FormState = {
  idImovel: "",
  idHospede: "",
  dataInicio: "",
  dataFim: "",
};

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatPtBrDate = (value: string) => {
  const date = parseLocalDate(value);
  return date ? date.toLocaleDateString("pt-BR") : value;
};

type ReservasPageProps = {
  guestId?: number;
  hostId?: number;
  fixedGuestId?: number;
  canManage?: boolean;
  title?: string;
};

export function ReservasPage({
  guestId,
  hostId,
  fixedGuestId,
  canManage = true,
  title = "Reservas",
}: ReservasPageProps) {
  const [reservas, setReservas] = useState<
    {
      idReserva: number;
      idImovel: number;
      idHospede: number;
      dataInicio: string;
      dataFim: string;
      valorTotal: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: imoveis } = useImoveis();
  const { data: usuarios } = useUsuarios();
  const [view, setView] = useState<View>("list");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data =
        typeof hostId === "number"
          ? await reservaService.getByAnfitriao(hostId)
          : typeof guestId === "number"
            ? await reservaService.getByHospede(guestId)
            : await reservaService.getAll();
      setReservas(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refetch();
  }, [guestId, hostId]);

  const set = (k: keyof FormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const startNew = () => {
    setEditingId(null);
    setForm({
      ...initialForm,
      idHospede: fixedGuestId ? String(fixedGuestId) : "",
    });
    setView("new");
  };

  const startEdit = (item: {
    idReserva: number;
    idImovel: number;
    idHospede: number;
    dataInicio: string;
    dataFim: string;
  }) => {
    setEditingId(item.idReserva);
    setForm({
      idImovel: String(item.idImovel),
      idHospede: String(item.idHospede),
      dataInicio: item.dataInicio,
      dataFim: item.dataFim,
    });
    setView("edit");
  };

  const calcTotal = () => {
    const imovel = (imoveis ?? []).find(
      (i) => i.idImovel === Number(form.idImovel),
    );
    if (!imovel || !form.dataInicio || !form.dataFim) return 0;
    const startDate = parseLocalDate(form.dataInicio);
    const endDate = parseLocalDate(form.dataFim);
    if (!startDate || !endDate) return 0;

    const nights = Math.max(
      0,
      Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000),
    );
    return nights * imovel.valorDiaria;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        idImovel: Number(form.idImovel),
        idHospede: Number(form.idHospede),
        dataInicio: form.dataInicio,
        dataFim: form.dataFim,
      };

      if (view === "new") {
        await reservaService.create(payload);
      } else if (editingId) {
        await reservaService.update(editingId, payload);
      }
      await refetch();
      setView("list");
      setEditingId(null);
      setForm(initialForm);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Deseja excluir esta reserva?")) return;
    await reservaService.delete(id);
    await refetch();
  };

  const getNomeHospede = (idHospede: number) => {
    const usuario = (usuarios ?? []).find((u) => u.idUsuario === idHospede);
    return usuario?.nome ?? `Usuário #${idHospede}`;
  };

  if (view !== "list") {
    return (
      <div>
        <FormHeader
          title={view === "new" ? "Nova Reserva" : "Editar Reserva"}
          subtitle="Preencha os dados da reserva"
          onBack={() => setView("list")}
        />
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormCard title="Imóvel e Hóspede">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Field label="Imóvel" required>
                  <select
                    className={inputCls}
                    value={form.idImovel}
                    onChange={(e) => set("idImovel", e.target.value)}
                    required
                  >
                    <option value="">Selecione um imóvel...</option>
                    {(imoveis ?? []).map((i) => (
                      <option key={i.idImovel} value={i.idImovel}>
                        {i.titulo} - {i.cidade}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Hóspede" required>
                  <select
                    className={inputCls}
                    value={form.idHospede}
                    onChange={(e) => set("idHospede", e.target.value)}
                    required
                    disabled={Boolean(fixedGuestId)}
                  >
                    <option value="">Selecione um hóspede...</option>
                    {(usuarios ?? []).map((u) => (
                      <option key={u.idUsuario} value={u.idUsuario}>
                        {u.nome}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Data início" required>
                <input
                  className={inputCls}
                  type="date"
                  value={form.dataInicio}
                  onChange={(e) => set("dataInicio", e.target.value)}
                  required
                />
              </Field>
              <Field label="Data fim" required>
                <input
                  className={inputCls}
                  type="date"
                  value={form.dataFim}
                  onChange={(e) => set("dataFim", e.target.value)}
                  required
                />
              </Field>
            </div>
          </FormCard>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
              Total da reserva
            </p>
            <p className="text-lg font-semibold text-amber-700">
              R$ {calcTotal().toLocaleString("pt-BR")}
            </p>
          </div>
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
                    ? "Registrar Reserva"
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
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-stone-800">{title}</h3>
            <p className="text-xs text-stone-400">
              {reservas.length} reserva(s) registrada(s)
            </p>
          </div>
          {canManage && (
            <button
              onClick={startNew}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <IconPlus /> Nova Reserva
            </button>
          )}
        </div>
      </div>
      {loading && <Spinner />}
      {error && <ErrorMsg msg={error} />}
      {reservas && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-6 py-3">
                  Hóspede
                </th>
                <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-4 py-3">
                  Imóvel
                </th>
                <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-4 py-3">
                  Período
                </th>
                <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-4 py-3">
                  Total
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {reservas.map((r) => (
                <tr
                  key={r.idReserva}
                  className="hover:bg-stone-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-stone-800">
                    {getNomeHospede(r.idHospede)}
                  </td>
                  <td className="px-4 py-4 text-sm text-stone-500">
                    Imóvel #{r.idImovel}
                  </td>
                  <td className="px-4 py-4 text-sm text-stone-500">
                    {formatPtBrDate(r.dataInicio)} → {formatPtBrDate(r.dataFim)}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-stone-700">
                    R$ {r.valorTotal.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-4">
                    {canManage && (
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => startEdit(r)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                        >
                          <IconEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(r.idReserva)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
