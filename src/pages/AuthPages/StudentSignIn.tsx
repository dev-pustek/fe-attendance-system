import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useStudentLogin } from "../../api/hooks/useAuth";
import { showSuccess, showError } from "../../utils/toast";
import { EyeCloseIcon, EyeIcon, ChevronLeftIcon, GridIcon, DownloadIcon } from "../../components/atoms/Icons";
import PageMeta from "../../components/atoms/PageMeta";
import FormInput from "../../components/molecules/FormInput";
import NumberInput from "../../components/atoms/NumberInput";
import Button from "../../components/atoms/Button";
import { motion } from "framer-motion";
import { usePWAInstall } from "../../hooks/usePWAInstall";

const loginSchema = z.object({
  nis: z.string().min(1, "NIS is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function StudentSignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const loginMutation = useStudentLogin();
  const { isInstallable, install } = usePWAInstall();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      nis: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await loginMutation.mutateAsync(data);
      showSuccess("Welcome, Student! Login successful.");
      navigate("/student/my-schedule"); 
    } catch (err: unknown) {
      showError(err, "Login failed. Please check your credentials.");
    }
  };

  return (
    <>
      <PageMeta title="Student Portal | Login" description="Access your student dashboard." />
      
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
        
        {/* Floating Academic Icons (Subtle Decoration) */}
        <motion.div 
            animate={{ y: [0, -10, 0], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[15%] left-[10%] text-brand-500 hidden md:block"
        >
            <GridIcon className="size-12" />
        </motion.div>
        <motion.div 
            animate={{ y: [0, 15, 0], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-[20%] right-[15%] text-orange-500 hidden md:block"
        >
            <div className="size-16 rounded-2xl border-4 border-current opacity-20 rotate-12" />
        </motion.div>

        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-[32px] shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden relative z-10"
        >
            {/* Header / Brand */}
            <div className="pt-12 pb-8 px-8 text-center bg-gradient-to-b from-brand-50/50 dark:from-brand-900/10 to-transparent">
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white dark:bg-gray-700 shadow-xl shadow-brand-500/10 border border-gray-100 dark:border-white/10 group">
                    <img 
                        src="/logo-pwa.png" 
                        alt="Visia" 
                        className="w-12 h-12 object-contain group-hover:scale-110 transition-transform duration-500" 
                    />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight font-outfit">
                    Student Portal
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
                    Access your classes & attendance
                </p>
            </div>

            <div className="px-8 pb-12">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    
                    {/* NIS Input using NumberInput */}
                    <Controller
                        name="nis"
                        control={control}
                        render={({ field }) => (
                            <NumberInput
                                label="NIS (Student ID)"
                                placeholder="Enter your NIS"
                                value={field.value}
                                onChange={field.onChange}
                                error={errors.nis?.message}
                                required
                            />
                        )}
                    />

                    {/* Password Input */}
                    <div className="relative">
                        <FormInput
                            label="Password (Birth Date)"
                            type={showPassword ? "text" : "password"}
                            placeholder="DDMMYYYY (e.g., 01042004)"
                            {...register("password")}
                            error={errors.password?.message}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-[42px] text-gray-400 hover:text-brand-500 transition-colors"
                        >
                            {showPassword ? <EyeIcon className="size-5" /> : <EyeCloseIcon className="size-5" />}
                        </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-4">
                        <Button
                            type="submit"
                            disabled={loginMutation.isPending}
                            className="w-full shadow-lg shadow-brand-500/25"
                        >
                            {loginMutation.isPending ? "Signing In..." : "Sign In"}
                        </Button>

                        {isInstallable && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={install}
                                className="w-full"
                                startIcon={<DownloadIcon className="size-5" />}
                            >
                                Install Application PWA
                            </Button>
                        )}
                    </div>
                </form>
                
                {/* Footer Links */}
                <div className="mt-5  border-gray-100 dark:border-white/5 text-center space-y-5">
                     <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        Forgot credentials? <a href="#" className="text-brand-500 hover:text-brand-600 font-bold">Contact Admin</a>
                     </p>
                </div>
            </div>
        </motion.div>
      </div>
    </>
  );
}
