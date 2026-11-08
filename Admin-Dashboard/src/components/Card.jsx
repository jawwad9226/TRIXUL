/**
 * components/Card.jsx
 * Standard dark slate card.
 */
export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-trixul-panel border border-slate-700 rounded-xl p-5 shadow-lg ${className}`}>
      {children}
    </div>
  )
}
