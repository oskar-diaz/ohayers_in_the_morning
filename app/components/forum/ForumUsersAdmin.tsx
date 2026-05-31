"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ShieldAlert, Trash2 } from "lucide-react";

import AuthPanel from "@/app/components/AuthPanel";
import { isAdminEmail } from "@/lib/admin";
import { getConfirmedSession } from "@/lib/auth-confirmation";
import { supabase } from "@/lib/supabase";

type AdminForumUser = {
  avatarUrl: string | null;
  confirmedAt: string | null;
  createdAt: string;
  displayName: string;
  email: string | null;
  id: string;
  isAdmin: boolean;
  lastSignInAt: string | null;
  phone: string | null;
  profileBio: string | null;
  providers: string[];
};

type UsersResponse = {
  currentUserId: string;
  pagination: {
    lastPage: number;
    nextPage: number | null;
    page: number;
    perPage: number;
    total: number;
  };
  users: AdminForumUser[];
};

const USERS_PER_PAGE = 50;

function formatAdminDate(value: string | null) {
  if (!value) {
    return "Nunca";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Nunca";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getUserInitial(label: string) {
  return label.trim().charAt(0).toUpperCase() || "U";
}

export default function ForumUsersAdmin() {
  const [session, setSession] = useState<Session | null>(null);
  const [users, setUsers] = useState<AdminForumUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState("");

  const isAdmin = isAdminEmail(session?.user.email);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) =>
      [
        user.displayName,
        user.email,
        user.id,
        user.phone,
        user.providers.join(" "),
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }, [search, users]);

  useEffect(() => {
    let isActive = true;

    function syncSession(nextSession: Session | null) {
      if (!isActive) {
        return;
      }

      setSession(getConfirmedSession(nextSession));
    }

    supabase.auth.getSession().then(({ data }) => {
      syncSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      syncSession(nextSession ?? null);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    if (!isAdmin) {
      return;
    }

    const controller = new AbortController();

    async function loadUsers() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          `/api/forum/users?page=${page}&perPage=${USERS_PER_PAGE}`,
          {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
            },
            signal: controller.signal,
          },
        );
        const data = (await response.json()) as Partial<UsersResponse> & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error || "No he podido cargar los usuarios.");
        }

        setUsers(data.users ?? []);
        setCurrentUserId(data.currentUserId ?? "");
        setLastPage(data.pagination?.lastPage ?? 0);
        setTotalUsers(data.pagination?.total ?? data.users?.length ?? 0);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No he podido cargar los usuarios.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      controller.abort();
    };
  }, [isAdmin, page, session]);

  async function deleteUser(user: AdminForumUser) {
    if (!session || deletingUserId || user.id === currentUserId || user.isAdmin) {
      return;
    }

    const label = user.email || user.displayName || user.id;
    const confirmed = window.confirm(
      `Borrar definitivamente a ${label}? Se eliminará su usuario de Supabase Auth.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingUserId(user.id);
    setErrorMessage("");
    setNoticeMessage("");

    try {
      const response = await fetch("/api/forum/users", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });
      const data = (await response.json()) as {
        deletedImageCount?: number;
        error?: string;
        ok?: boolean;
        warning?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "No he podido borrar el usuario.");
      }

      setUsers((currentUsers) =>
        currentUsers.filter((currentUser) => currentUser.id !== user.id),
      );
      setTotalUsers((currentTotal) => Math.max(0, currentTotal - 1));
      setNoticeMessage(
        data.warning ||
          `Usuario borrado. Imagenes eliminadas: ${data.deletedImageCount ?? 0}.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No he podido borrar el usuario.",
      );
    } finally {
      setDeletingUserId("");
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/forum" className="editorial-link-button">
            Volver al foro
          </Link>
          <h1 className="mt-4 text-2xl font-black leading-tight sm:text-3xl">
            Usuarios
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6a645c]">
            Panel privado para revisar cuentas y borrar usuarios de Supabase Auth.
          </p>
        </div>

        {isAdmin && (
          <div className="rounded-full border border-[#d6d1c8] bg-[#fffdf8] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#111111]">
            {totalUsers.toLocaleString("es-ES")} usuarios
          </div>
        )}
      </div>

      {!session ? (
        <AuthPanel
          className="mx-auto max-w-md"
          description="Entra con tu cuenta admin para ver los usuarios."
        />
      ) : !isAdmin ? (
        <div className="editorial-card rounded-[2rem] px-6 py-8">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 text-red-700" size={22} />
            <div>
              <h2 className="text-lg font-black text-[#111111]">
                No autorizado
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#6a645c]">
                Esta ruta solo está disponible para koki142@gmail.com.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-[1.5rem] border border-[#d6d1c8] bg-[#fffdf8] p-4 sm:flex-row sm:items-center sm:justify-between">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, email, id o proveedor"
              className="editorial-field sm:max-w-md"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={page <= 1 || isLoading}
                className="editorial-link-button disabled:cursor-not-allowed disabled:opacity-45"
              >
                Anterior
              </button>
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[#7a746b]">
                {page}
                {lastPage ? ` / ${lastPage}` : ""}
              </span>
              <button
                type="button"
                onClick={() => setPage((currentPage) => currentPage + 1)}
                disabled={Boolean(lastPage && page >= lastPage) || isLoading}
                className="editorial-link-button disabled:cursor-not-allowed disabled:opacity-45"
              >
                Siguiente
              </button>
            </div>
          </div>

          {errorMessage && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          {noticeMessage && (
            <p className="rounded-2xl border border-[#d6d1c8] bg-[#ece8df] px-4 py-3 text-sm text-[#4f4a44]">
              {noticeMessage}
            </p>
          )}

          <div className="overflow-hidden rounded-[1.5rem] border border-[#d6d1c8] bg-[#fffdf8]">
            {isLoading ? (
              <p className="px-5 py-8 text-sm text-[#6a645c]">Cargando usuarios...</p>
            ) : filteredUsers.length === 0 ? (
              <p className="px-5 py-8 text-sm text-[#6a645c]">
                No hay usuarios que coincidan.
              </p>
            ) : (
              <div className="divide-y divide-[#d6d1c8]">
                {filteredUsers.map((user) => {
                  const canDelete = !user.isAdmin && user.id !== currentUserId;

                  return (
                    <article
                      key={user.id}
                      className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="flex min-w-0 gap-4">
                        {user.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={user.avatarUrl}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-black/10"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/75 text-sm font-black text-[#111111]">
                            {getUserInitial(user.displayName)}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="break-words text-base font-black leading-tight text-[#111111]">
                              {user.displayName}
                            </h2>
                            {user.isAdmin && (
                              <span className="rounded-full bg-[#111111] px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#fffdf8]">
                                Admin
                              </span>
                            )}
                            {user.confirmedAt ? (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-emerald-700">
                                Confirmado
                              </span>
                            ) : (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-amber-700">
                                Sin confirmar
                              </span>
                            )}
                          </div>

                          <p className="mt-1 break-all text-sm font-semibold text-[#4f4a44]">
                            {user.email || user.phone || "Sin email"}
                          </p>
                          <p className="mt-1 break-all font-mono text-[0.68rem] text-[#7a746b]">
                            {user.id}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {user.providers.length > 0 ? (
                              user.providers.map((provider) => (
                                <span
                                  key={provider}
                                  className="rounded-full border border-[#d6d1c8] bg-white px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#5f5952]"
                                >
                                  {provider}
                                </span>
                              ))
                            ) : (
                              <span className="rounded-full border border-[#d6d1c8] bg-white px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#5f5952]">
                                Sin proveedor
                              </span>
                            )}
                          </div>

                          <dl className="mt-3 grid gap-2 text-xs text-[#6a645c] sm:grid-cols-3">
                            <div>
                              <dt className="font-black uppercase tracking-[0.12em]">
                                Alta
                              </dt>
                              <dd className="mt-1">{formatAdminDate(user.createdAt)}</dd>
                            </div>
                            <div>
                              <dt className="font-black uppercase tracking-[0.12em]">
                                Ultimo login
                              </dt>
                              <dd className="mt-1">
                                {formatAdminDate(user.lastSignInAt)}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-black uppercase tracking-[0.12em]">
                                Confirmacion
                              </dt>
                              <dd className="mt-1">
                                {formatAdminDate(user.confirmedAt)}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </div>

                      <div className="flex items-start lg:justify-end">
                        <button
                          type="button"
                          onClick={() => void deleteUser(user)}
                          disabled={!canDelete || deletingUserId === user.id}
                          className="editorial-link-button border-red-200 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <Trash2 size={15} strokeWidth={2.4} />
                          {deletingUserId === user.id ? "Borrando..." : "Borrar"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
