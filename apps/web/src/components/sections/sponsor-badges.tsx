import Image from "next/image";

interface SponsorBadgeProps {
  href: string;
  logoSrc: string;
  logoAlt: string;
  title: string;
  description: string;
  logoClassName?: string;
  isSvg?: boolean;
}

const SponsorBadge = ({
  href,
  logoSrc,
  logoAlt,
  title,
  description,
  logoClassName,
  isSvg = false,
}: SponsorBadgeProps) => {
  return (
    <a
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      className="border border-border bg-background text-card-foreground max-h-[calc(100vh-8rem)] flex flex-col p-2"
    >
      <div className="h-full bg-card rounded-none p-4 flex flex-col items-center justify-center text-center gap-2">
        <Image
          src={logoSrc}
          alt={logoAlt}
          width={32}
          height={32}
          className={logoClassName ?? ""}
          unoptimized={isSvg}
        />
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>
      </div>
    </a>
  );
};

export const PolarBadge = () => (
  <SponsorBadge
    href="https://polar.sh?utm_source=cursor.directory&utm_medium=website&utm_campaign=aug_2024"
    logoSrc="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/svgs/ads-polar-logo-1.svg"
    logoAlt="Polar logo"
    title="Polar"
    description="The fastest growing engine for SaaS & Digital Products"
    logoClassName="rounded-full"
    isSvg={true}
  />
);

export const BrainGridBadge = () => (
  <SponsorBadge
    href="https://braingrid.ai?utm_source=cursor.directory"
    logoSrc="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/svgs/ads-braingrid-logo-2.svg"
    logoAlt="BrainGrid logo"
    title="BrainGrid"
    description="Turn half-baked thoughts into crystal-clear, AI-ready specs and tasks that Cursor can nail, the first time"
    isSvg={true}
  />
);

export const EndgameBadge = () => (
  <SponsorBadge
    href="https://endgame.com?utm_source=cursor.directory"
    logoSrc="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_26.png"
    logoAlt="Endgame logo"
    title="Endgame"
    description="Let your AI deploy, validate and iterate endlessly."
  />
);