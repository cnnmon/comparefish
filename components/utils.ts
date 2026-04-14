export function getUserName({ id, name, getFirst }: { id: string; name: string, getFirst?: boolean }) {
  if (!name) {
    return id?.slice(0, 4) ?? "Anonymous";
  }
  
  return getFirst ? name.split(" ")[0] : name;
}

export function formatLabel(p: {
  name?: string;
  xLabelLeft?: string;
  xLabelRight?: string;
  yLabelTop?: string;
  yLabelBottom?: string;
}) {
  if (p.name) return p.name;
  const x = [p.xLabelLeft, p.xLabelRight].filter(Boolean).join(" ↔ ");
  const y = [p.yLabelTop, p.yLabelBottom].filter(Boolean).join(" ↕ ");
  return `${y} × ${x}`;
}
