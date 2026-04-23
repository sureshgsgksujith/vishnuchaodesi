type DashboardSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function DashboardSearchField({
  value,
  onChange,
  placeholder = "Search this page..",
}: DashboardSearchFieldProps) {
  return (
    <div className="ad-int-sear">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
