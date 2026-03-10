export function getUserName({ id, name }: { id: string; name: string }) {
  if (!name) {
    return id?.slice(0, 4) ?? "Anonymous";
  }

  // Get first name
  const firstName = name.split(" ")[0];
  if (firstName) {
    return firstName;
  }

  return name;
}
