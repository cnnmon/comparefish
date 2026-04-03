import { Id } from "@/convex/_generated/dataModel";

export const AVATARS = Array.from(
  { length: 37 },
  (_, i) => `fish-${i + 1}`,
) as readonly string[];

export type AvatarKey = string;

export function avatarUrl(key: string): string {
  return `/assets/fish/${key}.png`;
}

export function resolveAvatar(
  name: string | null | undefined,
  avatar: string | null | undefined,
): string {
  if (avatar) return avatar;
  const hash =
    name?.split("").reduce((acc: number, char: string) => {
      return acc + char.charCodeAt(0);
    }, 0) ?? 0;
  return `fish-${hash % AVATARS.length}`;
}

export function resolveImage({
  name,
  avatar,
}: {
  name: string | null | undefined;
  avatar: string | null | undefined;
}): string | null {
  return avatarUrl(resolveAvatar(name, avatar));
}

export const COLORS = [
  "#f87171",
  "#fb923c",
  "#fbbf24",
  "#a3e635",
  "#34d399",
  "#22d3ee",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#e879f9",
];

export function nameToColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export type Point = { x: number; y: number };

export type AxisLabels = {
  xLabelLeft?: string;
  xLabelRight?: string;
  yLabelTop?: string;
  yLabelBottom?: string;
};

// Non-null when exactly one X and one Y label are set (single quadrant visible)
export type QuadrantMode = { signX: 1 | -1; signY: 1 | -1 };

export function getQuadrantMode(labels: AxisLabels): QuadrantMode | null {
  const xCount = (labels.xLabelLeft ? 1 : 0) + (labels.xLabelRight ? 1 : 0);
  const yCount = (labels.yLabelTop ? 1 : 0) + (labels.yLabelBottom ? 1 : 0);
  if (xCount === 1 && yCount === 1) {
    return {
      signX: labels.xLabelRight ? 1 : -1,
      signY: labels.yLabelTop ? 1 : -1,
    };
  }
  return null;
}

const MARGIN = 6;
const RANGE = 100 - 2 * MARGIN; // 88

export const toPos = (p: Point, qm?: QuadrantMode | null) => {
  if (qm) {
    return {
      left: 50 - qm.signX * (50 - MARGIN) + p.x * RANGE,
      top: 50 + qm.signY * (50 - MARGIN) - p.y * RANGE,
    };
  }
  return {
    left: 50 + p.x * 44,
    top: 50 - p.y * 44,
  };
};

export type PlacedPoint = Point & {
  _id: string;
  userId: Id<"users">;
  name: string;
  image: string | null;
  avatar: string | null;
  isMe: boolean;
};

export type Fix = Point & {
  _id: Id<"fixes">;
  fixerId: Id<"users">;
  targetUserId: Id<"users">;
  targetName: string;
  targetImage: string | null;
  targetAvatar: string | null;
  fixerName: string;
  isMine: boolean;
};
