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

// Isometric 3D projection
const ISO_S = 36;
const ISO_COS = 0.866;

// Screen-space axis vectors (in chart %) for each dimension
export const ISO_AXES = [
  { x: ISO_S * ISO_COS, y: ISO_S * 0.5 },    // dim 0 → bottom-right
  { x: 0, y: -ISO_S },                         // dim 1 → up
  { x: -ISO_S * ISO_COS, y: ISO_S * 0.5 },    // dim 2 → bottom-left
];

export function toPos3D(values: number[]): { left: number; top: number } {
  let sx = 0, sy = 0;
  for (let i = 0; i < Math.min(values.length, 3); i++) {
    sx += (values[i] ?? 0) * ISO_AXES[i].x;
    sy += (values[i] ?? 0) * ISO_AXES[i].y;
  }
  return { left: 50 + sx, top: 50 + sy };
}

// Reverse isometric: screen % → active pair values (keeping fixed dim constant)
export function fromScreen3D(
  pctX: number, pctY: number,
  activePair: [number, number],
  fixedIdx: number, fixedVal: number,
): Point {
  const sx = (pctX - 0.5) * 100 - fixedVal * ISO_AXES[fixedIdx].x;
  const sy = (pctY - 0.5) * 100 - fixedVal * ISO_AXES[fixedIdx].y;
  const [a, b] = activePair;
  const det = ISO_AXES[a].x * ISO_AXES[b].y - ISO_AXES[a].y * ISO_AXES[b].x;
  return {
    x: Math.max(-1, Math.min(1, (sx * ISO_AXES[b].y - sy * ISO_AXES[b].x) / det)),
    y: Math.max(-1, Math.min(1, (ISO_AXES[a].x * sy - ISO_AXES[a].y * sx) / det)),
  };
}

export type Dimension = { negLabel: string; posLabel: string };

export function getDimensions(comparison: {
  xLabelLeft?: string;
  xLabelRight?: string;
  yLabelTop?: string;
  yLabelBottom?: string;
  dimensions?: Dimension[];
}): Dimension[] {
  if (comparison.dimensions && comparison.dimensions.length >= 1)
    return comparison.dimensions;
  return [
    { negLabel: comparison.xLabelLeft ?? "", posLabel: comparison.xLabelRight ?? "" },
    { negLabel: comparison.yLabelBottom ?? "", posLabel: comparison.yLabelTop ?? "" },
  ];
}

export function getDimensionPairs(n: number): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      pairs.push([i, j]);
  return pairs;
}

export function projectPoint(
  values: number[] | undefined,
  x: number, y: number,
  dimX: number, dimY: number,
): Point {
  if (values && values.length > Math.max(dimX, dimY))
    return { x: values[dimX], y: values[dimY] };
  if (dimX === 0 && dimY === 1) return { x, y };
  return { x: 0, y: 0 };
}

export type PlacedPoint = Point & {
  _id: string;
  userId: Id<"users">;
  name: string;
  image: string | null;
  avatar: string | null;
  isMe: boolean;
  values?: number[];
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
  values?: number[];
};
