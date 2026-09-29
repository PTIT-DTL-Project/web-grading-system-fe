import { useTranslation } from 'react-i18next'
import { ComingSoon } from '../../shared/ui/ComingSoon'

/** Phase 5 replaces this with the enrolled-class list (GET /api/v1/student/classes). */
export function StudentClassesPage() {
  const { t } = useTranslation()
  return <ComingSoon title={t('nav.studentClasses')} />
}
