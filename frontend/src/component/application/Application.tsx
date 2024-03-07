/* eslint react/no-multi-comp:off */
import React, { useContext, useState } from 'react';
import {
    Box,
    IconButton,
    LinearProgress,
    Link,
    Tab,
    Tabs,
    Typography,
    styled,
} from '@mui/material';
import { Delete, Link as LinkIcon } from '@mui/icons-material';
import { ConditionallyRender } from 'component/common/ConditionallyRender/ConditionallyRender';
import { UPDATE_APPLICATION } from 'component/providers/AccessProvider/permissions';
import { ConnectedInstances } from './ConnectedInstances/ConnectedInstances';
import { Dialogue } from 'component/common/Dialogue/Dialogue';
import { PageContent } from 'component/common/PageContent/PageContent';
import { PageHeader } from 'component/common/PageHeader/PageHeader';
import AccessContext from 'contexts/AccessContext';
import useApplicationsApi from 'hooks/api/actions/useApplicationsApi/useApplicationsApi';
import useApplication from 'hooks/api/getters/useApplication/useApplication';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useLocationSettings } from 'hooks/useLocationSettings';
import useToast from 'hooks/useToast';
import { formatDateYMD } from 'utils/formatDate';
import { formatUnknownError } from 'utils/formatUnknownError';
import { useRequiredPathParam } from 'hooks/useRequiredPathParam';
import { useUiFlag } from 'hooks/useUiFlag';
import { ApplicationEdit } from './ApplicationEdit/ApplicationEdit';
import ApplicationOverview from './ApplicationOverview';
import PermissionIconButton from 'component/common/PermissionIconButton/PermissionIconButton';

type Tab = {
    title: string;
    path: string;
    name: string;
};

const StyledHeader = styled('div')(({ theme }) => ({
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadiusLarge,
    marginBottom: theme.spacing(3),
}));

const TabContainer = styled('div')(({ theme }) => ({
    padding: theme.spacing(0, 4),
}));

const Separator = styled('div')(({ theme }) => ({
    width: '100%',
    backgroundColor: theme.palette.divider,
    height: '1px',
}));

const StyledTab = styled(Tab)(({ theme }) => ({
    textTransform: 'none',
    fontSize: theme.fontSizes.bodySize,
    flexGrow: 1,
    flexBasis: 0,
    [theme.breakpoints.down('md')]: {
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
    },
    [theme.breakpoints.up('md')]: {
        minWidth: 160,
    },
}));

export const Application = () => {
    const navigate = useNavigate();
    const name = useRequiredPathParam('name');
    const { application, loading } = useApplication(name);
    const { appName, url, description, icon = 'apps', createdAt } = application;
    const { hasAccess } = useContext(AccessContext);
    const { deleteApplication } = useApplicationsApi();
    const { locationSettings } = useLocationSettings();
    const { setToastData, setToastApiError } = useToast();
    const { pathname } = useLocation();

    const basePath = `/applications/${name}`;

    const [showDialog, setShowDialog] = useState(false);

    const toggleModal = () => {
        setShowDialog(!showDialog);
    };

    return <ApplicationEdit />;
};
