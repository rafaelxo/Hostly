import { useEffect, useMemo, useState } from "react";
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
import { reservaService, type Reserva } from "../services/api";

type View = "list" | "new" | "edit";

type FormState = {
  idImovel: string;
  idHospede: string;
  dataInicio: string;
  dataFim: string;
  formaPagamento:
    | ""
    | "PIX"
    | "CARTAO_CREDITO"
    | "CARTAO_DEBITO"
    | "BOLETO"
    | "DINHEIRO";
};

const initialForm: FormState = {
  idImovel: "",
  idHospede: "",
  dataInicio: "",
  dataFim: "",
  formaPagamento: "",
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

const isReservaAtiva = (reserva: { dataInicio: string; dataFim: string }) => {
  const endDate = parseLocalDate(reserva.dataFim);
  if (!endDate) return false;

  const today = new Date();
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return endDate >= now;
};

type ReservasPageProps = {
  guestId?: number;
  hostId?: number;
  fixedGuestId?: number;
  preselectedImovelId?: number;
  activeOnly?: boolean;
  canManage?: boolean;
  title?: string;
};

export function ReservasPage({
  guestId,
  hostId,
  fixedGuestId,
  preselectedImovelId,
  activeOnly = false,
  canManage = true,
  title = "Reservas",
}: ReservasPageProps) {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: imoveis } = useImoveis();
  const { data: usuarios } = useUsuarios();
  const [view, setView] = useState<View>("list");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<"" | Reserva["status"]>("");
  const [periodoDe, setPeriodoDe] = useState("");
  const [periodoAte, setPeriodoAte] = useState("");
  const [usuarioBusca, setUsuarioBusca] = useState("");
  const periodFrom = periodoDe ? parseLocalDate(periodoDe) : null;
  const periodTo = periodoAte ? parseLocalDate(periodoAte) : null;

  const getUsuarioNomeById = (idUsuario: number) =>
    (usuarios ?? []).find((item) => item.idUsuario === idUsuario)?.nome ??
    `Usuário #${idUsuario}`;

  const filteredReservas = useMemo(() => {
    const query = usuarioBusca.trim().toLowerCase();

    return reservas.filter((item) => {
      if (statusFiltro && item.status !== statusFiltro) {
        return false;
      }

      if (periodFrom || periodTo) {
        const startDate = parseLocalDate(item.dataInicio);
        const endDate = parseLocalDate(item.dataFim);
        if (!startDate || !endDate) {
          return false;
        }
        if (periodFrom && endDate < periodFrom) {
          return false;
        }
        if (periodTo && startDate > periodTo) {
          return false;
        }
      }

      if (query) {
        const hostName = getUsuarioNomeById(
          (imoveis ?? []).find(
            (property) => property.idImovel === item.idImovel,
          )?.idUsuario ?? -1,
        ).toLowerCase();
        const guestName = getUsuarioNomeById(item.idHospede).toLowerCase();
        const property = (imoveis ?? []).find(
          (current) => current.idImovel === item.idImovel,
        );
        const matches =
          hostName.includes(query) ||
          guestName.includes(query) ||
          String(item.idHospede).includes(query) ||
          String(property?.idUsuario ?? "").includes(query) ||
          String(item.idReserva).includes(query);
        if (!matches) {
          return false;
        }
      }

      return true;
    });
  }, [
    reservas,
    usuarioBusca,
    statusFiltro,
    periodFrom,
    periodTo,
    imoveis,
    usuarios,
  ]);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data =
        typeof hostId === "number"
          ? await reservaService.getAll({ idUsuario: hostId })
          : typeof guestId === "number"
            ? await reservaService.getAll({ idUsuario: guestId })
            : await reservaService.getAll();
      setReservas(
        activeOnly ? data.filter((item) => isReservaAtiva(item)) : data,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refetch();
  }, [guestId, hostId, activeOnly]);

  useEffect(() => {
    if (!canManage || typeof preselectedImovelId !== "number") return;

    setEditingId(null);
    setSelectedReserva(null);
    setForm({
      ...initialForm,
      idImovel: String(preselectedImovelId),
      idHospede: fixedGuestId ? String(fixedGuestId) : "",
    });
    setView("new");
  }, [canManage, fixedGuestId, preselectedImovelId]);

  const set = (k: keyof FormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const startNew = () => {
    setEditingId(null);
    setFormError(null);
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
    setFormError(null);
    setForm({
      idImovel: String(item.idImovel),
      idHospede: String(item.idHospede),
      dataInicio: item.dataInicio,
      dataFim: item.dataFim,
      formaPagamento: "",
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
    setFormError(null);

    const idImovel = Number(form.idImovel);
    const idHospede = Number(form.idHospede);
    if (!idImovel || !idHospede) {
      setFormError("Selecione um imóvel e um hóspede válidos.");
      return;
    }

    if (!form.dataInicio || !form.dataFim) {
      setFormError("Informe data de início e data de fim.");
      return;
    }

    const inicio = parseLocalDate(form.dataInicio);
    const fim = parseLocalDate(form.dataFim);
    if (!inicio || !fim) {
      setFormError("As datas informadas são inválidas.");
      return;
    }
    if (fim <= inicio) {
      setFormError("A data de fim deve ser posterior à data de início.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        idImovel,
        idHospede,
        dataInicio: form.dataInicio,
        dataFim: form.dataFim,
        formaPagamento: form.formaPagamento,
      };

      if (view === "new") {
        await reservaService.create(payload);
      } else if (editingId) {
        await reservaService.update(editingId, payload);
      }
      await refetch();
      setView("list");
      setEditingId(null);
      setFormError(null);
      setForm(initialForm);
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : "Não foi possível registrar a reserva.",
      );
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

  const getNomeImovel = (idImovel: number) =>
    (imoveis ?? []).find((i) => i.idImovel === idImovel)?.titulo ??
    `Imóvel #${idImovel}`;

  const fmtPagamento = (fp: string) =>
    ((
      ({
        PIX: "PIX",
        CARTAO_CREDITO: "Cartão de crédito",
        CARTAO_DEBITO: "Cartão de débito",
        BOLETO: "Boleto",
        DINHEIRO: "Dinheiro",
      }) as Record<string, string>
    )[fp] ??
      fp) ||
    "—";

  const fmtStatusPgto = (sp: string) =>
    (
      ({
        NAO_INICIADO: "Não iniciado",
        PENDENTE: "Pendente",
        APROVADO: "Aprovado",
        FALHOU: "Falhou",
      }) as Record<string, string>
    )[sp] ?? sp;

  const handleConfirm = async (
    idReserva: number,
    formaPagamento: FormState["formaPagamento"],
  ) => {
    if (!formaPagamento) {
      window.alert("Selecione uma forma de pagamento antes de confirmar.");
      return;
    }
    await reservaService.confirm(idReserva, formaPagamento);
    await refetch();
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
              <div className="md:col-span-2">
                <Field label="Forma de pagamento (opcional no cadastro)">
                  <select
                    className={inputCls}
                    value={form.formaPagamento}
                    onChange={(e) =>
                      set(
                        "formaPagamento",
                        e.target.value as FormState["formaPagamento"],
                      )
                    }
                  >
                    <option value="">Selecione...</option>
                    <option value="PIX">PIX</option>
                    <option value="CARTAO_CREDITO">Cartão de crédito</option>
                    <option value="CARTAO_DEBITO">Cartão de débito</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="DINHEIRO">Dinheiro</option>
                  </select>
                </Field>
              </div>
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
      <div className="card-elevated p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-stone-800">{title}</h3>
            <p className="text-xs text-stone-400">
              {filteredReservas.length} reserva(s) registrada(s)
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
          <input
            className={inputCls}
            placeholder="Buscar usuário por nome ou ID"
            value={usuarioBusca}
            onChange={(e) => setUsuarioBusca(e.target.value)}
          />

          <select
            className={inputCls}
            value={statusFiltro}
            onChange={(e) =>
              setStatusFiltro(e.target.value as "" | Reserva["status"])
            }
          >
            <option value="">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className={inputCls}
              type="date"
              value={periodoDe}
              onChange={(e) => setPeriodoDe(e.target.value)}
            />
            <input
              className={inputCls}
              type="date"
              value={periodoAte}
              onChange={(e) => setPeriodoAte(e.target.value)}
            />
          </div>
        </div>
      </div>
      {loading && <Spinner />}
      {error && <ErrorMsg msg={error} />}
      {filteredReservas.length > 0 && (
        <div className="card-elevated overflow-hidden">
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
                <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filteredReservas.map((r) => (
                <tr
                  key={r.idReserva}
                  onClick={() => setSelectedReserva(r)}
                  className="hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 text-sm font-medium text-stone-800">
                    {getNomeHospede(r.idHospede)}
                  </td>
                  <td className="px-4 py-4 text-sm text-stone-500">
                    {getNomeImovel(r.idImovel)}
                  </td>
                  <td className="px-4 py-4 text-sm text-stone-500">
                    {formatPtBrDate(r.dataInicio)} → {formatPtBrDate(r.dataFim)}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-stone-700">
                    R$ {r.valorTotal.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-4 text-xs">
                    <span
                      className={`px-2 py-1 rounded-full font-semibold ${
                        r.status === "CONFIRMADA"
                          ? "bg-emerald-100 text-emerald-700"
                          : r.status === "CANCELADA"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {canManage && (
                      <div
                        className="flex items-center gap-2 justify-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.status === "PENDENTE" && (
                          <button
                            onClick={() => handleConfirm(r.idReserva, "PIX")}
                            className="px-2 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                          >
                            Confirmar
                          </button>
                        )}
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

      {/* */}
      {selectedReserva && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setSelectedReserva(null)}
        >
          <div
            className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l border-stone-200 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <div>
                <h3 className="text-base font-semibold text-stone-800">
                  Reserva #{selectedReserva.idReserva}
                </h3>
                <span
                  className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    selectedReserva.status === "CONFIRMADA"
                      ? "bg-emerald-100 text-emerald-700"
                      : selectedReserva.status === "CANCELADA"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {selectedReserva.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedReserva(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors text-lg leading-none"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {/* */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* */}
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-stone-50 rounded-xl p-4 space-y-2">
                  <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">
                    Imóvel
                  </p>
                  <p className="text-sm font-medium text-stone-800">
                    {getNomeImovel(selectedReserva.idImovel)}
                  </p>
                </div>
                <div className="bg-stone-50 rounded-xl p-4 space-y-2">
                  <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">
                    Hóspede
                  </p>
                  <p className="text-sm font-medium text-stone-800">
                    {getNomeHospede(selectedReserva.idHospede)}
                  </p>
                </div>
              </div>

              {/* */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-stone-50 rounded-xl p-4">
                  <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider mb-1">
                    Check-in
                  </p>
                  <p className="text-sm font-medium text-stone-800">
                    {formatPtBrDate(selectedReserva.dataInicio)}
                  </p>
                </div>
                <div className="bg-stone-50 rounded-xl p-4">
                  <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider mb-1">
                    Check-out
                  </p>
                  <p className="text-sm font-medium text-stone-800">
                    {formatPtBrDate(selectedReserva.dataFim)}
                  </p>
                </div>
                <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-[11px] text-amber-700 font-semibold uppercase tracking-wider mb-1">
                    Total da reserva
                  </p>
                  <p className="text-lg font-semibold text-amber-700">
                    R$ {selectedReserva.valorTotal.toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>

              {/* */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-stone-50 rounded-xl p-4">
                  <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider mb-1">
                    Forma de pgto.
                  </p>
                  <p className="text-sm font-medium text-stone-800">
                    {fmtPagamento(selectedReserva.formaPagamento)}
                  </p>
                </div>
                <div className="bg-stone-50 rounded-xl p-4">
                  <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider mb-1">
                    Status pgto.
                  </p>
                  <p className="text-sm font-medium text-stone-800">
                    {fmtStatusPgto(selectedReserva.statusPagamento)}
                  </p>
                </div>
                {selectedReserva.confirmadaEm && (
                  <div className="col-span-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wider mb-1">
                      Confirmada em
                    </p>
                    <p className="text-sm font-medium text-emerald-800">
                      {new Date(selectedReserva.confirmadaEm).toLocaleString(
                        "pt-BR",
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* */}
            {canManage && (
              <div className="px-5 py-4 border-t border-stone-100 flex items-center gap-3">
                {selectedReserva.status === "PENDENTE" && (
                  <button
                    onClick={async () => {
                      await handleConfirm(selectedReserva.idReserva, "PIX");
                      setSelectedReserva(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors"
                  >
                    Confirmar reserva
                  </button>
                )}
                <button
                  onClick={() => {
                    startEdit(selectedReserva);
                    setSelectedReserva(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  <IconEdit /> Editar
                </button>
                <button
                  onClick={async () => {
                    await handleDelete(selectedReserva.idReserva);
                    setSelectedReserva(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  <IconTrash /> Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
