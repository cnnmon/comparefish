import { useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { api } from "../../convex/_generated/api";
import { AvatarPicker } from "./AvatarPicker";
import Image from "next/image";
import { resolveAvatar, resolveImage } from "../Chart/utils";
import { formatLabel } from "../utils";
import { Id } from "@/convex/_generated/dataModel";
import { Modal } from "../Modal";
import { useMutation } from "convex/react";
import { useChart } from "../Chart/ChartProvider";
import { getUserName } from "../utils";

export default function Shell({
  children,
  comparisonId,
}: {
  children: ReactNode;
  comparisonId: Id<"comparisons"> | null;
}) {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);
  const comparison = useQuery(
    api.comparisons.get,
    comparisonId ? { id: comparisonId } : "skip",
  );
  const togglePrivate = useMutation(api.comparisons.togglePrivate);
  const renameComparison = useMutation(api.comparisons.rename);
  const removeComparison = useMutation(api.comparisons.remove);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const chart = useChart();
  const locked = chart?.locked ?? false;
  const countdown = chart?.countdown ?? null;
  const fixTarget = chart?.fixTarget ?? null;
  const editingSelf = chart?.editingSelf ?? false;
  const myPlacement = chart?.myPlacement ?? null;

  useEffect(() => {
    if (shareOpen) setShareUrl(window.location.href);
  }, [shareOpen]);
  useEffect(() => {
    if (settingsOpen) setNameDraft(comparison?.name ?? "");
  }, [settingsOpen]);
  const isMine = comparison?.isMine ?? false;

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4">
      <div className="flex flex-col w-full absolute top-0 p-4">
        <div className="flex w-full items-center justify-between">
          <h1
            className="text-3xl font-semibold tracking-tight cursor-pointer"
            onClick={() => router.push("/explore")}
          >
            comparefish
          </h1>
          <div className="flex items-center gap-3">
            <p className="text-sm">
              {getUserName({
                id: user?._id ?? "unknown",
                name: user?.name ?? "",
              })}
            </p>
            <Image
              src={
                resolveImage({
                  name: user.name ?? "",
                  avatar: user.avatar,
                }) ?? ""
              }
              alt={user?.name || ""}
              width={32}
              height={32}
              className="rounded-full object-cover transition-opacity hover:opacity-80 cursor-pointer scale-180"
              onClick={() => setPickerOpen(!pickerOpen)}
            />
            <AvatarPicker
              open={pickerOpen}
              onClose={() => setPickerOpen(false)}
              current={resolveAvatar(user?.name, user?.avatar)}
            />
            <p>
              <a
                onClick={() => void signOut()}
                className="underline cursor-pointer hover:bg-[var(--foreground)] hover:text-black py-1"
              >
                Sign out
              </a>
            </p>
          </div>
        </div>
        {comparisonId && (
          <div className="flex w-full items-center gap-2">
            <div className="flex flex-col w-full">
              <p className="text-[var(--highlight)]">
                {comparison
                  ? `${formatLabel(comparison)} by ${getUserName({ id: comparison.creatorId ?? "", name: comparison.creatorName })}`
                  : "Loading..."}
                {isMine && (
                  <>
                    {" / "}
                    <a
                      className="underline cursor-pointer hover:bg-[var(--highlight)] hover:text-black py-1"
                      onClick={() => setSettingsOpen(true)}
                    >
                      Edit plot
                      {comparison?.private && (
                        <svg
                          className="inline-block h-3 w-3 ml-1 mb-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <rect
                            x="3"
                            y="11"
                            width="18"
                            height="11"
                            rx="2"
                            ry="2"
                          />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      )}
                    </a>
                  </>
                )}{" "}
                {countdown && (
                  <>
                    {" "}
                    /{" "}
                    <span className="text-[var(--highlight)] font-bold">
                      {countdown}
                    </span>
                  </>
                )}
              </p>

              <div className="italic text-white">
                {locked ? (
                  <p>
                    <span>This plot is locked.</span>
                  </p>
                ) : fixTarget ? (
                  <p className="text-[var(--highlight)]!">
                    <span>
                      Fixing <strong>{fixTarget.name}</strong>
                    </span>
                    <span>
                      {" "}
                      — click to place where you think they should be.
                    </span>
                  </p>
                ) : editingSelf ? (
                  <p>Click to place yourself.</p>
                ) : (
                  <p>
                    {myPlacement ? (
                      <>
                        Click on fish to fix their placements.{" "}
                        <a
                          className="underline cursor-pointer hover:bg-[var(--foreground)] hover:text-black py-1"
                          onClick={() => setShareOpen(true)}
                        >
                          Share
                        </a>{" "}
                        to collect more fish.
                      </>
                    ) : (
                      "Click to place yourself."
                    )}
                  </p>
                )}
              </div>
              <p>
                <a
                  className="underline cursor-pointer hover:bg-[var(--foreground)] hover:text-black py-1"
                  onClick={() => router.push("/explore")}
                >
                  More plots
                </a>
              </p>
            </div>
          </div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex w-full max-w-2xl flex-col items-center gap-6 px-0 sm:px-6 py-8 mt-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="flex flex-col items-center justify-center gap-2 w-full"
        >
          <Modal
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            title="Share link"
          >
            <div className="flex flex-col gap-3">
              <p>
                Invite friends to place themselves on this plot. Once they do,
                you can fix their placements!
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[var(--foreground)]"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </Modal>
          {isMine && comparisonId && (
            <Modal
              open={settingsOpen}
              onClose={() => setSettingsOpen(false)}
              title="Edit plot"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <span>Name</span>
                  <input
                    type="text"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={() =>
                      void renameComparison({
                        id: comparisonId,
                        name: nameDraft,
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    placeholder="Untitled plot"
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[var(--foreground)]"
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Visibility</span>
                  <button
                    type="button"
                    onClick={() => void togglePrivate({ id: comparisonId })}
                  >
                    {comparison?.private ? "Make public" : "Make private"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("Delete this comparison and all its data?"))
                      return;
                    await removeComparison({ id: comparisonId });
                    setSettingsOpen(false);
                    router.push("/");
                  }}
                  className="opacity-80 hover:opacity-100 border-red-500! text-red-500! hover:bg-red-500! hover:text-black!"
                >
                  Delete comparison
                </button>
              </div>
            </Modal>
          )}
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}
