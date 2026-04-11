import { useState } from "react";
import logoImg from "../assets/logo.png";
import { ErrorMsg, Field, inputCls } from "../components/common";
import { COMMON_AMENITIES } from "../constants/amenities";
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
  const [regTelefone, setRegTelefone] = useState("");
  const [regSenha, setRegSenha] = useState("");
  const [regMode, setRegMode] = useState<RegisterMode>("hospede");
  const [imovelTitulo, setImovelTitulo] = useState("");
  const [imovelDescricao, setImovelDescricao] = useState("");
  const [imovelCidade, setImovelCidade] = useState("");
  const [imovelRua, setImovelRua] = useState("");
  const [imovelNumero, setImovelNumero] = useState("");
  const [imovelBairro, setImovelBairro] = useState("");
  const [imovelEstado, setImovelEstado] = useState("");
  const [imovelCep, setImovelCep] = useState("");
  const [imovelFoto, setImovelFoto] = useState<File | null>(null);
  const [imovelComodidades, setImovelComodidades] = useState<string[]>([]);
  const [imovelDiaria, setImovelDiaria] = useState("");

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Falha ao ler a imagem."));
      reader.readAsDataURL(file);
    });

  function evaluatePassword(pw: string) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    const labels = ["Muito fraca", "Fraca", "Média", "Forte", "Muito forte"];
    const colors = [
      "bg-red-400",
      "bg-rose-400",
      "bg-amber-400",
      "bg-lime-400",
      "bg-green-500",
    ];
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
        <p className="text-xs text-stone-500">
          Força: <span className="font-semibold">{label}</span>
        </p>
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
      let initialPhoto: string | null = null;
      if (regMode === "anfitriao") {
        if (!imovelFoto) {
          setError("Anexe ao menos uma foto do imóvel inicial.");
          setLoading(false);
          return;
        }
        initialPhoto = await fileToDataUrl(imovelFoto);
      }

      await authService.register({
        nome: regNome,
        email: regEmail,
        telefone: regTelefone,
        senha: regSenha,
        comoAnfitriao: regMode === "anfitriao",
        ...(regMode === "anfitriao"
          ? {
              imovelInicial: {
                titulo: imovelTitulo,
                descricao: imovelDescricao,
                endereco: {
                  rua: imovelRua,
                  numero: imovelNumero,
                  bairro: imovelBairro,
                  cidade: imovelCidade,
                  estado: imovelEstado,
                  cep: imovelCep,
                },
                comodidades: imovelComodidades
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .map((nome) => ({ nome })),
                cidade: imovelCidade,
                valorDiaria: Number(imovelDiaria),
                dataCadastro: new Date().toISOString().slice(0, 10),
                fotos: initialPhoto ? [initialPhoto] : [],
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-stone-100 via-orange-50/35 to-amber-100/35 px-4 py-6 md:px-8 md:py-10">
      <div className="pointer-events-none absolute -top-28 -left-24 h-72 w-72 rounded-full bg-amber-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-orange-200/30 blur-3xl" />

      <div className="relative mx-auto w-full max-w-3xl">
        <section className="rounded-3xl border border-stone-200 bg-white/95 p-4 shadow-xl backdrop-blur-sm md:p-6 lg:p-8">
          <div className="mb-5 text-center">
            <img
              src={logoImg}
              alt="Hostly"
              className="mx-auto w-16 h-16 object-contain mb-2"
            />
            <h1 className="text-2xl font-black tracking-tight text-stone-800">
              Hostly
            </h1>
            <p className="text-sm text-stone-500">Entre ou crie sua conta</p>
          </div>

          <div className="mx-auto mb-6 flex w-full max-w-md rounded-2xl border border-stone-200 bg-stone-50 p-1.5">
            <button
              onClick={() => setTab("login")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                tab === "login"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setTab("register")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                tab === "register"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              Cadastrar
            </button>
          </div>

          <div className="mx-auto w-full max-w-3xl space-y-4">
            {error && <ErrorMsg msg={error} />}
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-5 py-4 text-sm">
                {success}
              </div>
            )}

            {tab === "login" ? (
              <form onSubmit={doLogin} className="space-y-4">
                <div className="rounded-2xl border border-stone-200 bg-white p-5 md:p-6 shadow-sm space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
                    Acesso
                  </h2>
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
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-sm disabled:opacity-60"
                >
                  {loading ? "Entrando..." : "Entrar na plataforma"}
                </button>
              </form>
            ) : (
              <form onSubmit={doRegister} className="space-y-4">
                <div className="rounded-2xl border border-stone-200 bg-white p-5 md:p-6 shadow-sm space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
                    Dados da conta
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Field label="Nome" required>
                        <input
                          className={inputCls}
                          value={regNome}
                          onChange={(e) => setRegNome(e.target.value)}
                          required
                        />
                      </Field>
                    </div>
                    <Field label="E-mail" required>
                      <input
                        className={inputCls}
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="Telefone" required>
                      <input
                        className={inputCls}
                        value={regTelefone}
                        onChange={(e) => setRegTelefone(e.target.value)}
                        required
                      />
                    </Field>
                    <div className="md:col-span-2">
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
                    </div>
                    <div className="md:col-span-2">
                      <Field label="Tipo de cadastro" required>
                        <select
                          className={inputCls}
                          value={regMode}
                          onChange={(e) =>
                            setRegMode(e.target.value as RegisterMode)
                          }
                        >
                          <option value="hospede">Hóspede</option>
                          <option value="anfitriao">Anfitrião</option>
                        </select>
                      </Field>
                    </div>
                  </div>
                </div>

                {regMode === "anfitriao" && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 md:p-6 space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-amber-700">
                        Imóvel inicial
                      </p>
                      <p className="text-xs text-amber-700/80 mt-0.5">
                        Preencha para já começar como anfitrião com anúncio
                        ativo.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Field label="Título" required>
                          <input
                            className={inputCls}
                            value={imovelTitulo}
                            onChange={(e) => setImovelTitulo(e.target.value)}
                            required
                          />
                        </Field>
                      </div>

                      <Field label="Cidade" required>
                        <input
                          className={inputCls}
                          value={imovelCidade}
                          onChange={(e) => setImovelCidade(e.target.value)}
                          required
                        />
                      </Field>
                      <Field label="Estado (UF)" required>
                        <input
                          className={inputCls}
                          value={imovelEstado}
                          onChange={(e) =>
                            setImovelEstado(e.target.value.toUpperCase())
                          }
                          required
                          minLength={2}
                          maxLength={2}
                        />
                      </Field>
                      <Field label="Rua" required>
                        <input
                          className={inputCls}
                          value={imovelRua}
                          onChange={(e) => setImovelRua(e.target.value)}
                          required
                        />
                      </Field>
                      <Field label="Número" required>
                        <input
                          className={inputCls}
                          value={imovelNumero}
                          onChange={(e) => setImovelNumero(e.target.value)}
                          required
                        />
                      </Field>
                      <Field label="Bairro" required>
                        <input
                          className={inputCls}
                          value={imovelBairro}
                          onChange={(e) => setImovelBairro(e.target.value)}
                          required
                        />
                      </Field>
                      <Field label="CEP" required>
                        <input
                          className={inputCls}
                          value={imovelCep}
                          onChange={(e) => setImovelCep(e.target.value)}
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
                      <div className="md:col-span-2">
                        <Field label="Descrição" required>
                          <textarea
                            className={`${inputCls} resize-none`}
                            rows={3}
                            value={imovelDescricao}
                            onChange={(e) => setImovelDescricao(e.target.value)}
                            required
                          />
                        </Field>
                      </div>
                      <div className="md:col-span-2">
                        <Field label="Foto principal" required>
                          <input
                            className={inputCls}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            onChange={(e) =>
                              setImovelFoto(e.target.files?.[0] ?? null)
                            }
                            required
                          />
                        </Field>
                      </div>
                      <div className="md:col-span-2">
                        <Field label="Comodidades">
                          <div className="flex flex-wrap gap-2 rounded-xl border border-stone-200 bg-white p-3">
                            {COMMON_AMENITIES.map((amenity) => {
                              const selected =
                                imovelComodidades.includes(amenity);
                              return (
                                <button
                                  key={amenity}
                                  type="button"
                                  onClick={() =>
                                    setImovelComodidades((prev) =>
                                      selected
                                        ? prev.filter((c) => c !== amenity)
                                        : [...prev, amenity],
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
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-sm disabled:opacity-60"
                >
                  {loading ? "Cadastrando..." : "Criar conta"}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
