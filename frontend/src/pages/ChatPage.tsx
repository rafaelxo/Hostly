import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ErrorMsg, Spinner, inputCls } from "../components/common";
import { IconChat, IconSearch } from "../components/icons";
import {
  chatService,
  usuarioService,
  type ChatMensagem,
  type Usuario,
} from "../services/api";

type ChatPageProps = {
  currentUser: Usuario;
  preselectedUserId?: number;
  preselectedPropertyId?: number;
};

export function ChatPage({
  currentUser,
  preselectedUserId,
  preselectedPropertyId,
}: ChatPageProps) {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [messages, setMessages] = useState<ChatMensagem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    preselectedUserId ?? null,
  );
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(
    preselectedPropertyId ?? null,
  );
  const [contactQuery, setContactQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      setError(null);
      try {
        const all = await chatService.getContacts(currentUser.idUsuario);
        setUsers(all);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar usuários.");
      } finally {
        setLoadingUsers(false);
      }
    };

    void loadUsers();
  }, [currentUser.idUsuario]);

  const contacts = useMemo(() => {
    return [...users].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [users]);

  useEffect(() => {
    if (selectedUserId !== null) return;
    if (contacts.length > 0) {
      setSelectedUserId(contacts[0].idUsuario);
    }
  }, [contacts, selectedUserId]);

  useEffect(() => {
    if (preselectedUserId) {
      setSelectedUserId(preselectedUserId);
    }
    if (preselectedPropertyId) {
      setSelectedPropertyId(preselectedPropertyId);
    }
  }, [preselectedPropertyId, preselectedUserId]);

  useEffect(() => {
    if (!preselectedUserId) return;
    if (users.some((u) => u.idUsuario === preselectedUserId)) return;

    const loadTargetUser = async () => {
      try {
        const target = await usuarioService.getById(preselectedUserId);
        if (
          target.idUsuario !== currentUser.idUsuario &&
          target.tipo !== "ADMIN"
        ) {
          setUsers((prev) => [...prev, target]);
        }
      } catch {
        // Ignore fallback lookup errors; contact list API remains source of truth.
      }
    };

    void loadTargetUser();
  }, [currentUser.idUsuario, preselectedUserId, users]);

  const selectedUser =
    contacts.find((u) => u.idUsuario === selectedUserId) ?? null;
  const visibleContacts = useMemo(() => {
    const query = contactQuery.trim().toLowerCase();
    if (!query) return contacts;

    return contacts.filter((contact) =>
      contact.nome.toLowerCase().includes(query),
    );
  }, [contactQuery, contacts]);

  const loadMessages = useCallback(async () => {
    if (!selectedUserId) return;
    setLoadingMessages(true);
    setError(null);
    try {
      const data = await chatService.getByUsers(
        currentUser.idUsuario,
        selectedUserId,
        selectedPropertyId ?? undefined,
      );
      setMessages(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar mensagens.");
    } finally {
      setLoadingMessages(false);
    }
  }, [currentUser.idUsuario, selectedPropertyId, selectedUserId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!selectedUserId) return;
    const timer = window.setInterval(() => {
      void loadMessages();
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadMessages, selectedUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!selectedUserId || !draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      await chatService.send({
        idRemetente: currentUser.idUsuario,
        idDestinatario: selectedUserId,
        idImovel: selectedPropertyId ?? undefined,
        conteudo: draft,
      });
      setDraft("");
      await loadMessages();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-5 min-h-[68vh]">
      <aside className="card-elevated p-4 flex flex-col gap-4">
        <div className="rounded-2xl border border-stone-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
            Contatos
          </p>
          <p className="text-sm text-stone-600 mt-1">
            Escolha com quem você quer conversar.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3">
          <span className="text-stone-400">
            <IconSearch />
          </span>
          <input
            className="w-full h-10 bg-transparent outline-none text-sm text-stone-700"
            value={contactQuery}
            onChange={(e) => setContactQuery(e.target.value)}
            placeholder="Buscar contato..."
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loadingUsers ? (
            <Spinner />
          ) : visibleContacts.length === 0 ? (
            <p className="text-sm text-stone-500 px-1">
              Nenhum contato encontrado.
            </p>
          ) : (
            visibleContacts.map((contact) => {
              const selected = contact.idUsuario === selectedUserId;
              return (
                <button
                  key={contact.idUsuario}
                  type="button"
                  onClick={() => {
                    setSelectedUserId(contact.idUsuario);
                    setSelectedPropertyId(null);
                  }}
                  className={`w-full text-left px-3.5 py-3 rounded-xl border transition-all ${
                    selected
                      ? "bg-amber-50 border-amber-300 shadow-sm"
                      : "bg-white border-stone-200 hover:border-amber-200"
                  }`}
                >
                  <p className="text-sm font-semibold text-stone-800 truncate">
                    {contact.nome}
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5 truncate">
                    {contact.tipo}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="card-elevated p-4 md:p-5 flex flex-col min-h-[68vh]">
        <header className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <IconChat />
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-stone-800 truncate">
                {selectedUser
                  ? `Conversa com ${selectedUser.nome}`
                  : "Conversa"}
              </p>
              <p className="text-xs text-stone-500 truncate">
                {selectedUser
                  ? selectedUser.tipo
                  : "Selecione um contato para iniciar"}
              </p>
              {selectedPropertyId ? (
                <p className="text-[11px] text-amber-600 truncate mt-0.5">
                  Tirando dúvidas sobre o imóvel #{selectedPropertyId}
                </p>
              ) : null}
            </div>
          </div>
        </header>

        {error && (
          <div className="mt-4">
            <ErrorMsg msg={error} />
          </div>
        )}

        <div className="mt-4 flex-1 rounded-2xl border border-stone-200 bg-gradient-to-b from-stone-50 to-white p-4 overflow-y-auto space-y-3">
          {loadingMessages ? (
            <Spinner />
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <p className="text-sm text-stone-500">
                Nenhuma mensagem ainda. Envie um "oi" para começar.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const mine = msg.idRemetente === currentUser.idUsuario;
              return (
                <div
                  key={msg.idMensagem}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-sm ${
                      mine
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                        : "bg-white border border-stone-200 text-stone-700"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.conteudo}
                    </p>
                    <p
                      className={`text-[10px] mt-1.5 ${
                        mine ? "text-amber-100" : "text-stone-400"
                      }`}
                    >
                      {new Date(msg.dataCriacao).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="mt-4 pt-4 border-t border-stone-100 flex gap-2">
          <input
            className={inputCls}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              selectedUser ? "Digite sua mensagem..." : "Selecione um contato"
            }
            disabled={!selectedUser || sending}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!selectedUser || !draft.trim() || sending}
            className="px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-60"
          >
            {sending ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </section>
    </div>
  );
}
