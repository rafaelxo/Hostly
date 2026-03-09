import { useState } from "react";
import { ErrorMsg, Field, FormCard, inputCls } from "../components/common";
import logoImg from "../assets/logo.png";
import { authService } from "../services/api";

type AuthPageProps = {
  onAuthenticated: () => Promise<void> | void;
};

type RegisterMode = "hospede" | "anfitriao";

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginSenha, setLoginSenha] = useState("");

  const [regNome, setRegNome] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regSenha, setRegSenha] = useState("");
  const [regMode, setRegMode] = useState<RegisterMode>("hospede");
  const [imovelTitulo, setImovelTitulo] = useState("");
  const [imovelDescricao, setImovelDescricao] = useState("");
  const [imovelCidade, setImovelCidade] = useState("");
  const [imovelDiaria, setImovelDiaria] = useState("");

  function evaluatePassword(pw: string) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    const labels = ["Muito fraca", "Fraca", "Média", "Forte", "Muito forte"];
    const colors = ["bg-red-400", "bg-rose-400", "bg-amber-400", "bg-lime-400", "bg-green-500"];
    return { score, label: labels[score], color: colors[score] };
  }

  const PasswordStrength = ({ pw }: { pw: string }) => {
    const { score, label, color } = evaluatePassword(pw);
    const percent = Math.min(100, (score / 4) * 100);
    return (
      <div className="space-y-1">
        <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
          <div className={`${color} h-2`} style={{ width: `${percent}%` }} />
        </div>
        <p className="text-xs text-stone-500">Força: <span className="font-semibold">{label}</span></p>
      </div>
    );
  };

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authService.login(loginEmail, loginSenha);
      await onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const doRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authService.register({
        nome: regNome,
        email: regEmail,
        senha: regSenha,
        comoAnfitriao: regMode === "anfitriao",
        ...(regMode === "anfitriao"
          ? {
              imovelInicial: {
                titulo: imovelTitulo,
                descricao: imovelDescricao,
                cidade: imovelCidade,
                valorDiaria: Number(imovelDiaria),
                dataCadastro: new Date().toISOString().slice(0, 10),
                fotos: [],
                ativo: true,
              },
            }
          : {}),
      });
      setSuccess("Conta criada com sucesso. Entrando...");
      setTimeout(async () => {
        await onAuthenticated();
      }, 900);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao cadastrar usuário",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-100 to-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center">
          <img src={logoImg} alt="Hostly" className="mx-auto w-20 h-20 mb-3 object-contain" />
          <h1 className="text-2xl font-bold text-stone-800">Hostly</h1>
          <p className="text-sm text-stone-500">Acesse sua conta para continuar</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-2 flex">
          <button
            onClick={() => setTab("login")}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
              tab === "login" ? "bg-amber-500 text-white" : "text-stone-500"
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => setTab("register")}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
              tab === "register" ? "bg-amber-500 text-white" : "text-stone-500"
            }`}
          >
            Cadastrar
          </button>
        </div>

        {error && <ErrorMsg msg={error} />}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-5 py-4 text-sm">
            {success}
          </div>
        )}

        {tab === "login" ? (
          <form onSubmit={doLogin} className="space-y-4">
            <FormCard title="Login">
              <div className="space-y-4">
                <Field label="E-mail" required>
                  <input
                    className={inputCls}
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Senha" required>
                  <input
                    className={inputCls}
                    type="password"
                    value={loginSenha}
                    onChange={(e) => setLoginSenha(e.target.value)}
                    required
                  />
                </Field>
              </div>
            </FormCard>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        ) : (
          <form onSubmit={doRegister} className="space-y-4">
            <FormCard title="Cadastro">
              <div className="space-y-4">
                <Field label="Nome" required>
                  <input
                    className={inputCls}
                    value={regNome}
                    onChange={(e) => setRegNome(e.target.value)}
                    required
                  />
                </Field>
                <Field label="E-mail" required>
                  <input
                    className={inputCls}
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Senha" required>
                  <input
                    className={inputCls}
                    type="password"
                    minLength={6}
                    value={regSenha}
                    onChange={(e) => setRegSenha(e.target.value)}
                    required
                  />
                  <div className="mt-2">
                    <PasswordStrength pw={regSenha} />
                  </div>
                </Field>
                <Field label="Tipo de cadastro" required>
                  <select
                    className={inputCls}
                    value={regMode}
                    onChange={(e) => setRegMode(e.target.value as RegisterMode)}
                  >
                    <option value="hospede">Hóspede</option>
                    <option value="anfitriao">Anfitrião</option>
                  </select>
                </Field>

                {regMode === "anfitriao" && (
                  <div className="rounded-xl border border-stone-200 p-3 space-y-3">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      Imóvel inicial
                    </p>
                    <Field label="Título" required>
                      <input
                        className={inputCls}
                        value={imovelTitulo}
                        onChange={(e) => setImovelTitulo(e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="Cidade" required>
                      <input
                        className={inputCls}
                        value={imovelCidade}
                        onChange={(e) => setImovelCidade(e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="Valor da diária" required>
                      <input
                        className={inputCls}
                        type="number"
                        min="1"
                        value={imovelDiaria}
                        onChange={(e) => setImovelDiaria(e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="Descrição" required>
                      <textarea
                        className={`${inputCls} resize-none`}
                        rows={2}
                        value={imovelDescricao}
                        onChange={(e) => setImovelDescricao(e.target.value)}
                        required
                      />
                    </Field>
                  </div>
                )}
              </div>
            </FormCard>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm disabled:opacity-60"
            >
              {loading ? "Cadastrando..." : "Criar conta"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
