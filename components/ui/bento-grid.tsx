import type { ComponentType, ReactNode } from "react";
import { ArrowRightIcon } from "@radix-ui/react-icons";

import { cn } from "@/lib/utils";

const BentoGrid = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return <div className={cn("bento-grid", className)}>{children}</div>;
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  children,
}: {
  name: string;
  className: string;
  background: ReactNode;
  Icon: ComponentType<{ className?: string }>;
  description: string;
  href: string;
  cta: string;
  children?: ReactNode;
}) => (
  <div key={name} className={cn("bento-card", className)}>
    <div>{background}</div>
    <div className="bento-card-content">
      <Icon className="bento-card-icon" />
      <h3>{name}</h3>
      <p>{description}</p>
      {children ? <div className="bento-card-children">{children}</div> : null}
    </div>

    <div className="bento-card-cta-wrap">
      <a href={href} className="bento-card-cta">
        {cta}
        <ArrowRightIcon className="bento-card-cta-icon" />
      </a>
    </div>
    <div className="bento-card-overlay" />
  </div>
);

export { BentoCard, BentoGrid };
