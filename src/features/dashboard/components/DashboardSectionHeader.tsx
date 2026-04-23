import { Link } from "react-router-dom";

type DashboardSectionHeaderProps = {
  title?: string;
  actionLabel?: string;
  actionTo?: string;
};

export default function DashboardSectionHeader({
  title,
  actionLabel,
  actionTo,
}: DashboardSectionHeaderProps) {
  const hasTitle = typeof title === "string";

  return (
    <>
      {hasTitle ? <h2>{title}</h2> : null}
      {actionLabel && actionTo ? (
        <Link to={actionTo} className="db-tit-btn">
          {actionLabel}
        </Link>
      ) : null}
    </>
  );
}
