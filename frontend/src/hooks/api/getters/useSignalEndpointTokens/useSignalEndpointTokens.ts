import { useMemo } from 'react';
import { formatApiPath } from 'utils/formatPath';
import handleErrorResponses from '../httpErrorResponseHandler';
import { useConditionalSWR } from '../useConditionalSWR/useConditionalSWR';
import useUiConfig from '../useUiConfig/useUiConfig';
import type { ISignalEndpointToken } from 'interfaces/signal';

const ENDPOINT = 'api/admin/signal-endpoints';

const DEFAULT_DATA = {
    signalEndpointTokens: [],
};

export const useSignalEndpointTokens = (signalEndpointId: number) => {
    const { isEnterprise } = useUiConfig();

    const { data, error, mutate } = useConditionalSWR<{
        signalEndpointTokens: ISignalEndpointToken[];
    }>(
        false,
        DEFAULT_DATA,
        formatApiPath(`${ENDPOINT}/${signalEndpointId}/tokens`),
        fetcher,
    );

    return useMemo(
        () => ({
            signalEndpointTokens: data?.signalEndpointTokens ?? [],
            loading: !error && !data,
            refetch: () => mutate(),
            error,
        }),
        [data, error, mutate],
    );
};

const fetcher = (path: string) => {
    return fetch(path)
        .then(handleErrorResponses('Signal endpoint tokens'))
        .then((res) => res.json());
};
