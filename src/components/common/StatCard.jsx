export default function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = { blue:'text-blue-600', green:'text-green-600', amber:'text-amber-600', red:'text-red-600' }
  return (
    <div className="card">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${colors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}
