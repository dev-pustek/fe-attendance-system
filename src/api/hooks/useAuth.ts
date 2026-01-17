import { useMutation, useQuery } from "@tanstack/react-query";
import { authService } from "../services/authService";
import { LoginDto, StudentLoginDto } from "../types";

export const useLogin = () => {
  return useMutation({
    mutationFn: (data: LoginDto & { password: string }) => 
      authService.login(data.email, data.password),
  });
};

export const useStudentLogin = () => {
  return useMutation({
    mutationFn: (data: StudentLoginDto) => 
      authService.studentLogin(data.nis, data.password),
  });
};

export const useLogout = () => {
  return useMutation({
    mutationFn: () => authService.logout(),
  });
};

export const useMe = (enabled = true) => {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authService.me(),
    enabled,
  });
};
