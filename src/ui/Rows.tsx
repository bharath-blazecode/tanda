/** Label, dotted leader, bold value. */
export function Rows({ items }: { items: [label: string, value: string][] }) {
  return (
    <div className="k-rows">
      {items.map(([label, value], i) => (
        <div key={`${label}:${i}`}>
          <span>{label}</span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  )
}
