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
}
