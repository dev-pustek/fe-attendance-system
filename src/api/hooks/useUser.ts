import { useQuery } from "@tanstack/react-query";
import { userService } from "../services/userService";

export const useUser = (id: string | undefined) => {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => userService.getUser(id!),
    enabled: !!id,
  });
};
