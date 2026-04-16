export function getUserName({ id, name, getFirst }: { id: string; name: string, getFirst?: boolean }) {
  if (!name) {
    return id?.slice(0, 4) ?? "Anonymous";
  }
  
  return getFirst ? name.split(" ")[0] : name;
}

export function formatLabel(p: {
  name?: string;
  shape?: string;
  xLabelLeft?: string;
  xLabelRight?: string;
  yLabelTop?: string;
  yLabelBottom?: string;
  dimensions?: { negLabel: string; posLabel: string }[];
}) {
  if (p.name) return p.name;
  if (p.dimensions && p.dimensions.length >= 3) {
    if (p.shape === "triangle") {
      return p.dimensions.map((d) => d.posLabel || d.negLabel).filter(Boolean).join(" × ");
    }
    const labels = p.dimensions.map((d) =>
      [d.negLabel, d.posLabel].filter(Boolean).join(" ↔ ")
    ).filter(Boolean);
    return labels.join(" × ");
  }
  const x = [p.xLabelLeft, p.xLabelRight].filter(Boolean).join(" ↔ ");
  const y = [p.yLabelTop, p.yLabelBottom].filter(Boolean).join(" ↕ ");
  return `${y} × ${x}`;
}
