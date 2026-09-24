type FilterOption = {
  value: string;
  label: string;
};

type AdminFilterBarProps = {
  ariaLabel: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  primaryCount?: number;
};

export function AdminFilterBar({
  ariaLabel,
  options,
  value,
  onChange,
  primaryCount = 3,
}: AdminFilterBarProps) {
  const primaryOptions = options.slice(0, primaryCount);
  const overflowOptions = options.slice(primaryCount);
  const overflowValue = overflowOptions.some((option) => option.value === value) ? value : "";

  return (
    <div className="admin-filter-bar" aria-label={ariaLabel}>
      <div className="admin-filter-primary" role="group" aria-label={ariaLabel}>
        {primaryOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`admin-filter-chip ${value === option.value ? "active" : ""}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {overflowOptions.length > 0 && (
        <label className={`admin-filter-more ${overflowValue ? "active" : ""}`}>
          <span className="sr-only">Meer filters</span>
          <select value={overflowValue} onChange={(event) => onChange(event.target.value)}>
            <option value="">Meer</option>
            {overflowOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}