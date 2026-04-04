import { useTranslation } from 'react-i18next'
import { Sprout, Calendar, Clock, Leaf, CheckCircle2 } from 'lucide-react'

function getGrowthStage(plantedDate) {
  if (!plantedDate) return { stage: 'unknown', progress: 0, daysElapsed: 0 }
  const planted = new Date(plantedDate)
  const now = new Date()
  const daysElapsed = Math.floor((now - planted) / (1000 * 60 * 60 * 24))

  if (daysElapsed < 0) return { stage: 'planned', progress: 0, daysElapsed: 0 }
  if (daysElapsed <= 7) return { stage: 'seedling', progress: 10, daysElapsed }
  if (daysElapsed <= 21) return { stage: 'vegetative', progress: 30, daysElapsed }
  if (daysElapsed <= 45) return { stage: 'growing', progress: 55, daysElapsed }
  if (daysElapsed <= 70) return { stage: 'flowering', progress: 75, daysElapsed }
  if (daysElapsed <= 90) return { stage: 'fruiting', progress: 90, daysElapsed }
  return { stage: 'harvest', progress: 100, daysElapsed }
}

const stageConfig = {
  planned: { color: 'text-gray-500 bg-gray-50 border-gray-200', icon: Calendar },
  seedling: { color: 'text-lime-600 bg-lime-50 border-lime-200', icon: Sprout },
  vegetative: { color: 'text-green-600 bg-green-50 border-green-200', icon: Leaf },
  growing: { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: Sprout },
  flowering: { color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: Sprout },
  fruiting: { color: 'text-orange-600 bg-orange-50 border-orange-200', icon: Sprout },
  harvest: { color: 'text-amber-600 bg-amber-50 border-amber-200', icon: CheckCircle2 },
  unknown: { color: 'text-gray-500 bg-gray-50 border-gray-200', icon: Sprout },
}

export default function CropStatusPanel({ crops, editCrop, onEditCropChange, onAddCrop, onRemoveCrop, saving }) {
  const { t } = useTranslation()

  const addCropForm = onAddCrop ? (
    <div className="flex gap-2 mt-3">
      <input
        className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder={t('demandIntel.crop')}
        value={editCrop?.crop || ''}
        onChange={(e) => onEditCropChange?.({ ...editCrop, crop: e.target.value })}
      />
      <input
        type="date"
        className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        value={editCrop?.planted_date || ''}
        onChange={(e) => onEditCropChange?.({ ...editCrop, planted_date: e.target.value })}
      />
      <button
        onClick={onAddCrop}
        disabled={!editCrop?.crop || saving}
        className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        +
      </button>
    </div>
  ) : null

  if (!crops || crops.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <Sprout className="w-5 h-5 text-primary" />
          {t('farmMonitor.cropStatus')}
        </h3>
        <p className="text-muted-foreground text-sm mb-2">{t('farmMonitor.noCrops')}</p>
        {addCropForm}
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <Sprout className="w-5 h-5 text-primary" />
        {t('farmMonitor.cropStatus')}
      </h3>
      <div className="space-y-3">
        {crops.map((crop, i) => {
          const growth = getGrowthStage(crop.planted_date)
          const config = stageConfig[growth.stage] || stageConfig.unknown
          const StageIcon = config.icon

          return (
            <div
              key={i}
              className={`rounded-lg border p-4 ${config.color} animate-fade-in-up`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <StageIcon className="w-4 h-4" />
                  <span className="font-semibold text-sm">{crop.crop}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/60">
                    {t(`farmMonitor.stage_${growth.stage}`)}
                  </span>
                  {onRemoveCrop && (
                    <button
                      onClick={() => onRemoveCrop(i)}
                      className="text-xs opacity-60 hover:opacity-100 hover:text-red-600 transition-all"
                      title={t('common.delete')}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-white/40 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${growth.progress}%`,
                    backgroundColor: 'currentColor',
                    opacity: 0.6,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs opacity-80">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{crop.planted_date || '—'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{growth.daysElapsed} {t('farmMonitor.daysOld')}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {addCropForm}
    </div>
  )
}
