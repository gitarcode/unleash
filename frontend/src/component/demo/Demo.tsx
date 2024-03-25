import { useEffect, useState } from 'react';
import { createLocalStorage } from 'utils/createLocalStorage';
import { TOPICS } from './demo-topics';
import useUiConfig from 'hooks/api/getters/useUiConfig/useUiConfig';
import { usePlausibleTracker } from 'hooks/usePlausibleTracker';
import { useMediaQuery } from '@mui/material';
import theme from 'themes/theme';

const defaultProgress = {
    welcomeOpen: true,
    expanded: true,
    topic: -1,
    step: 0,
    stepsCompletion: Array(TOPICS.length).fill(0),
};

interface IDemoProps {
    children: JSX.Element;
}

export const Demo = ({ children }: IDemoProps): JSX.Element => {
    const { uiConfig } = useUiConfig();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down(768));
    const { trackEvent } = usePlausibleTracker();

    const { value: storedProgress, setValue: setStoredProgress } =
        createLocalStorage('Tutorial:v1.1', defaultProgress);

    const [welcomeOpen, setWelcomeOpen] = useState(
        storedProgress.welcomeOpen ?? defaultProgress.welcomeOpen,
    );
    const [finishOpen, setFinishOpen] = useState(false);
    const [plansOpen, setPlansOpen] = useState(false);

    const [expanded, setExpanded] = useState(
        storedProgress.expanded ?? defaultProgress.expanded,
    );
    const [topic, setTopic] = useState(
        storedProgress.topic ?? defaultProgress.topic,
    );
    const [step, setStep] = useState(
        storedProgress.step ?? defaultProgress.step,
    );
    const [stepsCompletion, setStepsCompletion] = useState(
        storedProgress.stepsCompletion ?? defaultProgress.stepsCompletion,
    );

    useEffect(() => {
        setStoredProgress({
            welcomeOpen,
            expanded,
            topic,
            step,
            stepsCompletion,
        });
    }, [welcomeOpen, expanded, topic, step, stepsCompletion]);

    const onStart = () => {
        setTopic(0);
        setStep(0);
        setStepsCompletion(Array(TOPICS.length).fill(0));
        setExpanded(true);
    };

    const onFinish = () => {
        setFinishOpen(true);

        trackEvent('demo-finish');
    };

    const closeGuide = () => {
        setTopic(-1);
        setStep(0);
    };

    return children;
};
