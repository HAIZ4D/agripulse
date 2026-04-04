import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Megaphone, Send, Loader2, CheckCircle2, Clock, Users,
  Package, X, ChevronDown, ChevronUp, AlertCircle,
} from 'lucide-react'
import { createSurplusAlert, subscribeSurplusAlerts, getFarmer } from '../services/firebase'

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-600 bg-yellow-50', label: 'pending' },
  notified: { icon: CheckCircle2, color: 'text-green-600 bg-green-50', label: 'notified' },
  no_buyers: { icon: AlertCircle, color: 'text-gray-500 bg-gray-50', label: 'noBuyersFound' },
  no_matching_buyers: { icon: AlertCircle, color: 'text-orange-500 bg-orange-50', label: 'noMatchingBuyers' },
}

export default function SurplusAnnounce({ farmerId, farm, area }) {
  const { t } = useTranslation()
  const [showForm, setShowForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [crop, setCrop] = useState('')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState(null)
  const [history, setHistory] = useState([])
  const [farmerData, setFarmerData] = useState(null)

  const crops = farm?.current_crops || []

  // Load farmer data for name/phone
  useEffect(() => {
    if (!farmerId) return
    getFarmer(farmerId).then(setFarmerData)
  }, [farmerId])

  // Subscribe to surplus history
  useEffect(() => {
    if (!farmerId) return
    const unsub = subscribeSurplusAlerts(farmerId, setHistory)
    return unsub
  }, [farmerId])

  function showToastMsg(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!crop || !quantity || sending) return

    setSending(true)
    try {
      await createSurplusAlert({
        farmerId,
        farmerName: farmerData?.name || '',
        phone: farmerData?.phone || '',
        area: area || farmerData?.area_name || '',
        crop,
        quantityKg: parseFloat(quantity),
        notes,
      })
      showToastMsg(t('surplus.sent'))
      setCrop('')
      setQuantity('')
      setNotes('')
      setShowForm(false)
    } catch (err) {
      console.error('Surplus alert error:', err)
      showToastMsg(t('common.error'), 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in-right ${
          toast.type === 'error' ? 'bg-destructive text-destructive-foreground' : 'bg-green-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="pb-4 border-b border-border/50 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{t('surplus.title')}</h3>
            <p className="text-xs text-muted-foreground">{t('surplus.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              {t('surplus.history')} ({history.length})
            </button>
          )}
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors"
            >
              <Megaphone className="w-4 h-4" />
              {t('surplus.announce')}
            </button>
          )}
        </div>
      </div>

      {/* Announcement Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          {/* Crop Selection */}
          <div>
            <label className="block text-sm font-medium mb-1.5">{t('surplus.selectCrop')}</label>
            {crops.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {crops.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCrop(c.crop)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      crop === c.crop
                        ? 'bg-orange-500 text-white'
                        : 'bg-white border border-border hover:bg-orange-50'
                    }`}
                  >
                    {c.crop}
                  </button>
                ))}
              </div>
            )}
            <input
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
              placeholder={t('surplus.cropPlaceholder')}
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium mb-1.5">{t('surplus.quantity')}</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm pr-12"
                placeholder="e.g. 100"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">kg</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5">{t('surplus.notes')}</label>
            <input
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
              placeholder={t('surplus.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2 text-xs text-blue-700">
            <Users className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
            <span>{t('surplus.infoText')}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!crop || !quantity || sending}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? t('common.loading') : t('surplus.sendNotification')}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setCrop(''); setQuantity(''); setNotes('') }}
              className="px-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      {/* History */}
      {showHistory && history.length > 0 && (
        <div className="py-4 space-y-2">
          <h4 className="text-sm font-semibold mb-3">{t('surplus.recentAlerts')}</h4>
          {history.map((alert) => {
            const config = statusConfig[alert.status] || statusConfig.pending
            const StatusIcon = config.icon
            const createdAt = alert.created_at?.toDate?.()
            const dateStr = createdAt ? createdAt.toLocaleDateString() : '—'
            const timeStr = createdAt ? createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''

            return (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">{alert.crop} — {alert.quantity_kg} kg</p>
                    <p className="text-xs text-muted-foreground">{dateStr} {timeStr}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {alert.buyers_notified > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {alert.buyers_notified}
                    </span>
                  )}
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${config.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {t(`surplus.status_${config.label}`)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state when no form and no history */}
      {!showForm && !showHistory && history.length === 0 && (
        <div className="p-8 text-center">
          <Megaphone className="w-10 h-10 text-orange-300 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t('surplus.emptyState')}</p>
        </div>
      )}
    </div>
  )
}
