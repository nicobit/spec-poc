import React, { useEffect, useState } from 'react';
import { authFetch, apiUrl, getJson } from '@/shared/api/client';
import { useMsal } from '@azure/msal-react';

interface Props {
  envId: string;
  selectedStageIds: string[];
  onToggle: (stageId: string) => void;
}

export default function EnvStageSelector({ envId, selectedStageIds, onToggle }: Props) {
  const { instance } = useMsal();
  const [stages, setStages] = useState<Array<{ id: string; name?: string }>>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await authFetch(instance, apiUrl(`/environments/${encodeURIComponent(envId)}`));
        const data = await getJson<any>(res);
        const s = (data.stages || []).map((st: any) => ({ id: st.id, name: st.name }));
        if (active) setStages(s);
      } catch {
        if (active) setStages([]);
      }
    })();
    return () => { active = false; };
  }, [envId, instance]);

  return (
    <div>
      {stages.length === 0 ? <div className="text-sm ui-text-muted">No stages</div> : (
        stages.map((st) => (
          <label key={st.id} className="flex items-center space-x-2">
            <input type="checkbox" checked={selectedStageIds.includes(st.id)} onChange={() => onToggle(st.id)} />
            <span className="text-sm">{st.name || st.id}</span>
          </label>
        ))
      )}
    </div>
  );
}
