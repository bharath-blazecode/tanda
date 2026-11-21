/** Label, dotted leader, bold value. */
export function Rows({ items }: { items: [label: string, value: string][] }) {
  return (
    <div className="k-rows">
      {items.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  );
}
