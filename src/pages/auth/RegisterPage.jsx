import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRegister } from '../../hooks/useAuth'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const { mutate, isPending, error } = useRegister()
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="card w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-1">Create account</h1>
        <p className="text-sm text-gray-500 mb-6">Start managing your digital wallets</p>
        {error && <p className="text-red-600 text-sm mb-4 bg-red-50 p-3 rounded-lg">
          {error.response?.data?.message || 'Registration failed'}
        </p>}
        <form onSubmit={e => { e.preventDefault(); mutate(form) }} className="space-y-4">
          {[['name','Name','text'],['email','Email','email'],['password','Password','password'],['phone','Phone (optional)','tel']].map(([k,l,t]) => (
            <div key={k}>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{l}</label>
              <input type={t} className="input" value={form[k]} onChange={set(k)} required={k !== 'phone'} />
            </div>
          ))}
          <button type="submit" className="btn-primary w-full" disabled={isPending}>
            {isPending ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="text-sm text-center text-gray-500 mt-4">
          Already have one? <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
