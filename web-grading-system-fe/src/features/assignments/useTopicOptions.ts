import { useQuery } from '@tanstack/react-query'
import { listAssignmentTopics, listAssignments } from '../../shared/api/endpoints/assignments'
import {
  listStudentAssignments,
  listStudentPracticeTopics,
} from '../../shared/api/endpoints/studentAssignments'
import type { AssignmentPurpose } from '../../shared/types/assignment'

export interface TopicOption {
  label: string
  value: string
}

export interface UseTopicOptionsParams {
  /** LECTURER reads the owner-scoped topics endpoint; STUDENT the published ones. */
  role: 'LECTURER' | 'STUDENT'
  purpose: AssignmentPurpose
  /**
   * When set, the options are derived from that class's own assignments instead of the
   * owner-wide topics endpoint: a topic that only exists in another class would filter
   * this table to zero rows.
   */
  classId?: string
}

function toOptions(topics: string[]): TopicOption[] {
  return [...new Set(topics.filter((topic) => !!topic && topic.trim() !== ''))]
    .sort((a, b) => a.localeCompare(b, 'vi'))
    .map((topic) => ({ label: topic, value: topic }))
}

/**
 * Options for the "topic" filter, so the filter is a pick-list of topics that actually
 * exist instead of a free-text box. The backend `topic` parameter is an **exact**
 * match (`lower(topic) = lower(:topic)`), so free text could never find
 * "quản lý sinh viên" by typing "quản lý" — the lecturer saw an empty table for a
 * topic that was right there. Selecting a real value makes that class of bug
 * impossible, and the picker inherits `FilterBar`'s type-to-filter.
 *
 * Review: 2026-11-12, lecturer report on the class Assignments tab.
 */
export function useTopicOptions({ role, purpose, classId }: UseTopicOptionsParams): {
  options: TopicOption[]
  loading: boolean
} {
  const { data = [], isLoading } = useQuery({
    queryKey: ['assignment-topics', role, purpose, classId ?? null],
    queryFn: () => {
      if (role === 'LECTURER') {
        // The owner topics endpoint is not class-scoped, so a class tab derives its
        // options from that class's assignments (same full-page read the student path
        // uses) to keep every option selectable-with-results.
        return classId
          ? listAssignments({ classId, purpose, page: 0, size: 1000 }).then((page) =>
              page.result.map((assignment) => assignment.topic),
            )
          : listAssignmentTopics(purpose)
      }
      // Students only have a practice-topics endpoint (published PRACTICE exercises).
      if (purpose === 'PRACTICE') {
        return listStudentPracticeTopics()
      }
      // Graded lists have no topics endpoint: read the same roster-style full page the
      // student assignment list already serves and derive the distinct topics from it,
      // so every option is a value the backend will match exactly.
      return listStudentAssignments(0, 1000, undefined, classId, 'GRADED').then((page) =>
        page.result.map((assignment) => assignment.topic),
      )
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  return { options: toOptions(data), loading: isLoading }
}
