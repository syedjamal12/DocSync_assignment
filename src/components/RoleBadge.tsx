const styles: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-700",
  EDITOR: "bg-blue-100 text-blue-700",
  VIEWER: "bg-neutral-100 text-neutral-600",
};

export default function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[role] || styles.VIEWER}`}>
      {role.charAt(0) + role.slice(1).toLowerCase()}
    </span>
  );
}
