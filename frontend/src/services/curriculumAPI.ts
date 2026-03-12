import { api } from './auth';
import {
  CurriculumListItem,
  CurriculumTree,
  CurriculumProgress,
  UnlockedCourses,
} from '@/types';

export class CurriculumAPI {
  static async listCurricula(universityId?: number): Promise<CurriculumListItem[]> {
    const params = universityId ? { university_id: universityId } : {};
    const response = await api.get('/api/curricula', { params });
    return response.data;
  }

  static async getCurriculumTree(curriculumId: number): Promise<CurriculumTree> {
    const response = await api.get(`/api/curricula/${curriculumId}`);
    return response.data;
  }

  static async getProgress(curriculumId: number): Promise<CurriculumProgress> {
    const response = await api.get(`/api/curricula/${curriculumId}/progress`);
    return response.data;
  }

  static async updateCourseStatus(
    curriculumId: number,
    curriculumCourseId: number,
    status: string
  ): Promise<{ curriculum_course_id: number; status: string; completed_at: string | null }> {
    const response = await api.post(`/api/curricula/${curriculumId}/progress`, {
      curriculum_course_id: curriculumCourseId,
      status,
    });
    return response.data;
  }

  static async bulkUpdateStatus(
    curriculumId: number,
    updates: { curriculum_course_id: number; status: string }[]
  ): Promise<{ curriculum_course_id: number; status: string }[]> {
    const response = await api.post(`/api/curricula/${curriculumId}/progress/bulk`, {
      updates,
    });
    return response.data;
  }

  static async getUnlockedCourses(curriculumId: number): Promise<UnlockedCourses> {
    const response = await api.get(`/api/curricula/${curriculumId}/unlocked`);
    return response.data;
  }

  static async setUserCurriculum(curriculumId: number | null): Promise<void> {
    await api.put('/api/curricula/user/curriculum', {
      curriculum_id: curriculumId,
    });
  }

  static async getPlanningData(curriculumId: number): Promise<{
    planned_periods: Record<number, string>;
    elective_links: Record<number, number>;
  }> {
    const response = await api.get(`/api/curricula/${curriculumId}/planning`);
    return response.data;
  }

  static async updatePlanningData(
    curriculumId: number,
    plans: { curriculum_course_id: number; planned_period: string | null }[],
    electiveLinks: { curriculum_course_id: number; linked_course_id: number | null }[]
  ): Promise<{
    planned_periods: Record<number, string>;
    elective_links: Record<number, number>;
  }> {
    const response = await api.post(`/api/curricula/${curriculumId}/planning`, {
      plans,
      elective_links: electiveLinks,
    });
    return response.data;
  }
}
