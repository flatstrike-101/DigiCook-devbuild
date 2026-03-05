import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type UserAvatarProps = {
  photoURL?: string | null;
  username?: string | null;
  fullName?: string | null;
  className?: string;
  fallbackClassName?: string;
};

function getInitial(fullName?: string | null, username?: string | null) {
  const nameValue = (fullName || "").trim();
  if (nameValue) return nameValue[0].toUpperCase();

  const value = (username || "").trim().replace(/^@/, "");
  if (!value) return "?";
  return value[0].toUpperCase();
}

export default function UserAvatar({
  photoURL,
  username,
  fullName,
  className = "h-10 w-10",
  fallbackClassName = "text-sm font-semibold",
}: UserAvatarProps) {
  return (
    <Avatar className={className}>
      {photoURL ? <AvatarImage src={photoURL} alt={`${username || "user"} avatar`} /> : null}
      <AvatarFallback className={fallbackClassName}>{getInitial(fullName, username)}</AvatarFallback>
    </Avatar>
  );
}
