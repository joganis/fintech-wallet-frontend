import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService } from '../../services/userService'
import { useAuthStore } from '../../store/authStore'
import Modal from '../../components/common/Modal'
import Spinner from '../../components/common/Spinner'

const LEVEL_STYLE = {
  BRONZE:   'bg-amber-100 text-amber-800',
  SILVER:   'bg-gray-100 text-gray-700',
  GOLD:     'bg-yellow-100 text-yellow-800',
  PLATINUM: 'bg-blue-100 text-blue-800',
}

export default function ProfilePage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { updateUser, logout } = useAuthStore()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saveError, setSaveError]         = useState('')
  const [saveOk, setSaveOk]               = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn:  () => userService.getProfile().then(r => r.data.data),
    staleTime: 0,
    refetchOnMount: true,
  })

  const [form, setForm] = useState(null)

  // Initialize form once profile loads
  if (profile && form === null) {
    setForm({ name: profile.name, phone: profile.phone || '' })
  }

  const updateMutation = useMutation({
    mutationFn: (data) => userService.updateProfile(data),
    onSuccess: (res) => {
      const updated = res.data.data
      updateUser(updated)
      qc.invalidateQueries({ queryKey: ['my-profile'] })
      setSaveOk(true)
      setSaveError('')
      setTimeout(() => setSaveOk(false), 3000)
    },
    onError: (e) => setSaveError(e.response?.data?.message || 'Error al guardar'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => userService.deleteAccount(),
    onSuccess: () => { logout(); navigate('/login') },
    onError: (e) => setSaveError(e.response?.data?.message || 'Error al eliminar cuenta'),
  })

  if (isLoading || !form) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>

  const handleSubmit = (e) => {
    e.preventDefault()
    setSaveError('')
    setSaveOk(false)
    if (!form.name.trim() || form.name.trim().length < 2) {
      setSaveError('El nombre debe tener al menos 2 caracteres')
      return
    }
    updateMutation.mutate({ name: form.name.trim(), phone: form.phone.trim() || null })
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1>My Profile</h1>

      {/* Info card */}
      <div className="card flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold select-none">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-lg">{profile.name}</p>
          <p className="text-sm text-gray-400">{profile.email}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${LEVEL_STYLE[profile.level] || ''}`}>
            {profile.level}
          </span>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-gray-400">Points</p>
          <p className="text-2xl font-bold text-gray-800">{profile.totalPoints.toLocaleString()}</p>
        </div>
      </div>

      {/* Edit form */}
      <div className="card">
        <h3 className="mb-4">Edit profile</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              className="input w-full"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              className="input w-full"
              value={form.phone}
              onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="Optional"
            />
          </div>

          {saveError && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{saveError}</p>}
          {saveOk    && <p className="text-green-700 text-sm bg-green-50 p-3 rounded-lg">Profile updated successfully</p>}

          <button type="submit" className="btn-primary w-full" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="card border border-red-200 bg-red-50">
        <h3 className="text-red-700 mb-1">Danger zone</h3>
        <p className="text-sm text-red-500 mb-4">
          Deleting your account is permanent and cannot be undone.
        </p>
        <button
          onClick={() => setConfirmDelete(true)}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Delete account
        </button>
      </div>

      {/* Delete confirmation modal */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete account">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to permanently delete your account? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Yes, delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
