import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, AlertCircle, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Brain, Shield } from 'lucide-react'

const severityConfig = {
  low: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', badge: 'bg-green-500/20 text-green-400' },
  medium: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', badge: 'bg-yellow-500/20 text-yellow-400' },
  high: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', badge: 'bg-red-500/20 text-red-400' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', badge: 'bg-yellow-500/20 text-yellow-400' },
  critical: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', badge: 'bg-red-500/20 text-red-400' },
  info: { icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', badge: 'bg-blue-500/20 text-blue-400' },
}

export default function HealthReport({ report }) {
  const { t } = useTranslation()
  const [expandedAlert, setExpandedAlert] = useState(null)

  if (!report) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          {t('farmMonitor.healthReport')}
        </h3>
        <p className="text-muted-foreground text-sm">{t('demandIntel.waitingData')}</p>
      </div>
    )
  }

  const alertCounts = { low: 0, medium: 0, high: 0 }
  report.alerts?.forEach((a) => { if (alertCounts[a.severity] != null) alertCounts[a.severity]++ })

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="pb-4 border-b border-border/50 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {t('farmMonitor.healthReport')}
          </h3>
          {report.alerts?.length > 0 && (
            <div className="flex items-center gap-2">
              {alertCounts.high > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                  {alertCounts.high} {t('farmMonitor.highAlerts')}
                </span>
              )}
              {alertCounts.medium > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                  {alertCounts.medium} {t('farmMonitor.mediumAlerts')}
                </span>
              )}
              {alertCounts.low > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                  {alertCounts.low} {t('farmMonitor.lowAlerts')}
                </span>
              )}
            </div>
          )}
        </div>

        {/* AI Analysis */}
        {report.ai_analysis && (
          <div className="bg-primary/5 rounded-lg p-4 flex gap-3">
            <Brain className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-primary mb-1">{t('farmMonitor.aiAnalysis')}</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{report.ai_analysis}</p>
            </div>
          </div>
        )}
      </div>

      {/* Alerts */}
      {report.alerts && report.alerts.length > 0 && (
        <div className="pt-4">
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-muted-foreground" />
            {t('farmMonitor.alerts')} ({report.alerts.length})
          </h4>
          <div className="space-y-2">
            {report.alerts.map((alert, i) => {
              const config = severityConfig[alert.severity] || severityConfig.low
              const AlertIcon = config.icon
              const isExpanded = expandedAlert === i

              return (
                <div
                  key={i}
                  className={`rounded-lg border overflow-hidden transition-colors ${config.bg}`}
                >
                  <button
                    onClick={() => setExpandedAlert(isExpanded ? null : i)}
                    className="w-full flex items-center justify-between p-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <AlertIcon className={`w-5 h-5 shrink-0 ${config.color}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-medium text-sm ${config.color}`}>{alert.zone}</p>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${config.badge}`}>
                            {alert.severity}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronUp className={`w-4 h-4 shrink-0 ${config.color}`} />
                      : <ChevronDown className={`w-4 h-4 shrink-0 ${config.color}`} />
                    }
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0">
                      <div className="pl-8">
                        <p className="text-sm text-foreground/80 leading-relaxed">{alert.message}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* No alerts */}
      {(!report.alerts || report.alerts.length === 0) && !report.ai_analysis && (
        <div className="py-5 text-center">
          <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t('farmMonitor.noAlerts')}</p>
        </div>
      )}
    </div>
  )
}
