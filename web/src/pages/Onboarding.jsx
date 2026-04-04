import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sprout, ArrowRight, Loader2 } from 'lucide-react'
import { createFarmer } from '../services/firebase'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function Onboarding() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', area_name: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = t('onboarding.required')
    if (!form.phone.trim()) errs.phone = t('onboarding.required')
    if (!form.area_name.trim()) errs.area_name = t('onboarding.required')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const farmerId = await createFarmer({
        name: form.name.trim(),
        phone: form.phone.trim(),
        area_name: form.area_name.trim(),
        language: i18n.language,
      })
      localStorage.setItem('agripulse-farmerId', farmerId)
      localStorage.setItem('agripulse-area', form.area_name.trim())
      navigate('/dashboard')
    } catch (err) {
      console.error('Registration error:', err)
      setErrors({ submit: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sprout className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">{t('onboarding.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('onboarding.subtitle')}</p>
          <div className="mt-3 flex justify-center">
            <LanguageSwitcher />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <InputField
            label={t('onboarding.name')}
            placeholder={t('onboarding.namePlaceholder')}
            value={form.name}
            onChange={handleChange('name')}
            error={errors.name}
          />
          <InputField
            label={t('onboarding.phone')}
            placeholder={t('onboarding.phonePlaceholder')}
            value={form.phone}
            onChange={handleChange('phone')}
            error={errors.phone}
            type="tel"
          />
          <InputField
            label={t('onboarding.area')}
            placeholder={t('onboarding.areaPlaceholder')}
            value={form.area_name}
            onChange={handleChange('area_name')}
            error={errors.area_name}
          />

          {errors.submit && (
            <p className="text-destructive text-sm">{errors.submit}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 px-4 rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {t('onboarding.submit')}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

function InputField({ label, error, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        className={`w-full px-4 py-2.5 rounded-xl border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
          error ? 'border-destructive' : 'border-input'
        }`}
        {...props}
      />
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
    </div>
  )
}
