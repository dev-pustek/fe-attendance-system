import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { EyeCloseIcon, EyeIcon, DownloadIcon } from "../atoms/Icons";
import Button from "../atoms/Button";
import FormInput from "../molecules/FormInput";
import { useLogin } from "../../api/hooks/useAuth";
import { LoginDto } from "../../api/types";
import { showSuccess, showError } from "../../utils/toast";
import { usePWAInstall } from "../../hooks/usePWAInstall";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginDto) => {
    try {
      await loginMutation.mutateAsync(data);
      showSuccess("Login successful! Welcome back.");
      navigate("/");
    } catch (err: unknown) {
      showError(err, "Login failed. Please check your credentials.");
    }
  };

  return (
    <div className="flex w-full max-w-md flex-col justify-center mx-auto h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 text-center lg:text-left">
        <img src="/logo-pwa.png" alt="SIAPUS" className="w-24 h-auto mx-auto lg:mx-0 object-contain" />
        <h1 className="mb-1 text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
          Selamat Datang
        </h1>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
          Sistem Informasi Absensi Pustek
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-5">
          <FormInput
            label="Alamat Email"
            type="email"
            placeholder="info@gmail.com"
            required
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address",
              },
            })}
            error={errors.email?.message}
            className="transition-all focus:ring-2 focus:ring-brand-500/20"
          />

          <div className="relative">
            <FormInput
              label="Kata Sandi"
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan kata sandi Anda"
              required
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters",
                },
              })}
              error={errors.password?.message}
              className="transition-all focus:ring-2 focus:ring-brand-500/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-[34px] z-30 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeIcon className="size-5 fill-current" />
              ) : (
                <EyeCloseIcon className="size-5 fill-current" />
              )}
            </button>
          </div>
        </div>

        <Button 
          className="w-full py-3.5 text-base shadow-lg shadow-brand-500/25 transition-transform active:scale-[0.98]" 
          type="submit"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? "Sedang Masuk..." : "Masuk"}
        </Button>
      </form>

      <div className="mt-2">
        <InstallAppButton />
      </div>
    </div>
  );
}

const InstallAppButton = () => {
    const { isInstallable, install } = usePWAInstall();

    const handleInstallClick = () => {
      if (isInstallable) {
        install();
      } else {
        alert("Instalasi PWA tidak didukung di browser ini, atau aplikasi sudah terinstal. Pada iOS Safari, ketuk 'Bagikan' lalu 'Tambah ke Layar Utama'.");
      }
    };

    return (
        <Button
            type="button"
            onClick={handleInstallClick}
            variant="outline"
            className="w-full py-3 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
            startIcon={<DownloadIcon className="size-5" />}
        >
            Instal Aplikasi PWA
        </Button>
    )
}
