import type React from 'react';
import type { FC } from 'react';
import { Box, styled } from '@mui/material';
import { type IProjectOwnersProps } from '../LegacyProjectOwners/LegacyProjectOwners';
import { ProjectOwners } from './ProjectOwners/ProjectOwners';
import { ConditionallyRender } from 'component/common/ConditionallyRender/ConditionallyRender';
import { ProjectMembers } from './ProjectMembers/ProjectMembers';
import { DEFAULT_PROJECT_ID } from 'hooks/api/getters/useDefaultProject/useDefaultProjectId';

interface IProjectCardFooterProps {
    id?: string;
    isFavorite?: boolean;
    children?: React.ReactNode;
    disabled?: boolean;
    owners: IProjectOwnersProps['owners'];
    memberCount?: number;
}

const StyledFooter = styled(Box)<{ disabled: boolean }>(
    ({ theme, disabled }) => ({
        display: 'flex',
        background: disabled
            ? theme.palette.background.paper
            : theme.palette.envAccordion.expanded,
        boxShadow: theme.boxShadows.accordionFooter,
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: `1px solid ${theme.palette.divider}`,
    }),
);

export const ProjectCardFooter: FC<IProjectCardFooterProps> = ({
    id,
    children,
    owners,
    disabled = false,
    memberCount,
}) => {
    return (
        <StyledFooter disabled={disabled}>
            <ProjectOwners owners={owners} />
            <ConditionallyRender
                condition={id !== DEFAULT_PROJECT_ID}
                show={<ProjectMembers count={memberCount} members={[]} />}
                elseShow={children}
            />
        </StyledFooter>
    );
};
