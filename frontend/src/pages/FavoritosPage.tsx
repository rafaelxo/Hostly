import { useCallback, useEffect, useState } from "react";
import { Badge, ErrorMsg, Spinner, inputCls } from "../components/common";
import { IconBuilding, IconEye, IconHeart, IconTrash } from "../components/icons";
import {
  favoritoService,
  imoveisService,
  type Imovel,
  type Usuario,
} from "../services/api";

const ptBrCurrency = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Props = {
  user: Usuario;
  onViewDetail?: (id: number) => void;
};

export function FavoritosPage({ user, onViewDetail }: Props) {
  const canSeeFavoritedUsers =
    user.tipo === "ADMIN" || user.tipo === "ANFITRIAO";
  const [items, setItems] = useState<Imovel[]>([]);
  const [managedProperties, setManagedProperties] = useState<Imovel[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [usersByProperty, setUsersByProperty] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [favorites, properties] = await Promise.all([
        user.tipo === "ADMIN"
          ? Promise.resolve<Imovel[]>([])
          : favoritoService.getByUsuario(user.idUsuario),
        canSeeFavoritedUsers
          ? imoveisService.getAll({
              ativo: true,
              ...(user.tipo === "ANFITRIAO"
                ? { idUsuario: user.idUsuario }
                : {}),
            })
          : Promise.resolve<Imovel[]>([]),
      ]);

      setItems(favorites);
      setManagedProperties(properties);
      setSelectedPropertyId((current) =>
        current || properties.length === 0
          ? current
          : String(properties[0].idImovel),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [canSeeFavoritedUsers, user.idUsuario, user.tipo]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!canSeeFavoritedUsers || !selectedPropertyId) {
      setUsersByProperty([]);
      return;
    }

    setUsersLoading(true);
    setUsersError(null);
    favoritoService
      .getUsuariosByImovel(Number(selectedPropertyId))
      .then(setUsersByProperty)
      .catch((e: unknown) =>
        setUsersError(e instanceof Error ? e.message : "Erro desconhecido"),
      )
      .finally(() => setUsersLoading(false));
  }, [canSeeFavoritedUsers, selectedPropertyId]);

  const removeFavorite = async (idImovel: number) => {
    await favoritoService.delete(user.idUsuario, idImovel);
    await refetch();
  };

  return (
    <div className="space-y-4">
      <div className="card-elevated p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
              <IconHeart />
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-800">
                {user.tipo === "ADMIN" ? "Favoritos dos imoveis" : "Meus favoritos"}
              </h3>
              <p className="text-xs text-stone-400">
                {user.tipo === "ADMIN"
                  ? "Acompanhe quais usuarios salvaram cada imovel."
                  : "Imoveis salvos na sua conta."}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                Usuario
              </p>
              <p className="text-sm font-semibold text-stone-700">
                #{user.idUsuario}
              </p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">
                Favoritos
              </p>
              <p className="text-sm font-semibold text-rose-700">
                {user.tipo === "ADMIN" ? usersByProperty.length : items.length}
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">
                Imoveis
              </p>
              <p className="text-sm font-semibold text-amber-700">
                {user.tipo === "ADMIN" ? managedProperties.length : items.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading && <Spinner />}
      {error && <ErrorMsg msg={error} />}

      {!loading && canSeeFavoritedUsers && (
        <div className="card-elevated p-5 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-stone-800">
                Usuarios que favoritaram imoveis
              </h4>
              <p className="text-xs text-stone-400">
                {user.tipo === "ANFITRIAO"
                  ? "Veja quem salvou os seus imoveis."
                  : "Selecione um imovel para ver os usuarios que salvaram."}
              </p>
            </div>
            <div className="w-full md:w-80">
              <select
                className={inputCls}
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
              >
                {managedProperties.length === 0 && (
                  <option value="">Nenhum imovel disponivel</option>
                )}
                {managedProperties.map((property) => (
                  <option key={property.idImovel} value={property.idImovel}>
                    #{property.idImovel} - {property.titulo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {usersLoading && <Spinner />}
          {usersError && <ErrorMsg msg={usersError} />}
          {!usersLoading && !usersError && (
            <div className="rounded-xl border border-stone-100 overflow-hidden">
              {usersByProperty.length === 0 ? (
                <p className="px-4 py-8 text-sm text-center text-stone-400">
                  Nenhum usuario favoritou este imovel.
                </p>
              ) : (
                <div className="divide-y divide-stone-100">
                  {usersByProperty.map((item) => (
                    <div
                      key={item.idUsuario}
                      className="px-4 py-3 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-stone-700">
                          {item.nome}
                        </p>
                        <p className="text-xs text-stone-400">{item.email}</p>
                      </div>
                      <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700">
                        #{item.idUsuario}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!loading && user.tipo !== "ADMIN" && (
        <div className="card-elevated overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-stone-800">
                Imoveis salvos
              </h4>
              <p className="text-xs text-stone-400">
                Lista dos imoveis que voce marcou como favorito.
              </p>
            </div>
            <span className="w-fit rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
              {items.length} favorito(s)
            </span>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-300 mb-4">
                <IconHeart />
              </div>
              <p className="text-stone-500 font-medium">
                Nenhum favorito encontrado
              </p>
              <p className="text-stone-400 text-sm mt-1">
                Voce ainda nao salvou nenhum imovel.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-5 py-3">
                    #
                  </th>
                  <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-4 py-3">
                    Imovel
                  </th>
                  <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-4 py-3">
                    Diaria
                  </th>
                  <th className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {items.map((item, index) => (
                  <tr
                    key={item.idImovel}
                    className="hover:bg-stone-50 transition-colors"
                  >
                    <td className="px-5 py-4 text-sm font-semibold text-emerald-700">
                      {index + 1}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                          <IconBuilding />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-stone-800">
                            {item.titulo}
                          </p>
                          <p className="text-xs text-stone-400">
                            #{item.idImovel} - {item.cidade}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-stone-700">
                      {ptBrCurrency(item.valorDiaria)}
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
                        <button
                          onClick={() => removeFavorite(item.idImovel)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Remover favorito"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
