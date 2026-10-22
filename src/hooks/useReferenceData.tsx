import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api';
import type { APIKeyMapping, Customer, ModelRegistry, Project, Scenario, Service, User } from '../domain/types';
import { errorMessage } from './useAsync';

export interface ReferenceData {
  customers: Customer[];
  services: Service[];
  projects: Project[];
  users: User[];
  keys: APIKeyMapping[];
  models: ModelRegistry[];
  scenarios: Scenario[];
  customerById: Map<string, Customer>;
  serviceById: Map<string, Service>;
  projectById: Map<string, Project>;
  userById: Map<string, User>;
  keyById: Map<string, APIKeyMapping>;
  modelById: Map<string, ModelRegistry>;
  scenarioById: Map<string, Scenario>;
  loading: boolean;
  error: string | null;
  /** 모델 등록·상태 변경 후 호출 */
  refreshModels: () => Promise<void>;
  reload: () => void;
}

const Ctx = createContext<ReferenceData | null>(null);

export function ReferenceDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Pick<ReferenceData, 'customers' | 'services' | 'projects' | 'users' | 'keys' | 'models' | 'scenarios'>>({
    customers: [],
    services: [],
    projects: [],
    users: [],
    keys: [],
    models: [],
    scenarios: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([api.listCustomers(), api.listServices(), api.listProjects(), api.listUsers(), api.listKeys(), api.listModels(), api.listScenarios()])
      .then(([customers, services, projects, users, keys, models, scenarios]) => {
        if (!alive) return;
        setState({ customers, services, projects, users, keys, models, scenarios });
        setError(null);
      })
      .catch((e: unknown) => alive && setError(errorMessage(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tick]);

  const refreshModels = useCallback(async () => {
    const models = await api.listModels();
    setState((s) => ({ ...s, models }));
  }, []);

  const value = useMemo<ReferenceData>(
    () => ({
      ...state,
      customerById: new Map(state.customers.map((c) => [c.customer_id, c])),
      serviceById: new Map(state.services.map((s) => [s.service_id, s])),
      projectById: new Map(state.projects.map((p) => [p.project_id, p])),
      userById: new Map(state.users.map((u) => [u.user_id, u])),
      keyById: new Map(state.keys.map((k) => [k.key_id, k])),
      modelById: new Map(state.models.map((m) => [m.model_id, m])),
      scenarioById: new Map(state.scenarios.map((s) => [s.scenario_id, s])),
      loading,
      error,
      refreshModels,
      reload: () => setTick((t) => t + 1),
    }),
    [state, loading, error, refreshModels],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReferenceData(): ReferenceData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useReferenceData must be used within ReferenceDataProvider');
  return v;
}

/** 표시용 이름 헬퍼 */
export function useNames() {
  const ref = useReferenceData();
  return useMemo(
    () => ({
      customer: (id: string | null | undefined) => (id ? ref.customerById.get(id)?.name ?? id : '미분류'),
      service: (id: string | null | undefined) => (id ? ref.serviceById.get(id)?.name ?? id : '-'),
      project: (id: string | null | undefined) => (id ? ref.projectById.get(id)?.name ?? id : '미분류'),
      user: (id: string | null | undefined) => (id ? ref.userById.get(id)?.name ?? id : '미분류'),
      model: (id: string | null | undefined) => (id ? ref.modelById.get(id)?.display_name ?? id : '-'),
      scenario: (id: string | null | undefined) => (id ? ref.scenarioById.get(id)?.name ?? id : 'Custom Prompt'),
      key: (id: string | null | undefined) => (id ? ref.keyById.get(id)?.display_name ?? id : '-'),
    }),
    [ref],
  );
}
