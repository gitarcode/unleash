import { useEffect, useState } from 'react';
import { useEnvironments } from 'hooks/api/getters/useEnvironments/useEnvironments';
import type { IApiTokenCreate } from 'hooks/api/actions/useApiTokensApi/useApiTokensApi';
import { TokenType } from 'interfaces/token';
import {
    ADMIN,
    CREATE_CLIENT_API_TOKEN,
    CREATE_PROJECT_API_TOKEN,
} from '@server/types/permissions';
import { useHasRootAccess } from 'hooks/useHasAccess';
import type { SelectOption } from './TokenTypeSelector/TokenTypeSelector';
import { useUiFlag } from '../../../../hooks/useUiFlag';

export type ApiTokenFormErrorType = 'username' | 'projects';
export const useApiTokenForm = (project?: string) => {
    const { environments } = useEnvironments();
    const adminTokenKillSwitch = useUiFlag('adminTokenKillSwitch');
    const initialEnvironment = environments?.find((e) => e.enabled)?.name;

    const hasCreateTokenPermission = useHasRootAccess(CREATE_CLIENT_API_TOKEN);
    const hasCreateProjectTokenPermission = useHasRootAccess(
        CREATE_PROJECT_API_TOKEN,
        project,
    );

    const apiTokenTypes: SelectOption[] = [
        {
            key: TokenType.CLIENT,
            label: `Server-side SDK (${TokenType.CLIENT})`,
            title: 'Connect server-side SDK or Unleash Proxy/Edge',
            enabled:
                hasCreateTokenPermission || hasCreateProjectTokenPermission,
        },
    ];

    const hasAdminAccess = useHasRootAccess(ADMIN);
    if (!project && !adminTokenKillSwitch) {
        apiTokenTypes.push({
            key: TokenType.ADMIN,
            label: TokenType.ADMIN,
            title: 'Full access for managing Unleash',
            enabled: hasAdminAccess,
        });
    }

    const firstAccessibleType = apiTokenTypes.find((t) => t.enabled)?.key;

    const [username, setUsername] = useState('');
    const [type, setType] = useState(firstAccessibleType || TokenType.CLIENT);
    const [projects, setProjects] = useState<string[]>([
        project ? project : '*',
    ]);
    const [memorizedProjects, setMemorizedProjects] =
        useState<string[]>(projects);
    const [environment, setEnvironment] = useState<string>();
    const [errors, setErrors] = useState<
        Partial<Record<ApiTokenFormErrorType, string>>
    >({});

    useEffect(() => {
        setEnvironment(type === 'ADMIN' ? '*' : initialEnvironment);
    }, [type, initialEnvironment]);

    const setTokenType = (value: TokenType) => {
        if (value === 'ADMIN') {
            setType(TokenType.ADMIN);
            setMemorizedProjects(projects);
            setProjects(['*']);
            setEnvironment('*');
        } else {
            setType(value);
            setProjects(memorizedProjects);
            setEnvironment(initialEnvironment);
        }
    };

    const getApiTokenPayload = (): IApiTokenCreate => ({
        username,
        type,
        environment,
        projects,
    });

    const isValid = () => {
        const newErrors: Partial<Record<ApiTokenFormErrorType, string>> = {};
        if (!username) {
            newErrors.username = 'Username is required';
        }
        if (projects.length === 0) {
            newErrors.projects = 'At least one project is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const clearErrors = (error?: ApiTokenFormErrorType) => {
        if (error) {
            const newErrors = { ...errors };
            delete newErrors[error];
            setErrors(newErrors);
        } else {
            setErrors({});
        }
    };

    return {
        username,
        type,
        apiTokenTypes,
        projects,
        environment,
        setUsername,
        setTokenType,
        setProjects,
        setEnvironment,
        getApiTokenPayload,
        isValid,
        clearErrors,
        errors,
    };
};
