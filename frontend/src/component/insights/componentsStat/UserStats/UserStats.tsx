import type { FC } from 'react';
import ChevronRight from '@mui/icons-material/ChevronRight';
import { Box, Typography, styled } from '@mui/material';
import { ConditionallyRender } from 'component/common/ConditionallyRender/ConditionallyRender';
import { Link } from 'react-router-dom';

const StyledUserContainer = styled(Box)(() => ({
    position: 'relative',
}));

const StyledUserBox = styled(Box)(({ theme }) => ({
    borderRadius: `${theme.shape.borderRadiusExtraLarge}px`,
    backgroundColor: theme.palette.background.alternative,
    maxWidth: 300,
    padding: theme.spacing(2),
    margin: `0 auto ${theme.spacing(3)}`,
    position: 'relative',
    zIndex: 2,
}));

const StyledCustomShadow = styled(Box)(({ theme }) => ({
    maxWidth: 270,
    height: '54px',
    backgroundColor: 'rgba(108, 101, 229, 0.30)',
    position: 'absolute',
    margin: '0 auto',
    top: '45px',
    left: '15px',
    right: '15px',
    borderRadius: `${theme.shape.borderRadiusExtraLarge}px`,
    zIndex: 1,
}));

const StyledUserCount = styled(Typography)(({ theme }) => ({
    color: theme.palette.primary.contrastText,
    fontWeight: 'bold',
    fontSize: theme.fontSizes.extraLargeHeader,
    margin: 0,
    padding: 0,
}));

const StyledLinkContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: theme.spacing(3),
}));

const StyledLink = styled(Link)({
    fontWeight: 'bold',
    textDecoration: 'none',
    display: 'flex',
    justifyContent: 'center',
});

interface IUserStatsProps {
    count: number;
    active?: number;
    inactive?: number;
    isLoading?: boolean;
}

const StyledLoadingSkeleton = styled(Box)(() => ({
    '&:before': {
        background: 'transparent',
    },
}));

export const UserStats: FC<IUserStatsProps> = ({ count, isLoading }) => {
    return (
        <>
            <StyledUserContainer>
                <StyledUserBox>
                    <StyledUserCount variant='h2'>
                        <ConditionallyRender
                            condition={isLoading !== true}
                            show={
                                Number.parseInt(`${count}`, 10) === count
                                    ? count
                                    : count.toFixed(2)
                            }
                            elseShow={
                                <StyledLoadingSkeleton className='skeleton'>
                                    &nbsp;
                                </StyledLoadingSkeleton>
                            }
                        />
                    </StyledUserCount>
                </StyledUserBox>
                <StyledCustomShadow />
            </StyledUserContainer>

            <StyledLinkContainer>
                <StyledLink to='/admin/users'>
                    View users <ChevronRight />
                </StyledLink>
            </StyledLinkContainer>
        </>
    );
};
