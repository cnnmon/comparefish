"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AVATARS, avatarUrl } from "../Chart/utils";
import Image from "next/image";
import { Modal } from "../Modal";
import { twMerge } from "tailwind-merge";
import { useEffect, useState } from "react";

export function AvatarPicker({
  open,
  onClose,
  current,
}: {
  open: boolean;
  onClose: () => void;
  current: string | undefined;
}) {
  const [list, setList] = useState(AVATARS);

  useEffect(() => {
    // Randomize list
    setList((prevList) => {
      // Create a shallow copy
      const shuffled = [...prevList];
      // Fisher-Yates shuffle
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }, []);

  const setAvatar = useMutation(api.users.setAvatar);
  return (
    <Modal open={open} onClose={onClose} title="Choose your fish">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {list.map((key: string) => (
          <button
            key={key}
            type="button"
            onClick={async () => {
              await setAvatar({ avatar: key });
              onClose();
            }}
            className={twMerge(
              `flex items-center justify-center rounded-lg transition-colors duration-100`,
              current === key && "bg-[var(--foreground)]!",
            )}
          >
            <Image
              src={avatarUrl(key)}
              alt={key}
              width={100}
              height={100}
              className="rounded-lg object-cover scale-140 hover:scale-180 transition-all duration-300"
            />
          </button>
        ))}
      </div>
    </Modal>
  );
}
