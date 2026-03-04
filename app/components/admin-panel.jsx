import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ChevronDown, Trash2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AdminPanel({ onBack }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [inviteRequests, setInviteRequests] = useState([]);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [activeAction, setActiveAction] = useState(null);
  const [denyOpenRequestId, setDenyOpenRequestId] = useState(null);
  const [denyReason, setDenyReason] = useState("");
  const [recentlyMovedRequestId, setRecentlyMovedRequestId] = useState(null);

  const fetchInviteRequests = useCallback(async () => {
    setIsLoading(true);
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setError("Session expired. Please sign in again.");
      setIsLoading(false);
      return;
    }

    const response = await fetch("/api/admin/invite-requests", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const payload = await response.json();
    if (!response.ok) {
      setError(payload?.error || "Failed to load invite requests.");
      setInviteRequests([]);
    } else {
      setInviteRequests(payload.inviteRequests || []);
    }

    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchInviteRequests();
    });
  }, [fetchInviteRequests]);

  useEffect(() => {
    if (!recentlyMovedRequestId) return;

    const timer = window.setTimeout(() => {
      setRecentlyMovedRequestId(null);
    }, 1400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [recentlyMovedRequestId]);

  const newRequests = useMemo(
    () => inviteRequests.filter((request) => request.status === "pending"),
    [inviteRequests],
  );

  const previousRequests = useMemo(
    () => inviteRequests.filter((request) => request.status !== "pending"),
    [inviteRequests],
  );

  function updateInviteRequest(id, updates) {
    setInviteRequests((current) =>
      current.map((request) => (request.id === id ? { ...request, ...updates } : request)),
    );
  }

  async function withSession(run) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setActionError("Session expired. Please sign in again.");
      return;
    }

    await run(session.access_token);
  }

  async function handleApprove(requestId) {
    setActionError("");
    setActiveRequestId(requestId);
    setActiveAction("approve");

    await withSession(async (token) => {
      const response = await fetch(`/api/admin/invite-requests/${requestId}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json();
      if (!response.ok) {
        setActionError(payload?.error || "Failed to approve invite request.");
        return;
      }

      updateInviteRequest(requestId, {
        status: "approved",
        reviewed_at: new Date().toISOString(),
        review_note: null,
      });
      setRecentlyMovedRequestId(requestId);
      setDenyOpenRequestId((current) => (current === requestId ? null : current));
    });

    setActiveRequestId(null);
    setActiveAction(null);
  }

  async function handleResend(requestId) {
    setActionError("");
    setActiveRequestId(requestId);
    setActiveAction("resend");

    await withSession(async (token) => {
      const response = await fetch(`/api/admin/invite-requests/${requestId}/resend-link`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json();
      if (!response.ok) {
        setActionError(payload?.error || "Failed to resend sign-in link.");
      }
    });

    setActiveRequestId(null);
    setActiveAction(null);
  }

  async function handleDenyOpen(requestId) {
    setActionError("");
    if (denyOpenRequestId === requestId) {
      setDenyOpenRequestId(null);
      setDenyReason("");
      return;
    }

    setDenyOpenRequestId(requestId);
    setDenyReason("");
  }

  async function handleConfirmDeny(requestId) {
    setActionError("");

    const reason = denyReason.trim();
    if (!reason) {
      setActionError("Please enter a reason before denying this request.");
      return;
    }

    setActiveRequestId(requestId);
    setActiveAction("deny");

    await withSession(async (token) => {
      const response = await fetch(`/api/admin/invite-requests/${requestId}/deny`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setActionError(payload?.error || "Failed to deny invite request.");
        return;
      }

      updateInviteRequest(requestId, {
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        review_note: reason,
      });
      setRecentlyMovedRequestId(requestId);
      setDenyOpenRequestId(null);
      setDenyReason("");
    });

    setActiveRequestId(null);
    setActiveAction(null);
  }

  async function handleDelete(requestId) {
    setActionError("");
    setActiveRequestId(requestId);
    setActiveAction("delete");

    await withSession(async (token) => {
      const response = await fetch(`/api/admin/invite-requests/${requestId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json();
      if (!response.ok) {
        setActionError(payload?.error || "Failed to delete invite request.");
        return;
      }

      setInviteRequests((current) => current.filter((request) => request.id !== requestId));
    });

    setActiveRequestId(null);
    setActiveAction(null);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <motion.button
        onClick={onBack}
        className="mb-8 text-gray-400 hover:text-white transition-colors relative group inline-block"
        whileHover={{ x: -5 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="inline-block" aria-hidden="true">{"\u2190"}</span>
        <span className="ml-2">back</span>
      </motion.button>

      <div className="mb-8">
        <h2 className="text-3xl md:text-4xl mb-3">admin</h2>
        <p className="text-gray-400">manage invite pipeline</p>
      </div>

      {isLoading && <p className="text-gray-400">loading invite requests...</p>}

      {!isLoading && error && (
        <p role="alert" className="text-red-400 border border-red-500/40 bg-red-500/10 px-4 py-3">
          {error}
        </p>
      )}

      {!isLoading && !error && actionError && (
        <p role="alert" className="mb-4 text-red-400 border border-red-500/40 bg-red-500/10 px-4 py-3">
          {actionError}
        </p>
      )}

      {!isLoading && !error && (
        <LayoutGroup>
          <div className="grid gap-6">
            <section className="border border-white/15 bg-black/40 p-5 md:p-6 backdrop-blur-sm">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg md:text-xl tracking-wide lowercase">new requests</h3>
                <span className="text-xs text-gray-400 border border-white/20 px-2 py-1">{newRequests.length}</span>
              </div>

              {newRequests.length === 0 ? (
                <p className="text-sm text-gray-500">no new requests right now.</p>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {newRequests.map((request) => {
                      const isBusy = activeRequestId === request.id;
                      const isDenyOpen = denyOpenRequestId === request.id;

                      return (
                        <motion.div
                          key={request.id}
                          layout
                          layoutId={`invite-request-${request.id}`}
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.28 }}
                          className="border border-white/20 bg-gradient-to-br from-white/[0.07] via-white/[0.01] to-transparent p-5"
                        >
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
                            <div>
                              <p className="text-white">{request.email}</p>
                              <p className="text-xs text-gray-400">{new Date(request.created_at).toLocaleString()}</p>
                            </div>
                            <span className="text-[11px] uppercase tracking-[0.18em] border border-amber-300/40 px-2 py-1 text-amber-200 w-fit">
                              pending
                            </span>
                          </div>

                          <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{request.message}</p>

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <motion.button
                              onClick={() => handleApprove(request.id)}
                              disabled={isBusy}
                              className="border border-white/40 px-4 py-2 text-sm hover:border-white/70 hover:bg-white/10 transition-all duration-300 disabled:opacity-60"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              {isBusy && activeAction === "approve" ? "sending invite..." : "accept"}
                            </motion.button>

                            <motion.button
                              onClick={() => handleDenyOpen(request.id)}
                              disabled={isBusy && activeAction !== "deny"}
                              className="border border-red-500/50 px-4 py-2 text-sm text-red-300 hover:border-red-400 hover:bg-red-500/10 transition-all duration-300 disabled:opacity-60 inline-flex items-center gap-2"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              deny
                              <ChevronDown size={14} className={`transition-transform ${isDenyOpen ? "rotate-180" : ""}`} />
                            </motion.button>
                          </div>

                          <AnimatePresence>
                            {isDenyOpen && (
                              <motion.div
                                initial={{ opacity: 0, height: 0, y: -4 }}
                                animate={{ opacity: 1, height: "auto", y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -4 }}
                                transition={{ duration: 0.22 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-3 border border-red-500/35 bg-red-950/20 p-3">
                                  <label htmlFor={`deny-reason-${request.id}`} className="block text-xs text-red-200 mb-2 tracking-wide">
                                    denial reason (emailed to requester)
                                  </label>
                                  <textarea
                                    id={`deny-reason-${request.id}`}
                                    value={denyReason}
                                    onChange={(event) => setDenyReason(event.target.value)}
                                    rows={3}
                                    maxLength={1200}
                                    className="w-full bg-black/60 border border-red-500/30 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-red-400"
                                    placeholder="explain why this request was declined"
                                  />
                                  <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <motion.button
                                      onClick={() => handleConfirmDeny(request.id)}
                                      disabled={isBusy}
                                      className="border border-red-500/60 px-3 py-2 text-sm text-red-300 hover:border-red-400 hover:bg-red-500/10 transition-all disabled:opacity-60"
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                    >
                                      {isBusy && activeAction === "deny" ? "denying..." : "confirm deny"}
                                    </motion.button>
                                    <button
                                      onClick={() => {
                                        setDenyOpenRequestId(null);
                                        setDenyReason("");
                                      }}
                                      className="px-3 py-2 text-xs text-gray-400 hover:text-white transition-colors"
                                    >
                                      cancel
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </section>

            <section className="border border-white/15 bg-black/40 p-5 md:p-6 backdrop-blur-sm">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg md:text-xl tracking-wide lowercase">previous requests</h3>
                <span className="text-xs text-gray-400 border border-white/20 px-2 py-1">{previousRequests.length}</span>
              </div>

              {previousRequests.length === 0 ? (
                <p className="text-sm text-gray-500">handled requests will appear here.</p>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {previousRequests.map((request) => {
                      const isBusy = activeRequestId === request.id;
                      const statusLabel = request.status || "handled";
                      const isApproved = request.status === "approved";
                      const wasRecentlyMoved = recentlyMovedRequestId === request.id;

                      return (
                        <motion.div
                          key={request.id}
                          layout
                          layoutId={`invite-request-${request.id}`}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.28 }}
                          className={`border p-5 ${
                            wasRecentlyMoved
                              ? "border-emerald-400/60 bg-emerald-500/10"
                              : "border-white/20 bg-gradient-to-br from-white/[0.06] via-white/[0.01] to-transparent"
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
                            <div>
                              <p className="text-white">{request.email}</p>
                              <p className="text-xs text-gray-400">requested {new Date(request.created_at).toLocaleString()}</p>
                              {request.reviewed_at && (
                                <p className="text-xs text-gray-500">reviewed {new Date(request.reviewed_at).toLocaleString()}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[11px] uppercase tracking-[0.18em] border border-white/20 px-2 py-1 text-gray-200 w-fit">
                                {statusLabel}
                              </span>
                              <motion.button
                                onClick={() => handleDelete(request.id)}
                                disabled={isBusy}
                                className="w-9 h-9 inline-flex items-center justify-center border border-red-500/50 text-red-400 hover:text-red-300 hover:bg-red-500/10 hover:border-red-400 transition-all disabled:opacity-60"
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                aria-label={`Delete request from ${request.email}`}
                                title="delete request"
                              >
                                <Trash2 size={15} />
                              </motion.button>
                            </div>
                          </div>

                          <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{request.message}</p>

                          {request.review_note && (
                            <div className="mt-3 border border-red-500/25 bg-red-500/10 px-3 py-2">
                              <p className="text-xs text-red-200 mb-1 tracking-wide">deny note</p>
                              <p className="text-sm text-red-100 whitespace-pre-wrap">{request.review_note}</p>
                            </div>
                          )}

                          {isApproved && (
                            <div className="mt-4">
                              <motion.button
                                onClick={() => handleResend(request.id)}
                                disabled={isBusy}
                                className="border border-white/40 px-4 py-2 text-sm hover:border-white/70 hover:bg-white/10 transition-all duration-300 disabled:opacity-60"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                {isBusy && activeAction === "resend" ? "resending..." : "resend sign-in link"}
                              </motion.button>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </section>
          </div>
        </LayoutGroup>
      )}
    </motion.div>
  );
}
