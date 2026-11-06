/**
 * components/PageHeader.jsx
 * Consistent command header with title, subtitle, and action buttons.
 */
export default function PageHeader({ title, subtitle, right }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-bold text-white tracking-wide">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-3">{right}</div>}
    </div>
  )
}
