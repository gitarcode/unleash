import { useMemo } from 'react';
import { formatApiPath } from 'utils/formatPath';
import handleErrorResponses from '../httpErrorResponseHandler';
import { useConditionalSWR } from '../useConditionalSWR/useConditionalSWR';
import useUiConfig from '../useUiConfig/useUiConfig';
import { ISignalEndpoint } from 'interfaces/signal';

const ENDPOINT = 'api/admin/signal-endpoints';

const DEFAULT_DATA = {
    signalEndpoints: [],
};

export const useSignalEndpoints = () => {
    const { isEnterprise } = useUiConfig();

    const { data, error, mutate } = useConditionalSWR<{
        signalEndpoints: ISignalEndpoint[];
    }>(
        isEnterprise(),
        DEFAULT_DATA,
        formatApiPath(ENDPOINT),
        fetcher,
    );

    return useMemo(
        () => ({
            signalEndpoints: data?.signalEndpoints ?? [],
            loading: !error && !data,
            refetch: () => mutate(),
            error,
        }),
        [data, error, mutate],
    );
};

const fetcher = (path: string) => {
    return fetch(path)
        .then(handleErrorResponses('Signal endpoints'))
        .then((res) => res.json());
};
