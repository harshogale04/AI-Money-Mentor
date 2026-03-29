import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + "/api/v1",
  headers: { "Content-Type": "application/json" },
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgentResponse<T = any> {
  success: boolean;
  agent: string;
  data: T;
  message?: string;
  error?: string;
}

export interface UserProfile {
  user_id?: string;
  name: string;
  age: number;
  email: string;
  annual_income: number;
  monthly_expenses: number;
  risk_profile: "conservative" | "moderate" | "aggressive";
  tax_regime: "old" | "new";
  existing_investments?: number;
  goals?: FinancialGoal[];
}

export interface FinancialGoal {
  name: string;
  target_amount: number;
  target_year: number;
  priority?: "high" | "medium" | "low";
}

export interface HealthScoreInput {
  user_id?: string;
  monthly_income: number;
  monthly_expenses: number;
  emergency_fund: number;
  insurance_cover: number;
  total_debt_emi: number;
  investment_types: string[];
  retirement_corpus: number;
  age: number;
}

export interface TaxProfile {
  user_id?: string;
  gross_salary: number;
  hra_received?: number;
  deductions?: {
    section_80c?: number;
    section_80d?: number;
    section_80ccd?: number;
    hra_exemption?: number;
    standard_deduction?: number;
  };
}

export interface FIREInput {
  user_profile: UserProfile;
  target_retirement_age: number;
  expected_return_rate?: number;
  inflation_rate?: number;
  post_retirement_monthly_expense: number;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const userApi = {
  create: (data: Omit<UserProfile, "user_id">) =>
    api.post<{ user_id: string }>("/users", data).then((r) => r.data),
  get: (userId: string) =>
    api.get<UserProfile>(`/users/${userId}`).then((r) => r.data),
  update: (userId: string, data: Omit<UserProfile, "user_id">) =>
    api.put(`/users/${userId}`, data).then((r) => r.data),
};

export const mfXrayApi = {
  uploadPdf: (userId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post<AgentResponse>(`/agents/mf-xray/upload?user_id=${userId}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};

export const taxApi = {
  uploadPdf: (userId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post<AgentResponse>(`/agents/tax/upload?user_id=${userId}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
  manual: (data: TaxProfile) =>
    api.post<AgentResponse>("/agents/tax/manual", data).then((r) => r.data),
};

export const healthScoreApi = {
  compute: (data: HealthScoreInput) =>
    api.post<AgentResponse>("/agents/health-score", data).then((r) => r.data),
  history: (userId: string) =>
    api.get(`/agents/health-score/${userId}/history`).then((r) => r.data),
};

export const fireApi = {
  plan: (data: FIREInput) =>
    api.post<AgentResponse>("/agents/fire", data).then((r) => r.data),
};

export const lifeEventApi = {
  advise: (data: {
    user_id: string;
    event_type: string;
    event_amount?: number;
    additional_context?: string;
  }) => api.post<AgentResponse>("/agents/life-event", data).then((r) => r.data),
};

export const couplesApi = {
  link: (partnerAId: string, partnerBId: string) =>
    api
      .post(`/agents/couples/link?partner_a_id=${partnerAId}&partner_b_id=${partnerBId}`)
      .then((r) => r.data),
  plan: (coupleId: string, partnerAId: string, partnerBId: string) =>
    api
      .post<AgentResponse>("/agents/couples", {
        couple_id: coupleId,
        partner_a_id: partnerAId,
        partner_b_id: partnerBId,
        both_ready: true,
      })
      .then((r) => r.data),
};

export default api;
