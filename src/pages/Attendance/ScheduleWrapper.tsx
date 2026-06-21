import { useAuthStore } from '../../store/authStore';
import TeacherSchedule from './Teacher/TeacherSchedule';
import StudentSchedule from './Student/StudentTodaySchedule';

const ScheduleWrapper = () => {
    const { user } = useAuthStore();
    /* console.log removed */
    /* console.log removed */
    const isStudent = user?.userTypes?.some(t => t.toLowerCase() === 'student') 
        || (user?.profile?.nis && user?.profile?.nis.length > 0)
        || user?.userTypes?.includes('Student');

    if (isStudent) {
        return <StudentSchedule />;
    }

    return <TeacherSchedule />;
};

export default ScheduleWrapper;
