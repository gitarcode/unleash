import { useMemo } from 'react';
import { formatApiPath } from 'utils/formatPath';
import handleErrorResponses from '../httpErrorResponseHandler';
import { useConditionalSWR } from '../useConditionalSWR/useConditionalSWR';
import type { IActionSet } from 'interfaces/action';

const DEFAULT_DATA = {
    actions: [],
};

export const useActions = (project: string) => {
    const { data, error, mutate } = useConditionalSWR<{
        actions: IActionSet[];
    }>(
        false,
        DEFAULT_DATA,
        formatApiPath(`api/admin/projects/${project}/actions`),
        fetcher,
    );

    return useMemo(
        () => ({
            actions: data?.actions ?? [],
            loading: !error && !data,
            refetch: () => mutate(),
            error,
        }),
        [data, error, mutate],
    );
};

const fetcher = (path: string) => {
    return fetch(path)
        .then(handleErrorResponses('Actions'))
        .then((res) => res.json());
};
