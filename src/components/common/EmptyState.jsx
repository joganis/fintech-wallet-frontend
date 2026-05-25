export default function EmptyState({ title, description, action }) {
  return (
    <div className="text-center py-16">
      <p className="text-gray-400 text-4xl mb-3">○</p>
      <h3 className="text-gray-700 font-medium mb-1">{title}</h3>
      <p className="text-gray-400 text-sm mb-4">{description}</p>
      {action}
    </div>
  )
}
