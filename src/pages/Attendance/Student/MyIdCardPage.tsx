import { useAuthStore } from "../../../store/authStore";
import PageMeta from "../../../components/atoms/PageMeta";
import StudentIdCardSection from "../../../components/organisms/Dashboard/Student/StudentIdCardSection";

export default function MyIdCardPage() {
    const { user } = useAuthStore();

    return (
        <div className="space-y-6">
            <PageMeta title="My ID Card | SIAPUS" description="View and download your student ID card" />
            
            <div>
                 <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">My ID Card</h1>
                 <p className="text-sm text-gray-500 dark:text-gray-400">Digital Student Identity Card</p>
            </div>

            <StudentIdCardSection user={user} />
        </div>
    );
}
