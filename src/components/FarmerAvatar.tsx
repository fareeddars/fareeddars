import { cn } from "@/lib/utils";

export function dynamicFarmerAvatar(name?: string | null): string {
  const seed = encodeURIComponent((name || "farmer").trim().toLowerCase());
  return `https://api.dicebear.com/7.x/personas/svg?seed=${seed}&backgroundType=gradientLinear&backgroundColor=b6e3f4,c0aede,ffd5dc,ffdfbf`;
}

interface Props {
  name?: string | null;
  photoUrl?: string | null;
  className?: string;
  alt?: string;
}

const FarmerAvatar = ({ name, photoUrl, className, alt }: Props) => {
  const src = photoUrl || dynamicFarmerAvatar(name);
  return (
    <div className={cn("shrink-0 overflow-hidden rounded-full bg-muted border border-border", className)}>
      <img
        src={src}
        alt={alt || name || "farmer"}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = dynamicFarmerAvatar(name);
        }}
      />
    </div>
  );
};

export default FarmerAvatar;
