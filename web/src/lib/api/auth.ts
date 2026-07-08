import { apiClient } from "./client";

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: "USER" | "ADMIN";
    createdAt: string;
  };
}

export const authApi = {
  register: (data: { email: string; password: string; name?: string }) =>
    apiClient.post<AuthResponse>("/auth/register", data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<AuthResponse>("/auth/login", data).then((r) => r.data),

  me: () =>
    apiClient.get<AuthResponse["user"]>("/auth/me").then((r) => r.data),

  forgotPassword: (email: string) =>
    apiClient.post("/auth/forgot-password", { email }).then((r) => r.data),

  resetPassword: (data: { token: string; password: string }) =>
    apiClient.post("/auth/reset-password", data).then((r) => r.data),
};
